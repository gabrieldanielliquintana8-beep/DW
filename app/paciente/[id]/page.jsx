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
} from "@/lib/patients";

export default function PacientePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [state, setState] = useState("loading");
  const [patient, setPatient] = useState(null);
  const [topics, setTopics] = useState([]);
  const [columns, setColumns] = useState([]);
  const [erro, setErro] = useState("");

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

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: 960, margin: "0 auto" }}>
      <Link href="/" style={{ color: "#2563eb", textDecoration: "none", fontSize: 14 }}>← Voltar para a lista</Link>

      <header style={{ marginTop: 16, marginBottom: 24, padding: "20px 24px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <h1 style={{ margin: 0 }}>Paciente #{patient.id}</h1>
        <div style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
          {[sexo, idade && `${idade} anos`, etnia].filter(Boolean).join(" · ")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {MANIFESTACOES.map((m) => {
            const ativo = temManifestacao(patient, m);
            return (
              <span
                key={m.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 13,
                  background: ativo ? `${m.color}22` : "#f3f4f6",
                  border: ativo ? `1px solid ${m.color}66` : "1px solid transparent",
                  color: ativo ? "#111827" : "#9ca3af",
                  opacity: ativo ? 1 : 0.6,
                }}
              >
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
            subtopic: c.subtopic,
            value: limparTexto(patient.values[`${c.topic}||${c.subtopic}`]),
          }))
          .filter((s) => s.value);
        if (subs.length === 0) return null;
        return (
          <details key={topic} open style={{ marginBottom: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <summary style={{ padding: "12px 16px", cursor: "pointer", fontWeight: 600, fontSize: 15, background: "#f9fafb", display: "flex", alignItems: "center", gap: 8 }}>
              <span>{TOPIC_ICONS[topic] || "📄"}</span>
              <span>{topic}</span>
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 400, marginLeft: 6 }}>({subs.length})</span>
            </summary>
            <dl style={{ margin: 0, padding: "12px 16px", display: "grid", gap: 10 }}>
              {subs.map((s) => (
                <div key={s.subtopic} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) 1fr", gap: 12, borderBottom: "1px solid #f3f4f6", paddingBottom: 8 }}>
                  <dt style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{humanizarSubtopico(s.subtopic)}</dt>
                  <dd style={{ margin: 0, fontSize: 14, color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{s.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        );
      })}
    </main>
  );
}
