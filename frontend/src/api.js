async function request(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function postJSON(path) {
  const res = await fetch(path, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
  return body;
}

async function* sseStream(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop();
    for (const chunk of chunks) {
      if (chunk.startsWith("data: ")) {
        yield JSON.parse(chunk.slice(6));
      }
    }
  }
}

export const fetchEnvironments  = ()    => request("/api/environments");
export const fetchDeployments   = (env) => request(`/api/deployments?environment=${encodeURIComponent(env)}`);
export const fetchRefreshStatus = ()    => request("/api/refresh-status");
export const refreshStream      = ()    => sseStream("/api/refresh-stream");
export const startRefreshAll    = ()    => postJSON("/api/refresh");
export const startRefreshEnv    = (env) => postJSON(`/api/refresh-env?environment=${encodeURIComponent(env)}`);
export const fetchJiraVersions  = ()    => request("/api/jira/fix-versions");
