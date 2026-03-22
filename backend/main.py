import json
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

load_dotenv()

from gitlab_client import GitLabClient  # noqa: E402

app = FastAPI(title="GitLab Deployments Viewer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path(__file__).parent / "data" / "deployments.json"

PRIORITY_ENVS = [
    "production", "staging", "test"
]

# ---------------------------------------------------------------------------
# Shared refresh state (survives page reloads, reset on server restart)
# ---------------------------------------------------------------------------
_lock = threading.Lock()
_state = {
    "status": "idle",       # "idle" | "running"
    "refresh_type": None,   # "all" | "env"
    "env": None,
    "current": 0,
    "total": 0,
    "last_result": None,    # set on completion
    "last_error": None,     # set on error
}


def _get():
    with _lock:
        return dict(_state)


def _set(**kw):
    with _lock:
        _state.update(kw)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _sort_envs(env_set):
    ordered = [e for e in PRIORITY_ENVS if e in env_set]
    rest = sorted(env_set - set(ordered))
    return ordered + rest


def _read_file():
    if not DATA_FILE.exists():
        return None
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def _write_file(deployments):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "deployments": deployments,
    }
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return payload


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


# ---------------------------------------------------------------------------
# Background jobs
# ---------------------------------------------------------------------------
def _job_refresh_all():
    client = GitLabClient()
    all_rows = []
    try:
        for current, total, rows in client.fetch_all_deployments_streaming():
            all_rows.extend(rows)
            _set(current=current, total=total)
    except Exception as e:
        _set(status="idle", last_error=str(e))
        return

    payload = _write_file(all_rows)
    env_set = {d["environment"] for d in all_rows}
    _set(
        status="idle",
        last_result={
            "refresh_type": "all",
            "environments": _sort_envs(env_set),
            "updated_at": payload["updated_at"],
        },
    )


def _job_refresh_env(environment: str):
    data = _read_file()
    if not data:
        _set(status="idle", last_error="No data file yet. Run a full refresh first.")
        return

    projects = [
        {"project_id": d["project_id"], "project": d["project"]}
        for d in data["deployments"]
        if d["environment"] == environment
    ]
    if not projects:
        _set(status="idle", last_error=f"No projects found for environment '{environment}'")
        return

    client = GitLabClient()
    updated_rows = []
    try:
        for current, total, row in client.fetch_env_deployments_streaming(environment, projects):
            if row:
                updated_rows.append(row)
            _set(current=current, total=total)
    except Exception as e:
        _set(status="idle", last_error=str(e))
        return

    other_rows = [d for d in data["deployments"] if d["environment"] != environment]
    payload = _write_file(other_rows + updated_rows)
    updated_rows.sort(key=lambda d: d["project"])
    _set(
        status="idle",
        last_result={
            "refresh_type": "env",
            "environment": environment,
            "count": len(updated_rows),
            "deployments": updated_rows,
            "updated_at": payload["updated_at"],
        },
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/environments")
def list_environments():
    data = _read_file()
    if data is None:
        return {"environments": [], "updated_at": None}
    env_set = {d["environment"] for d in data["deployments"]}
    return {"environments": _sort_envs(env_set), "updated_at": data.get("updated_at")}


@app.get("/api/deployments")
def get_deployments(environment: str = Query(...)):
    data = _read_file()
    if data is None:
        return {"environment": environment, "count": 0, "deployments": [], "updated_at": None}
    filtered = sorted(
        [d for d in data["deployments"] if d["environment"] == environment],
        key=lambda d: d["project"],
    )
    return {
        "environment": environment,
        "count": len(filtered),
        "deployments": filtered,
        "updated_at": data.get("updated_at"),
    }


@app.get("/api/refresh-status")
def refresh_status():
    """Returns the current refresh state (used on page load to restore progress)."""
    s = _get()
    return {
        "status": s["status"],
        "refresh_type": s["refresh_type"],
        "env": s["env"],
        "current": s["current"],
        "total": s["total"],
    }


@app.get("/api/refresh-stream")
def refresh_stream_endpoint():
    """
    SSE stream that polls in-memory state.
    Immediately sends current progress if a job is running,
    then sends 'done' or 'error' when the job finishes,
    or 'idle' if nothing is running.
    """
    def generate():
        was_running = False
        while True:
            s = _get()
            if s["status"] == "running":
                was_running = True
                yield _sse({
                    "type": "progress",
                    "refresh_type": s["refresh_type"],
                    "env": s["env"],
                    "current": s["current"],
                    "total": s["total"],
                })
                time.sleep(0.3)
            else:
                if was_running:
                    if s.get("last_error"):
                        yield _sse({"type": "error", "detail": s["last_error"]})
                        _set(last_error=None)
                    else:
                        result = s.get("last_result") or {}
                        yield _sse({"type": "done", **result})
                        _set(last_result=None)
                else:
                    yield _sse({"type": "idle"})
                break

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/refresh")
def refresh_all():
    s = _get()
    if s["status"] == "running":
        raise HTTPException(status_code=409, detail="A refresh is already in progress")
    _set(status="running", refresh_type="all", env=None,
         current=0, total=0, last_result=None, last_error=None)
    threading.Thread(target=_job_refresh_all, daemon=True).start()
    return {"status": "started"}


@app.post("/api/refresh-env")
def refresh_env(environment: str = Query(...)):
    s = _get()
    if s["status"] == "running":
        raise HTTPException(status_code=409, detail="A refresh is already in progress")
    _set(status="running", refresh_type="env", env=environment,
         current=0, total=0, last_result=None, last_error=None)
    threading.Thread(target=_job_refresh_env, args=(environment,), daemon=True).start()
    return {"status": "started"}
