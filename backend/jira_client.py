import os
import requests
from requests.auth import HTTPBasicAuth


class JiraClient:
    def __init__(self):
        self.url = os.environ.get("JIRA_URL", "").rstrip("/")
        self.email = os.environ.get("JIRA_EMAIL", "")
        self.token = os.environ.get("JIRA_TOKEN", "")
        self.projects = [
            p.strip()
            for p in os.environ.get("JIRA_PROJECTS", "").split(",")
            if p.strip()
        ]

    def _check_config(self):
        if not self.url:
            raise ValueError("JIRA_URL is not set")
        if not self.email or not self.token:
            raise ValueError("JIRA_EMAIL or JIRA_TOKEN is not set")
        if not self.projects:
            raise ValueError("JIRA_PROJECTS is not set (comma-separated project keys)")

    def fetch_fix_versions(self):
        self._check_config()
        auth = HTTPBasicAuth(self.email, self.token)
        versions = []
        seen = set()

        for project_key in self.projects:
            url = f"{self.url}/rest/api/2/project/{project_key}/versions"
            resp = requests.get(url, auth=auth, timeout=10)
            resp.raise_for_status()

            for v in resp.json():
                if v.get("archived"):
                    continue
                vid = v["id"]
                if vid in seen:
                    continue
                seen.add(vid)
                versions.append({
                    "id": vid,
                    "name": v["name"],
                    "project": project_key,
                    "released": v.get("released", False),
                    "releaseDate": v.get("releaseDate"),
                    "description": v.get("description", ""),
                })

        # unreleased first, then released; within each group sort by name
        versions.sort(key=lambda v: (v["released"], v["name"]))
        return versions
