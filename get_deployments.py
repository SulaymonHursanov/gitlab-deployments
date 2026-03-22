#!/usr/bin/env python3
"""
Вытаскивает все задеплоенные ветки из environments для всех проектов
в группе cloud и её подгруппах.
"""

import os
import sys
import csv
import requests
from datetime import datetime

GITLAB_URL = os.environ.get("GITLAB_URL", "https://gitlab.example.com")
GITLAB_TOKEN = os.environ.get("GITLAB_TOKEN", "")
GROUP_NAME = os.environ.get("GITLAB_GROUP", "core")
OUTPUT_FILE = "deployments.csv"

if not GITLAB_TOKEN:
    print("Ошибка: задайте переменную окружения GITLAB_TOKEN", file=sys.stderr)
    sys.exit(1)

session = requests.Session()
session.headers.update({"PRIVATE-TOKEN": GITLAB_TOKEN})


def paginate(url, params=None):
    """Итерирует по всем страницам GitLab API."""
    params = params or {}
    params["per_page"] = 100
    page = 1
    while True:
        params["page"] = page
        resp = session.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            break
        yield from data
        if len(data) < params["per_page"]:
            break
        page += 1


def get_group_id(group_path):
    """Возвращает ID группы по её пути/имени."""
    url = f"{GITLAB_URL}/api/v4/groups/{requests.utils.quote(group_path, safe='')}"
    resp = session.get(url)
    resp.raise_for_status()
    return resp.json()["id"]


def get_all_projects(group_id):
    """Рекурсивно получает все проекты группы и подгрупп."""
    url = f"{GITLAB_URL}/api/v4/groups/{group_id}/projects"
    projects = list(paginate(url, {"include_subgroups": "true", "archived": "false"}))
    return projects


def get_environments_with_deployments(project_id):
    """
    Возвращает environments вместе с last_deployment через
    GET /projects/:id/environments/:env_id — каждый environment
    содержит актуальный last_deployment именно для этого environment.
    """
    url = f"{GITLAB_URL}/api/v4/projects/{project_id}/environments"
    envs = list(paginate(url, {"states": "available"}))
    result = []
    for env in envs:
        env_id = env["id"]
        detail_url = f"{GITLAB_URL}/api/v4/projects/{project_id}/environments/{env_id}"
        resp = session.get(detail_url)
        if resp.status_code != 200:
            continue
        result.append(resp.json())
    return result


def format_dt(iso_str):
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception:
        return iso_str


def main():
    print(f"Подключаемся к {GITLAB_URL}, группа: {GROUP_NAME}")

    group_id = get_group_id(GROUP_NAME)
    print(f"ID группы '{GROUP_NAME}': {group_id}")

    projects = get_all_projects(group_id)
    print(f"Найдено проектов: {len(projects)}")

    rows = []

    for project in projects:
        project_id = project["id"]
        project_name = project["path_with_namespace"]
        print(f"  Проект: {project_name}")

        try:
            environments = get_environments_with_deployments(project_id)
        except requests.HTTPError as e:
            print(f"    Не удалось получить environments: {e}")
            continue

        for env in environments:
            env_name = env["name"]

            deployment = env.get("last_deployment")
            if not deployment:
                continue

            deployable = deployment.get("deployable") or {}
            commit = deployable.get("commit") or {}
            user = deployment.get("user") or {}

            ref = deployment.get("ref", "")
            deployed_at = format_dt(deployment.get("created_at", ""))
            deployer = user.get("name") or user.get("username", "")
            sha = commit.get("short_id", deployment.get("sha", "")[:8])

            rows.append({
                "project": project_name,
                "environment": env_name,
                "branch": ref,
                "deployed_by": deployer,
                "deployed_at": deployed_at,
                "commit_sha": sha,
            })

            print(f"    [{env_name}] branch={ref} by={deployer} at={deployed_at}")

    # Вывод в CSV
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["project", "environment", "branch", "deployed_by", "deployed_at", "commit_sha"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nГотово! {len(rows)} записей сохранено в {OUTPUT_FILE}")

    # Вывод таблицей в консоль
    if rows:
        print()
        col_widths = {k: len(k) for k in ["project", "environment", "branch", "deployed_by", "deployed_at"]}
        for row in rows:
            for k in col_widths:
                col_widths[k] = max(col_widths[k], len(str(row.get(k, ""))))

        header = " | ".join(k.ljust(col_widths[k]) for k in col_widths)
        separator = "-+-".join("-" * col_widths[k] for k in col_widths)
        print(header)
        print(separator)
        for row in rows:
            print(" | ".join(str(row.get(k, "")).ljust(col_widths[k]) for k in col_widths))


if __name__ == "__main__":
    main()
