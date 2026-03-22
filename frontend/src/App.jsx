import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import DeploymentsTable from "./components/DeploymentsTable.jsx";
import ReleasesView from "./components/ReleasesView.jsx";
import {
  fetchEnvironments,
  fetchDeployments,
  fetchRefreshStatus,
  refreshStream,
  startRefreshAll,
  startRefreshEnv,
} from "./api.js";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadReleasesFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("gl_releases") || "[]");
  } catch {
    return [];
  }
}

function saveReleasesToStorage(releases) {
  localStorage.setItem("gl_releases", JSON.stringify(releases));
}

const styles = {
  app: { display: "flex", flexDirection: "column", height: "100vh" },
  topbar: {
    background: "#161b22",
    borderBottom: "1px solid #30363d",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  title: { fontWeight: 700, fontSize: 15, color: "#e6edf3" },
  subtitle: { color: "#8b949e", fontSize: 13 },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  error: {
    color: "#f85149",
    background: "#1c1012",
    border: "1px solid #6e1a20",
    borderRadius: 6,
    padding: "10px 14px",
    margin: "12px 20px 0",
    fontSize: 13,
  },
};

export default function App() {
  const [environments, setEnvironments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loadingDeps, setLoadingDeps] = useState(false);

  // progress: null | { current, total }
  const [refreshAllProgress, setRefreshAllProgress] = useState(null);
  const [refreshEnvProgress, setRefreshEnvProgress] = useState(null);

  // true while a job is running on the backend
  const [anyRunning, setAnyRunning] = useState(false);

  const [error, setError] = useState(null);

  // releases
  const [releases, setReleases] = useState(loadReleasesFromStorage);
  const [selectedRelease, setSelectedRelease] = useState(null);

  // keep selected in a ref so stream callbacks see the latest value
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  // -------------------------------------------------------------------------
  // On mount: check if a refresh is already running, restore progress
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      // Always load cached data first so the UI is immediately populated
      await loadEnvironments();

      // Then check if backend has an ongoing refresh
      try {
        const s = await fetchRefreshStatus();
        if (s.status === "running") {
          restoreProgress(s);
          await subscribeToStream();
        }
      } catch {
        // ignore status errors
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function restoreProgress(s) {
    setAnyRunning(true);
    if (s.refresh_type === "all") {
      setRefreshAllProgress({ current: s.current, total: s.total });
    } else if (s.refresh_type === "env") {
      setRefreshEnvProgress({ current: s.current, total: s.total });
    }
  }

  async function subscribeToStream() {
    try {
      for await (const event of refreshStream()) {
        if (event.type === "progress") {
          const p = { current: event.current, total: event.total };
          if (event.refresh_type === "all") setRefreshAllProgress(p);
          else setRefreshEnvProgress(p);
        } else if (event.type === "done") {
          if (event.refresh_type === "all") {
            setEnvironments(event.environments);
            setUpdatedAt(event.updated_at);
            if (selectedRef.current) await loadDeployments(selectedRef.current);
          } else if (event.refresh_type === "env") {
            setDeployments(event.deployments);
            setUpdatedAt(event.updated_at);
          }
          setRefreshAllProgress(null);
          setRefreshEnvProgress(null);
          setAnyRunning(false);
        } else if (event.type === "error") {
          setError(event.detail);
          setRefreshAllProgress(null);
          setRefreshEnvProgress(null);
          setAnyRunning(false);
          break;
        } else if (event.type === "idle") {
          setAnyRunning(false);
          break;
        }
      }
    } catch (e) {
      setError(e.message);
      setRefreshAllProgress(null);
      setRefreshEnvProgress(null);
      setAnyRunning(false);
    }
  }

  // -------------------------------------------------------------------------
  async function loadEnvironments() {
    try {
      const data = await fetchEnvironments();
      setEnvironments(data.environments);
      setUpdatedAt(data.updated_at);
      if (data.environments.length > 0) {
        await loadDeployments(data.environments[0]);
        setSelected(data.environments[0]);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadDeployments(env) {
    setLoadingDeps(true);
    setError(null);
    try {
      const data = await fetchDeployments(env);
      setDeployments(data.deployments);
      setUpdatedAt(data.updated_at);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingDeps(false);
    }
  }

  async function selectEnv(env) {
    setSelectedRelease(null);
    setSelected(env);
    await loadDeployments(env);
  }

  // -------------------------------------------------------------------------
  function handleNewRelease() {
    const r = { id: uid(), name: "Новый релиз", envConfigs: [] };
    const updated = [...releases, r];
    setReleases(updated);
    saveReleasesToStorage(updated);
    setSelectedRelease(r.id);
    setSelected(null);
  }

  function handleSelectRelease(id) {
    setSelectedRelease(id);
    setSelected(null);
  }

  function handleUpdateRelease(updated) {
    const list = releases.map((r) => (r.id === updated.id ? updated : r));
    setReleases(list);
    saveReleasesToStorage(list);
  }

  function handleDeleteRelease(id) {
    const list = releases.filter((r) => r.id !== id);
    setReleases(list);
    saveReleasesToStorage(list);
    setSelectedRelease(null);
    if (environments.length > 0) setSelected(environments[0]);
  }

  // -------------------------------------------------------------------------
  async function handleRefreshAll() {
    setError(null);
    try {
      await startRefreshAll();
      setAnyRunning(true);
      setRefreshAllProgress({ current: 0, total: 0 });
      await subscribeToStream();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRefreshEnv() {
    if (!selected) return;
    setError(null);
    try {
      await startRefreshEnv(selected);
      setAnyRunning(true);
      setRefreshEnvProgress({ current: 0, total: 0 });
      await subscribeToStream();
    } catch (e) {
      setError(e.message);
    }
  }

  // -------------------------------------------------------------------------
  return (
    <div style={styles.app}>
      <div style={styles.topbar}>
        <span style={styles.title}>GitLab Deployments</span>
        <span style={styles.subtitle}>cloud group</span>
        {updatedAt && (
          <span style={{ ...styles.subtitle, marginLeft: "auto" }}>
            updated: {updatedAt}
          </span>
        )}
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.body}>
        <Sidebar
          environments={environments}
          selected={selected}
          onSelect={selectEnv}
          onRefresh={handleRefreshAll}
          disabled={anyRunning}
          progress={refreshAllProgress}
          releases={releases}
          selectedRelease={selectedRelease}
          onSelectRelease={handleSelectRelease}
          onNewRelease={handleNewRelease}
        />
        {selectedRelease ? (
          <ReleasesView
            key={selectedRelease}
            release={releases.find((r) => r.id === selectedRelease)}
            environments={environments}
            onChange={handleUpdateRelease}
            onDelete={() => handleDeleteRelease(selectedRelease)}
          />
        ) : (
          <DeploymentsTable
            deployments={deployments}
            loading={loadingDeps}
            environment={selected}
            onRefreshEnv={handleRefreshEnv}
            disabled={anyRunning}
            progress={refreshEnvProgress}
          />
        )}
      </div>
    </div>
  );
}
