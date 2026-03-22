import React from "react";

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
  header: {
    padding: "16px 14px 10px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#8b949e",
    borderBottom: "1px solid #21262d",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 0",
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
  footer: {
    borderTop: "1px solid #21262d",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
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
  progressBar: (pct) => ({
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

export default function Sidebar({ environments, selected, onSelect, onRefresh, disabled, progress }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>Environments</div>
      <div style={styles.list}>
        {environments.map((env) => (
          <div
            key={env}
            style={styles.item(env === selected)}
            onClick={() => !disabled && onSelect(env)}
            title={env}
          >
            {env}
          </div>
        ))}
      </div>
      <div style={styles.footer}>
        {progress && <Progress current={progress.current} total={progress.total} />}
        <button style={styles.refreshBtn} onClick={onRefresh} disabled={disabled}>
          {disabled && progress ? "Обновление…" : "⟳ Refresh all"}
        </button>
      </div>
    </div>
  );
}
