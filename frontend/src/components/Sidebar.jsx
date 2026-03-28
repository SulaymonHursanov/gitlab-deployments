import React, { useState } from "react";
import { fetchJiraVersions } from "../api.js";

const styles = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: "#161b22",
    borderRight: "1px solid #30363d",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sectionHeader: {
    padding: "12px 14px 8px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#8b949e",
    borderBottom: "1px solid #21262d",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  addBtn: {
    background: "transparent",
    border: "none",
    color: "#58a6ff",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    padding: "0 2px",
    display: "flex",
    alignItems: "center",
  },
  jiraBtn: {
    background: "transparent",
    border: "none",
    color: "#8b949e",
    cursor: "pointer",
    fontSize: 11,
    lineHeight: 1,
    padding: "0 2px",
    display: "flex",
    alignItems: "center",
  },
  jiraPanel: {
    borderTop: "1px solid #21262d",
    maxHeight: 220,
    overflowY: "auto",
    flexShrink: 0,
  },
  jiraItem: {
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 12,
    color: "#e6edf3",
    display: "flex",
    alignItems: "center",
    gap: 6,
    borderBottom: "1px solid #21262d22",
  },
  jiraItemReleased: {
    color: "#484f58",
  },
  jiraBadge: (released) => ({
    fontSize: 10,
    padding: "1px 5px",
    borderRadius: 3,
    background: released ? "#21262d" : "#1f3a1f",
    color: released ? "#484f58" : "#3fb950",
    flexShrink: 0,
  }),
  jiraError: {
    padding: "8px 14px",
    fontSize: 12,
    color: "#f85149",
  },
  jiraLoading: {
    padding: "8px 14px",
    fontSize: 12,
    color: "#8b949e",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 0",
    minHeight: 60,
  },
  releasesList: {
    maxHeight: 180,
    overflowY: "auto",
    padding: "6px 0",
    flexShrink: 0,
  },
  item: (active) => ({
    padding: "7px 14px",
    cursor: "pointer",
    borderRadius: 4,
    margin: "1px 6px",
    background: active ? "#1f6feb22" : "transparent",
    color: active ? "#58a6ff" : "#e6edf3",
    fontWeight: active ? 600 : 400,
    borderLeft: active ? "2px solid #58a6ff" : "2px solid transparent",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "background 0.1s",
  }),
  releaseItem: (active) => ({
    padding: "7px 14px",
    cursor: "pointer",
    borderRadius: 4,
    margin: "1px 6px",
    background: active ? "#2d1f0e22" : "transparent",
    color: active ? "#e3b341" : "#e6edf3",
    fontWeight: active ? 600 : 400,
    borderLeft: active ? "2px solid #e3b341" : "2px solid transparent",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "background 0.1s",
    fontSize: 13,
  }),
  footer: {
    borderTop: "1px solid #21262d",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flexShrink: 0,
  },
  refreshBtn: {
    padding: "7px",
    background: "transparent",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#8b949e",
    cursor: "pointer",
    fontSize: 12,
    textAlign: "center",
  },
  progressWrap: {
    padding: "2px 0",
  },
  progressBar: () => ({
    height: 3,
    borderRadius: 2,
    background: "#21262d",
    overflow: "hidden",
    marginBottom: 4,
    position: "relative",
  }),
  progressFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "#238636",
    borderRadius: 2,
    transition: "width 0.2s",
  }),
  progressText: {
    fontSize: 11,
    color: "#8b949e",
    textAlign: "center",
  },
};

function Progress({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div style={styles.progressWrap}>
      <div style={styles.progressBar(pct)}>
        <div style={styles.progressFill(pct)} />
      </div>
      <div style={styles.progressText}>
        {current} из {total} ({pct}%)
      </div>
    </div>
  );
}

export default function Sidebar({
  environments,
  selected,
  onSelect,
  onRefresh,
  disabled,
  progress,
  releases,
  selectedRelease,
  onSelectRelease,
  onNewRelease,
}) {
  const [jiraOpen, setJiraOpen] = useState(false);
  const [jiraVersions, setJiraVersions] = useState(null);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraError, setJiraError] = useState(null);

  async function handleJiraToggle() {
    if (jiraOpen) {
      setJiraOpen(false);
      return;
    }
    setJiraOpen(true);
    if (jiraVersions !== null) return; // already loaded
    setJiraLoading(true);
    setJiraError(null);
    try {
      const data = await fetchJiraVersions();
      setJiraVersions(data.versions);
    } catch (e) {
      setJiraError(e.message);
    } finally {
      setJiraLoading(false);
    }
  }

  function handlePickVersion(v) {
    onNewRelease(v.name);
    setJiraOpen(false);
  }

  return (
    <div style={styles.sidebar}>
      {/* Environments section */}
      <div style={styles.sectionHeader}>
        <span>Environments</span>
      </div>
      <div style={styles.list}>
        {environments.map((env) => (
          <div
            key={env}
            style={styles.item(env === selected && !selectedRelease)}
            onClick={() => !disabled && onSelect(env)}
            title={env}
          >
            {env}
          </div>
        ))}
      </div>

      {/* Releases section */}
      <div style={styles.sectionHeader}>
        <span>Releases</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            style={styles.jiraBtn}
            onClick={handleJiraToggle}
            title="Импортировать из Jira"
          >
            {jiraOpen ? "▲ Jira" : "▼ Jira"}
          </button>
          <button style={styles.addBtn} onClick={() => onNewRelease()} title="Новый релиз">
            +
          </button>
        </div>
      </div>

      {jiraOpen && (
        <div style={styles.jiraPanel}>
          {jiraLoading && <div style={styles.jiraLoading}>Загрузка…</div>}
          {jiraError && <div style={styles.jiraError}>{jiraError}</div>}
          {jiraVersions && jiraVersions.length === 0 && (
            <div style={styles.jiraLoading}>Нет версий</div>
          )}
          {jiraVersions && jiraVersions.map((v) => (
            <div
              key={v.id}
              style={{
                ...styles.jiraItem,
                ...(v.released ? styles.jiraItemReleased : {}),
              }}
              onClick={() => !v.released && handlePickVersion(v)}
              title={v.description || v.name}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {v.name}
              </span>
              <span style={styles.jiraBadge(v.released)}>
                {v.released ? "released" : "open"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={styles.releasesList}>
        {releases.length === 0 && (
          <div style={{ padding: "8px 14px", fontSize: 12, color: "#484f58" }}>
            Нет релизов
          </div>
        )}
        {releases.map((r) => (
          <div
            key={r.id}
            style={styles.releaseItem(r.id === selectedRelease)}
            onClick={() => onSelectRelease(r.id)}
            title={r.name}
          >
            {r.name || "Без названия"}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {progress && <Progress current={progress.current} total={progress.total} />}
        <button style={styles.refreshBtn} onClick={onRefresh} disabled={disabled}>
          {disabled && progress ? "Обновление…" : "⟳ Refresh all"}
        </button>
      </div>
    </div>
  );
}
