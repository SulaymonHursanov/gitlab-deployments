import os
import requests
from datetime import datetime


class GitLabClient:
    def __init__(self):
        self.gitlab_url = os.environ.get("GITLAB_URL", "").rstrip("/")
        self.token = os.environ.get("GITLAB_TOKEN", "")
        self.group = os.environ.get("GITLAB_GROUP", "cloud")
        self.session = requests.Session()
        self.session.headers.update({"PRIVATE-TOKEN": self.token})

    def _check_config(self):
        if not self.token:
            raise ValueError("GITLAB_TOKEN environment variable is not set")
        if not self.gitlab_url:
            raise ValueError("GITLAB_URL environment variable is not set")

    def _paginate(self, url, params=None):
        params = dict(params or {})
        params["per_page"] = 100
        page = 1
        while True:
            params["page"] = page
            resp = self.session.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            if not data:
                break
            yield from data
            if len(data) < params["per_page"]:
                break
            page += 1

    def get_group_id(self):
        url = f"{self.gitlab_url}/api/v4/groups/{requests.utils.quote(self.group, safe='')}"
        resp = self.session.get(url)
        resp.raise_for_status()
        return resp.json()["id"]

    def get_all_projects(self, group_id):
        url = f"{self.gitlab_url}/api/v4/groups/{group_id}/projects"
        return list(self._paginate(url, {"include_subgroups": "true", "archived": "false"}))

    def _get_env_detail(self, project_id, env_id):
        url = f"{self.gitlab_url}/api/v4/projects/{project_id}/environments/{env_id}"
        resp = self.session.get(url)
        if resp.status_code != 200:
            return None
        return resp.json()

    def _get_envs_for_project(self, project_id):
        url = f"{self.gitlab_url}/api/v4/projects/{project_id}/environments"
        return list(self._paginate(url, {"states": "available"}))

    @staticmethod
    def _row_from_env(project_name, env):
        deployment = env.get("last_deployment")
        if not deployment:
            return None
        deployable = deployment.get("deployable") or {}
        commit = deployable.get("commit") or {}
        user = deployment.get("user") or {}
        iso = deployment.get("created_at", "")
        deployed_at = ""
        if iso:
            try:
                dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
                deployed_at = dt.strftime("%Y-%m-%d %H:%M:%S UTC")
            except Exception:
                deployed_at = iso
        return {
            "project": project_name,
            "project_id": env.get("_project_id"),
            "environment": env["name"],
            "branch": deployment.get("ref", ""),
            "deployed_by": user.get("name") or user.get("username", ""),
            "deployed_at": deployed_at,
            "commit_sha": commit.get("short_id", deployment.get("sha", "")[:8]),
        }

    def fetch_all_deployments_streaming(self):
        """
        Generator yielding (current, total, rows_list).
        rows_list is a list of row dicts for the processed project (may be empty).
        """
        self._check_config()
        group_id = self.get_group_id()
        projects = self.get_all_projects(group_id)
        total = len(projects)

        for i, project in enumerate(projects):
            project_id = project["id"]
            project_name = project["path_with_namespace"]
            rows = []
            try:
                envs = self._get_envs_for_project(project_id)
                for env_stub in envs:
                    env = self._get_env_detail(project_id, env_stub["id"])
                    if not env:
                        continue
                    env["_project_id"] = project_id
                    row = self._row_from_env(project_name, env)
                    if row:
                        rows.append(row)
            except requests.HTTPError:
                pass
            yield (i + 1, total, rows)

    def fetch_env_deployments_streaming(self, env_name, projects):
        """
        Generator yielding (current, total, row_or_None).
        projects: list of dicts with keys project_id, project.
        """
        self._check_config()
        total = len(projects)

        for i, p in enumerate(projects):
            project_id = p["project_id"]
            project_name = p["project"]
            row = None
            try:
                url = f"{self.gitlab_url}/api/v4/projects/{project_id}/environments"
                resp = self.session.get(url, params={"name": env_name, "states": "available"})
                if resp.status_code == 200:
                    env_list = resp.json()
                    if env_list:
                        env = self._get_env_detail(project_id, env_list[0]["id"])
                        if env:
                            env["_project_id"] = project_id
                            row = self._row_from_env(project_name, env)
            except requests.HTTPError:
                pass
            yield (i + 1, total, row)
