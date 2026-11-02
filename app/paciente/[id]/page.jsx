"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  TOPIC_ICONS,
  MANIFESTACOES,
  temManifestacao,
  humanizarSubtopico,
  limparTexto,
  getFieldConfig,
} from "@/lib/patients";

const INPUT_STYLE = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export default function PacientePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [state, setState] = useState("loading");
  const [patient, setPatient] = useState(null);
  const [topics, setTopics] = useState([]);
  const [columns, setColumns] = useState([]);
  const [erro, setErro] = useState("");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dados");
        if (res.status === 401) {
          router.push("/");
          return;
        }
        const json = await res.json();
        if (!json.ok) {
          setErro(json.erro || "Erro");
          setState("erro");
          return;
        }
        const p = json.patients.find((x) => String(x.id) === String(id));
        if (!p) {
          setErro("Paciente não encontrado.");
          setState("erro");
          return;
        }
        setPatient(p);
        setTopics(json.topics);
        setColumns(json.columns);
        setState("ok");
      } catch {
        setErro("Erro de conexão");
        setState("erro");
      }
    })();
  }, [id, router]);

  function startEdit() {
    const initial = {};
    for (const c of columns) {
      if (!c.subtopic) continue;
      const key = `${c.topic}||${c.subtopic}`;
      initial[key] = patient.values[key] || "";
    }
    setDraft(initial);
    setEditing(true);
    setSaveError("");
    setSaveOk(false);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft({});
    setSaveError("");
    setSaveOk(false);
  }

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function saveEdits() {
    const edits = [];
    for (const c of columns) {
      if (!c.subtopic) continue;
      const key = `${c.topic}||${c.subtopic}`;
      if (key === "POL||ID") continue;
      const oldValue = patient.values[key] || "";
      const newValue = draft[key] ?? "";
      if (oldValue !== newValue) {
        edits.push({
          topic: c.topic,
          subtopic: c.subtopic,
          oldValue,
          newValue,
        });
      }
    }

    if (edits.length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveOk(false);
    try {
      const res = await fetch("/api/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          spreadsheetRow: patient.spreadsheetRow,
          edits,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        const newValues = { ...patient.values };
        for (const e of edits) {
          newValues[`${e.topic}||${e.subtopic}`] = e.newValue;
        }
        setPatient({ ...patient, values: newValues });
        setEditing(false);
        setDraft({});
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 2500);
      } else {
        setSaveError(json.erro || "Erro ao salvar");
      }
    } catch {
      setSaveError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") {
    return <main style={{ padding: 40, fontFamily: "system-ui" }}>Carregando…</main>;
  }

  if (state === "erro") {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui", maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#2563eb", textDecoration: "none" }}>← Voltar</Link>
        <h1 style={{ marginTop: 16 }}>Ops</h1>
        <p style={{ color: "#c00" }}>{erro}</p>
      </main>
    );
  }

  const sexo = patient.values["Demograficos||Sexo"] || "";
  const idade = patient.values["Demograficos||Idade_atual_anos"] || "";
  const etnia = patient.values["Demograficos||Etnia"] || "";

  const changedCount = editing
    ? columns.filter((c) => {
        if (!c.subtopic) return false;
        const key = `${c.topic}||${c.subtopic}`;
        if (key === "POL||ID") return false;
        return (patient.values[key] || "") !== (draft[key] ?? "");
      }).length
    : 0;

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: 960, margin: "0 auto" }}>
      <Link href="/" style={{ color: "#2563eb", textDecoration: "none", fontSize: 14 }}>← Voltar para a lista</Link>

      <header style={{ marginTop: 16, marginBottom: 24, padding: "20px 24px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0 }}>Paciente #{patient.id}</h1>
            <div style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
              {[sexo, idade && `${idade} anos`, etnia].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saveOk && <span style={{ color: "#16a34a", fontSize: 13 }}>✓ Salvo</span>}
            {!editing ? (
              <button onClick={startEdit} style={{ padding: "8px 16px", cursor: "pointer", border: "1px solid #2563eb", background: "#fff", color: "#2563eb", borderRadius: 6, fontWeight: 500 }}>
                Editar
              </button>
            ) : (
              <>
                <button onClick={cancelEdit} disabled={saving} style={{ padding: "8px 16px", cursor: "pointer", border: "1px solid #d1d5db", background: "#fff", borderRadius: 6 }}>
                  Cancelar
                </button>
                <button onClick={saveEdits} disabled={saving || changedCount === 0} style={{ padding: "8px 16px", cursor: changedCount === 0 ? "not-allowed" : "pointer", border: "none", background: changedCount === 0 ? "#93c5fd" : "#2563eb", color: "#fff", borderRadius: 6, fontWeight: 500 }}>
                  {saving ? "Salvando…" : `Salvar${changedCount > 0 ? ` (${changedCount})` : ""}`}
                </button>
              </>
            )}
          </div>
        </div>
        {saveError && <p style={{ color: "#c00", marginTop: 12, marginBottom: 0, fontSize: 13 }}>{saveError}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {MANIFESTACOES.map((m) => {
            const ativo = temManifestacao(patient, m);
            return (
              <span key={m.key} title={`${m.label}: ${ativo ? "presente" : "ausente"}`} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px",
                borderRadius: 999, fontSize: 13,
                background: ativo ? `${m.color}22` : "#f3f4f6",
                border: ativo ? `1px solid ${m.color}66` : "1px solid transparent",
                color: ativo ? "#111827" : "#9ca3af",
                opacity: ativo ? 1 : 0.6,
              }}>
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                {m.label}
                <strong style={{ marginLeft: 2 }}>{ativo ? "·" : "—"}</strong>
              </span>
            );
          })}
        </div>
      </header>

      {topics.map((topic) => {
        const subs = columns
          .filter((c) => c.topic === topic && c.subtopic)
          .map((c) => ({
            topic: c.topic,
            subtopic: c.subtopic,
            key: `${c.topic}||${c.subtopic}`,
            value: limparTexto(patient.values[`${c.topic}||${c.subtopic}`]),
          }));

        // No modo view, ocultar tópicos em que TUDO está vazio
        if (!editing && subs.every((s) => !s.value)) return null;

        return (
          <details key={topic} open style={{ marginBottom: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <summary style={{ padding: "12px 16px", cursor: "pointer", fontWeight: 600, fontSize: 15, background: "#f9fafb", display: "flex", alignItems: "center", gap: 8 }}>
              <span>{TOPIC_ICONS[topic] || "📄"}</span>
              <span>{topic}</span>
            </summary>
            <dl style={{ margin: 0, padding: "12px 16px", display: "grid", gap: 10 }}>
              {subs.map((s) => {
                const isBlocked = s.key === "POL||ID";
                if (!editing) {
                  if (!s.value) return null;
                  return (
                    <div key={s.subtopic} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) 1fr", gap: 12, borderBottom: "1px solid #f3f4f6", paddingBottom: 8 }}>
                      <dt style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{humanizarSubtopico(s.subtopic)}</dt>
                      <dd style={{ margin: 0, fontSize: 14, color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{s.value}</dd>
                    </div>
                  );
                }

                // Modo edição
                const config = getFieldConfig(s.topic, s.subtopic, patient.values[s.key] || "");
                const value = draft[s.key] ?? "";

                return (
                  <div key={s.subtopic} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) 1fr", gap: 12, borderBottom: "1px solid #f3f4f6", paddingBottom: 8, alignItems: "start" }}>
                    <dt style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, paddingTop: 6 }}>{humanizarSubtopico(s.subtopic)}</dt>
                    <dd style={{ margin: 0 }}>
                      {isBlocked ? (
                        <div style={{ fontSize: 14, color: "#9ca3af", paddingTop: 6 }}>{value} <span style={{ fontSize: 11 }}>(bloqueado)</span></div>
                      ) : config.type === "select" ? (
                        <select value={value} onChange={(e) => setField(s.key, e.target.value)} style={INPUT_STYLE}>
                          {config.options.map((opt) => (
                            <option key={opt} value={opt}>{opt || "(vazio)"}</option>
                          ))}
                        </select>
                      ) : config.type === "textarea" ? (
                        <textarea value={value} onChange={(e) => setField(s.key, e.target.value)} rows={3} style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 60 }} />
                      ) : (
                        <input type="text" value={value} onChange={(e) => setField(s.key, e.target.value)} style={INPUT_STYLE} />
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </details>
        );
      })}
    </main>
  );
}
