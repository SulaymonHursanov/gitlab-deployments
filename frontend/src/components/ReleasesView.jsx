import React, { useState, useEffect } from "react";
import { fetchDeployments } from "../api.js";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function shortName(project) {
  return project.replace(/^cloud\//, "");
}

const s = {
  root: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#0d1117",
  },
  header: {
    padding: "16px 20px 12px",
    borderBottom: "1px solid #21262d",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e6edf3",
    flex: 1,
  },
  nameInput: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#e6edf3",
    fontSize: 15,
    fontWeight: 600,
    padding: "4px 10px",
    outline: "none",
    flex: 1,
  },
  body: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minHeight: 0,
  },
  envBlock: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    overflow: "hidden",
    flexShrink: 0,
  },
  envBlockHeader: (open) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderBottom: open ? "1px solid #21262d" : "none",
    background: "#161b22",
    cursor: "pointer",
    userSelect: "none",
  }),
  chevron: (open) => ({
    color: "#8b949e",
    fontSize: 11,
    flexShrink: 0,
    transform: open ? "rotate(90deg)" : "rotate(0deg)",
    transition: "transform 0.15s",
    lineHeight: 1,
  }),
  envLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#8b949e",
    marginRight: 4,
    flexShrink: 0,
  },
  select: {
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#e6edf3",
    fontSize: 13,
    padding: "4px 8px",
    outline: "none",
    cursor: "pointer",
    flex: 1,
  },
  removeBtn: {
    background: "transparent",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#8b949e",
    cursor: "pointer",
    fontSize: 12,
    padding: "4px 8px",
  },
  servicesList: {
    padding: "8px 0",
    maxHeight: 280,
    overflowY: "auto",
  },
  serviceRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 14px",
  },
  checkbox: {
    accentColor: "#238636",
    cursor: "pointer",
    width: 14,
    height: 14,
    flexShrink: 0,
  },
  serviceName: {
    flex: 1,
    fontSize: 13,
    color: "#e6edf3",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  serviceNameOff: {
    flex: 1,
    fontSize: 13,
    color: "#484f58",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  branchInput: {
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#58a6ff",
    fontSize: 12,
    fontFamily: "monospace",
    padding: "3px 8px",
    width: 180,
    outline: "none",
    flexShrink: 0,
  },
  loadingText: {
    padding: "10px 14px",
    fontSize: 13,
    color: "#8b949e",
  },
  addEnvBtn: {
    alignSelf: "flex-start",
    background: "transparent",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#8b949e",
    cursor: "pointer",
    fontSize: 13,
    padding: "7px 14px",
  },
  footer: {
    borderTop: "1px solid #21262d",
    padding: "12px 20px",
    display: "flex",
    gap: 10,
    flexShrink: 0,
    alignItems: "center",
  },
  generateBtn: {
    background: "#238636",
    border: "1px solid #2ea043",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 18px",
  },
  deleteBtn: {
    background: "transparent",
    border: "1px solid #6e1a20",
    borderRadius: 6,
    color: "#f85149",
    cursor: "pointer",
    fontSize: 13,
    padding: "8px 14px",
    marginLeft: "auto",
  },
  outputWrap: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
  },
  outputPre: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    color: "#e6edf3",
    fontFamily: "monospace",
    fontSize: 13,
    padding: "14px 16px",
    whiteSpace: "pre",
    margin: 0,
    lineHeight: 1.7,
  },
  outputHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  outputTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  copyBtn: {
    background: "transparent",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#8b949e",
    cursor: "pointer",
    fontSize: 12,
    padding: "3px 10px",
  },
  emptyHint: {
    padding: "40px 20px",
    textAlign: "center",
    color: "#484f58",
    fontSize: 14,
  },
};

function EnvConfig({ config, environments, onChange, onRemove }) {
  const [allDeployments, setAllDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!config.env) return;
    setLoading(true);
    fetchDeployments(config.env)
      .then((data) => {
        setAllDeployments(data.deployments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [config.env]);

  const allProjects = [...new Set(allDeployments.map((d) => d.project))].sort();
  const selectedMap = Object.fromEntries(config.services.map((s) => [s.project, s.branch]));

  function handleEnvChange(env) {
    onChange({ ...config, env, services: [] });
  }

  function toggleProject(project) {
    if (selectedMap[project] !== undefined) {
      onChange({ ...config, services: config.services.filter((s) => s.project !== project) });
    } else {
      const dep = allDeployments.find((d) => d.project === project);
      onChange({
        ...config,
        services: [...config.services, { project, branch: dep?.branch || "main" }],
      });
    }
  }

  function updateBranch(project, branch) {
    onChange({
      ...config,
      services: config.services.map((s) => (s.project === project ? { ...s, branch } : s)),
    });
  }

  const checkedCount = config.services.length;

  return (
    <div style={s.envBlock}>
      <div style={s.envBlockHeader(open)} onClick={() => setOpen((v) => !v)}>
        <span style={s.chevron(open)}>▶</span>
        <span style={s.envLabel}>env</span>
        <select
          style={s.select}
          value={config.env}
          onChange={(e) => { e.stopPropagation(); handleEnvChange(e.target.value); }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">— выбрать env —</option>
          {environments.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        {!open && checkedCount > 0 && (
          <span style={{ fontSize: 11, color: "#58a6ff", flexShrink: 0 }}>
            {checkedCount} сервисов
          </span>
        )}
        <button
          style={s.removeBtn}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          ✕
        </button>
      </div>

      {open && config.env && (
        <div style={s.servicesList}>
          {loading ? (
            <div style={s.loadingText}>Загрузка сервисов…</div>
          ) : allProjects.length === 0 ? (
            <div style={s.loadingText}>Нет сервисов</div>
          ) : (
            allProjects.map((project) => {
              const checked = selectedMap[project] !== undefined;
              return (
                <div key={project} style={s.serviceRow}>
                  <input
                    type="checkbox"
                    style={s.checkbox}
                    checked={checked}
                    onChange={() => toggleProject(project)}
                  />
                  <span
                    style={checked ? s.serviceName : s.serviceNameOff}
                    title={project}
                  >
                    {shortName(project)}
                  </span>
                  {checked && (
                    <input
                      style={s.branchInput}
                      type="text"
                      value={selectedMap[project]}
                      onChange={(e) => updateBranch(project, e.target.value)}
                      placeholder="branch"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function generateText(release) {
  const parts = [];
  for (const cfg of release.envConfigs) {
    if (!cfg.env || cfg.services.length === 0) continue;
    const lines = [`env: ${cfg.env}`];
    for (const svc of cfg.services) {
      lines.push(`${shortName(svc.project)}: ${svc.branch}`);
    }
    parts.push(lines.join("\n"));
  }
  return parts.join("\n\n");
}

export default function ReleasesView({ release, environments, onChange, onDelete }) {
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);

  const output = generateText(release);

  function updateName(name) {
    onChange({ ...release, name });
  }

  function addEnvConfig() {
    onChange({
      ...release,
      envConfigs: [ { id: uid(), env: "", services: [] }, ...release.envConfigs],
    });
  }

  function updateEnvConfig(id, updated) {
    onChange({
      ...release,
      envConfigs: release.envConfigs.map((c) => (c.id === id ? updated : c)),
    });
  }

  function removeEnvConfig(id) {
    onChange({
      ...release,
      envConfigs: release.envConfigs.filter((c) => c.id !== id),
    });
  }

  function handleGenerate() {
    setShowOutput(true);
  }

  function handleCopy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <input
          style={s.nameInput}
          value={release.name}
          onChange={(e) => updateName(e.target.value)}
          placeholder="Название релиза"
        />
        {showOutput && (
          <button style={s.addEnvBtn} onClick={() => setShowOutput(false)}>
            ← Назад к редактору
          </button>
        )}
      </div>
      <div style={s.header}>
        <button style={s.addEnvBtn} onClick={addEnvConfig}>
          + Добавить env
        </button>
      </div>

      {showOutput ? (
        <div style={s.outputWrap}>
          <div style={s.outputHeader}>
            <span style={s.outputTitle}>Сформированный список</span>
            <button style={s.copyBtn} onClick={handleCopy}>
              {copied ? "✓ Скопировано" : "Копировать"}
            </button>
          </div>
          <pre style={s.outputPre}>{output || "Нет данных — добавьте env и выберите сервисы"}</pre>
        </div>
      ) : (
        <>
          <div style={s.body}>
            {release.envConfigs.length === 0 && (
              <div style={s.emptyHint}>
                Добавьте окружение, выберите сервисы и ветки, затем нажмите «Сформировать»
              </div>
            )}
            {release.envConfigs.map((cfg) => (
              <EnvConfig
                key={cfg.id}
                config={cfg}
                environments={environments}
                onChange={(updated) => updateEnvConfig(cfg.id, updated)}
                onRemove={() => removeEnvConfig(cfg.id)}
              />
            ))}
          </div>

          <div style={s.footer}>
            <button style={s.generateBtn} onClick={handleGenerate}>
              Сформировать список
            </button>
            <button style={s.deleteBtn} onClick={onDelete}>
              Удалить релиз
            </button>
          </div>
        </>
      )}
    </div>
  );
}
