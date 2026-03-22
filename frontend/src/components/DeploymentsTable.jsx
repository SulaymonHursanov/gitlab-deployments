import React, { useState } from "react";

const COLS = [
  { key: "project", label: "Project" },
  { key: "branch", label: "Branch" },
  { key: "deployed_by", label: "Deployed By" },
  { key: "deployed_at", label: "Deployed At" },
  { key: "commit_sha", label: "Commit" },
];

const styles = {
  wrapper: {
    flex: 1,
    overflow: "auto",
    padding: "20px 24px",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  meta: {
    color: "#8b949e",
    fontSize: 13,
  },
  refreshEnvBtn: {
    padding: "4px 12px",
    background: "transparent",
    border: "1px solid #30363d",
    borderRadius: 5,
    color: "#8b949e",
    cursor: "pointer",
    fontSize: 12,
  },
  progressText: {
    fontSize: 12,
    color: "#3fb950",
    fontVariantNumeric: "tabular-nums",
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    background: "#21262d",
    overflow: "hidden",
    width: 120,
    alignSelf: "center",
  },
  progressFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "#238636",
    borderRadius: 2,
    transition: "width 0.2s",
  }),
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: (active) => ({
    textAlign: "left",
    padding: "8px 12px",
    background: "#161b22",
    color: active ? "#58a6ff" : "#8b949e",
    fontWeight: 600,
    borderBottom: "1px solid #30363d",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  }),
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #21262d",
    verticalAlign: "middle",
  },
  branch: {
    fontFamily: "monospace",
    fontSize: 12,
    background: "#1f2937",
    padding: "2px 6px",
    borderRadius: 4,
    color: "#79c0ff",
  },
  sha: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#8b949e",
  },
  project: {
    color: "#e6edf3",
  },
  empty: {
    color: "#8b949e",
    padding: "40px 0",
    textAlign: "center",
  },
};

function EnvProgress({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <>
      <div style={styles.progressBar}>
        <div style={styles.progressFill(pct)} />
      </div>
      <span style={styles.progressText}>
        {current} из {total} ({pct}%)
      </span>
    </>
  );
}

export default function DeploymentsTable({ deployments, loading, environment, onRefreshEnv, disabled, progress }) {
  const [sortKey, setSortKey] = useState("project");
  const [sortDir, setSortDir] = useState(1);

  function handleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => -d);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  const sorted = [...deployments].sort((a, b) => {
    const av = a[sortKey] || "";
    const bv = b[sortKey] || "";
    return av.localeCompare(bv) * sortDir;
  });

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.empty}>Loading…</div>
      </div>
    );
  }

  if (!environment) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.empty}>← Select an environment</div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.metaRow}>
        <span style={styles.meta}>
          <strong style={{ color: "#e6edf3" }}>{environment}</strong> — {deployments.length} service
          {deployments.length !== 1 ? "s" : ""}
        </span>
        {progress
          ? <EnvProgress current={progress.current} total={progress.total} />
          : (
            <button
              style={styles.refreshEnvBtn}
              onClick={onRefreshEnv}
              disabled={disabled || loading}
            >
              ⟳ Update branches
            </button>
          )
        }
      </div>
      {sorted.length === 0 ? (
        <div style={styles.empty}>No deployments found</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  style={styles.th(col.key === sortKey)}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label} {col.key === sortKey ? (sortDir === 1 ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "#0d111766" }}>
                <td style={styles.td}>
                  <span style={styles.project}>{row.project.replace(/^cloud\//, "")}</span>
                </td>
                <td style={styles.td}>
                  <span style={styles.branch}>{row.branch}</span>
                </td>
                <td style={styles.td}>{row.deployed_by}</td>
                <td style={styles.td}>{row.deployed_at}</td>
                <td style={styles.td}>
                  <span style={styles.sha}>{row.commit_sha}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
