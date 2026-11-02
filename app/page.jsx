"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MANIFESTACOES,
  temManifestacao,
  getManifestacaoDetalhes,
  parseDate,
  toBRDisplay,
} from "@/lib/patients";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Home() {
  const router = useRouter();

  // ---- Todos os hooks PRIMEIRO (nunca depois de return) ----
  const [state, setState] = useState("loading");
  const [data, setData] = useState(null);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroSimples, setFiltroSimples] = useState("");
  const [filtroA, setFiltroA] = useState("");
  const [filtroB, setFiltroB] = useState("");
  const [uniaoTipo, setUniaoTipo] = useState("E");
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const filtrados = useMemo(() => {
    const pacientes = data?.patients || [];
    let result = pacientes;
    if (busca) {
      result = result.filter((p) =>
        String(p.id).toLowerCase().includes(busca.toLowerCase())
      );
    }
    if (filtroSimples) {
      const m = MANIFESTACOES.find((x) => x.key === filtroSimples);
      if (m) result = result.filter((p) => temManifestacao(p, m));
    }
    if (filtroA && filtroB) {
      const mA = MANIFESTACOES.find((x) => x.key === filtroA);
      const mB = MANIFESTACOES.find((x) => x.key === filtroB);
      if (mA && mB) {
        result = result.filter((p) => {
          const temA = temManifestacao(p, mA);
          const temB = temManifestacao(p, mB);
          return uniaoTipo === "E" ? temA && temB : temA || temB;
        });
      }
    }
    return result;
  }, [data, busca, filtroSimples, filtroA, filtroB, uniaoTipo]);

  const dias = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const arr = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const consultasPorDia = useMemo(() => {
    const map = new Map();
    for (const p of filtrados) {
      const raw = p.values["Agenda||Proxima_consulta"] || "";
      const d = parseDate(raw);
      if (!d) continue;
      d.setHours(0, 0, 0, 0);
      const key = isoFromDate(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return map;
  }, [filtrados]);

  const hojeKey = useMemo(() => isoFromDate(new Date()), []);

  // ---- Funções auxiliares ----
  async function carregarDados() {
    try {
      const res = await fetch("/api/dados");
      if (res.status === 401) {
        setState("login");
        inicializarGoogle();
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setState("autenticado");
      } else {
        setErro(json.erro || "Erro");
        setState("erro");
      }
    } catch {
      setErro("Erro de conexão");
      setState("erro");
    }
  }

  function inicializarGoogle() {
    if (window.google?.accounts?.id) return renderizarBotao();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = renderizarBotao;
    document.body.appendChild(s);
  }

  function renderizarBotao() {
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });
    const el = document.getElementById("g_id_signin");
    if (el) {
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        locale: "pt-BR",
      });
    }
  }

  async function handleCredential(response) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    const json = await res.json();
    if (json.ok) {
      setEmail(json.email);
      carregarDados();
    } else {
      setErro(json.erro || "Falha no login");
      setState("erro");
    }
  }

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    setData(null);
    setState("login");
    inicializarGoogle();
  }

  async function toggleControle(patient, field) {
    const key = `Controle||${field}`;
    const currentValue = patient.values[key] || "";
    const newValue = currentValue === "Sim" ? "Não" : "Sim";
    const tag = `${patient.id}-${field}`;
    setTogglingId(tag);
    try {
      const res = await fetch("/api/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          spreadsheetRow: patient.spreadsheetRow,
          edits: [{ topic: "Controle", subtopic: field, oldValue: currentValue, newValue }],
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev) => ({
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === patient.id ? { ...p, values: { ...p.values, [key]: newValue } } : p
          ),
        }));
      }
    } catch {
      // silencioso
    } finally {
      setTogglingId(null);
    }
  }

  function irParaPaciente(pid) {
    router.push(`/paciente/${encodeURIComponent(pid)}`);
  }

  function limparFiltros() {
    setBusca("");
    setFiltroSimples("");
    setFiltroA("");
    setFiltroB("");
  }

  // ---- Só agora os returns condicionais ----
  if (state === "loading") {
    return <main style={{ padding: 40, fontFamily: "system-ui" }}>Carregando…</main>;
  }

  if (state === "login") {
    return (
      <main style={{ maxWidth: 420, margin: "6rem auto", padding: "0 1rem", fontFamily: "system-ui", textAlign: "center" }}>
        <h1>Acesso restrito</h1>
        <p style={{ color: "#555", fontSize: 14 }}>
          Faça login com uma conta autorizada para visualizar os dados.
        </p>
        <div id="g_id_signin" style={{ display: "flex", justifyContent: "center", marginTop: 24 }} />
      </main>
    );
  }

  if (state === "erro") {
    return (
      <main style={{ maxWidth: 480, margin: "6rem auto", padding: "0 1rem", fontFamily: "system-ui", textAlign: "center" }}>
        <h1>Não foi possível acessar</h1>
        <p style={{ color: "#c00" }}>{erro}</p>
        <button onClick={sair} style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}>Voltar</button>
      </main>
    );
  }

  const pacientes = data?.patients || [];
  const pacientesDoDiaSelecionado = diaSelecionado
    ? consultasPorDia.get(diaSelecionado) || []
    : [];
  const temFiltroAtivo = busca || filtroSimples || (filtroA && filtroB);

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Pacientes</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>
            {filtrados.length} de {pacientes.length} registros · logado como {email}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Buscar por código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }}
          />
          <button onClick={sair} style={{ padding: "8px 16px", cursor: "pointer" }}>Sair</button>
        </div>
      </div>

      <div
        style={{
          marginBottom: 16, padding: "12px 16px", background: "#f9fafb",
          border: "1px solid #e5e7eb", borderRadius: 10,
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Filtrar por:</span>
        <select value={filtroSimples} onChange={(e) => setFiltroSimples(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="">Todas</option>
          {MANIFESTACOES.map((m) => (<option key={m.key} value={m.key}>{m.icon} {m.label}</option>))}
        </select>
        <span style={{ fontSize: 13, color: "#9ca3af", margin: "0 4px" }}>ou unir:</span>
        <select value={filtroA} onChange={(e) => setFiltroA(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="">Manifestação A</option>
          {MANIFESTACOES.map((m) => (<option key={m.key} value={m.key}>{m.icon} {m.label}</option>))}
        </select>
        <select value={uniaoTipo} onChange={(e) => setUniaoTipo(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="E">E</option>
          <option value="OU">OU</option>
        </select>
        <select value={filtroB} onChange={(e) => setFiltroB(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="">Manifestação B</option>
          {MANIFESTACOES.map((m) => (<option key={m.key} value={m.key}>{m.icon} {m.label}</option>))}
        </select>
        {temFiltroAtivo && (
          <button onClick={limparFiltros}
            style={{ padding: "6px 12px", cursor: "pointer", border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, fontSize: 13 }}>
            Limpar
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtrados.map((p) => {
          const sexo = p.values["Demograficos||Sexo"] || "";
          const idade = p.values["Demograficos||Idade_atual_anos"] || "";
          const etnia = p.values["Demograficos||Etnia"] || "";
          const tcle = p.values["Controle||TCLE_coletado"] || "";
          const aghuse = p.values["Controle||Incluido_AGHUSE"] || "";
          const tcleOn = tcle === "Sim";
          const aghuseOn = aghuse === "Sim";
          const proxima = p.values["Agenda||Proxima_consulta"] || "";
          const ultima = p.values["Agenda||Ultima_consulta"] || "";
          const proximaDisplay = toBRDisplay(proxima);
          const ultimaDisplay = toBRDisplay(ultima);

          return (
            <div
              key={p.id}
              onClick={() => irParaPaciente(p.id)}
              style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
                padding: 16, cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)", position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
                e.currentTarget.style.transform = "translateY(0)";
                setHoveredIcon(null);
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <strong style={{ fontSize: 18 }}>Paciente #{p.id}</strong>
              </div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
                {[sexo, idade && `${idade} anos`, etnia].filter(Boolean).join(" · ")}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MANIFESTACOES.map((m) => {
                  const ativo = temManifestacao(p, m);
                  const mostrando = hoveredIcon?.patientId === p.id && hoveredIcon?.manifKey === m.key;
                  const detalhes = mostrando ? getManifestacaoDetalhes(p, m) : [];
                  return (
                    <div key={m.key} style={{ position: "relative" }}
                      onMouseEnter={() => setHoveredIcon({ patientId: p.id, manifKey: m.key })}
                      onMouseLeave={() => setHoveredIcon(null)}
                    >
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 30, height: 30, borderRadius: 8, fontSize: 16,
                        background: ativo ? `${m.color}22` : "#f3f4f6",
                        border: ativo ? `1px solid ${m.color}66` : "1px solid transparent",
                        opacity: ativo ? 1 : 0.35, filter: ativo ? "none" : "grayscale(1)",
                      }}>{m.icon}</span>
                      {mostrando && (
                        <div style={{
                          position: "absolute", bottom: "100%", left: "50%",
                          transform: "translateX(-50%)", marginBottom: 8,
                          background: "#1f2937", color: "#fff", padding: 12, borderRadius: 8,
                          fontSize: 12, zIndex: 1000, width: 260,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.3)", pointerEvents: "none", lineHeight: 1.4,
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>{m.icon}</span><span>{m.label}</span>
                            <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>{ativo ? "presente" : "ausente"}</span>
                          </div>
                          {detalhes.length === 0
                            ? <div style={{ opacity: 0.7, fontStyle: "italic" }}>Sem detalhes registrados.</div>
                            : detalhes.map((d) => (
                                <div key={d.field} style={{ marginTop: 4 }}>
                                  <span style={{ color: "#9ca3af" }}>{d.label}: </span><span>{d.value}</span>
                                </div>
                              ))
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); toggleControle(p, "TCLE_coletado"); }}
                  disabled={togglingId === `${p.id}-TCLE_coletado`}
                  style={{
                    padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: tcleOn ? "1px solid #16a34a" : "1px solid #d1d5db",
                    background: tcleOn ? "#dcfce7" : "#fff", color: tcleOn ? "#166534" : "#6b7280",
                  }}>
                  {togglingId === `${p.id}-TCLE_coletado` ? "…" : tcleOn ? "✓ TCLE" : "TCLE"}
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); toggleControle(p, "Incluido_AGHUSE"); }}
                  disabled={togglingId === `${p.id}-Incluido_AGHUSE`}
                  style={{
                    padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: aghuseOn ? "1px solid #2563eb" : "1px solid #d1d5db",
                    background: aghuseOn ? "#dbeafe" : "#fff", color: aghuseOn ? "#1e40af" : "#6b7280",
                  }}>
                  {togglingId === `${p.id}-Incluido_AGHUSE` ? "…" : aghuseOn ? "✓ AGHUSE" : "AGHUSE"}
                </button>
              </div>

              {(proximaDisplay || ultimaDisplay) && (
                <div style={{
                  marginTop: 10, paddingTop: 8, borderTop: "1px solid #f3f4f6",
                  fontSize: 10.5, color: "#9ca3af", lineHeight: 1.5,
                }}>
                  {proximaDisplay && <div>📅 Próxima: {proximaDisplay}</div>}
                  {ultimaDisplay && <div>🕐 Última: {ultimaDisplay}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <p style={{ marginTop: 40, color: "#999", textAlign: "center" }}>Nenhum paciente encontrado.</p>
      )}

      <div style={{ marginTop: 40, padding: "20px 24px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📅</span><span>Próximas consultas (30 dias)</span>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#9ca3af" }}>
          Baseado nos filtros ativos. Clique num dia para ver os pacientes.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textAlign: "center", padding: "4px 0" }}>{d}</div>
          ))}
          {Array.from({ length: dias.length > 0 ? dias[0].getDay() : 0 }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {dias.map((d) => {
            const key = isoFromDate(d);
            const lista = consultasPorDia.get(key) || [];
            const tem = lista.length > 0;
            const selecionado = diaSelecionado === key;
            const isHoje = key === hojeKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDiaSelecionado(tem ? (selecionado ? null : key) : null)}
                disabled={!tem}
                style={{
                  padding: "8px 4px", borderRadius: 8, cursor: tem ? "pointer" : "default",
                  border: selecionado ? "2px solid #2563eb" : isHoje ? "1.5px solid #f59e0b" : "1px solid #e5e7eb",
                  background: tem ? (selecionado ? "#eff6ff" : "#f0fdf4") : "#fafafa",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  minHeight: 52, position: "relative",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: isHoje ? 700 : 500, color: tem ? "#166534" : "#6b7280" }}>
                  {d.getDate()}
                </span>
                <span style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase" }}>
                  {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                </span>
                {tem && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "#fff",
                    background: "#16a34a", borderRadius: 999,
                    minWidth: 18, height: 18, display: "inline-flex",
                    alignItems: "center", justifyContent: "center", padding: "0 5px",
                  }}>
                    {lista.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {diaSelecionado && pacientesDoDiaSelecionado.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              {new Date(diaSelecionado + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              {" · "}
              {pacientesDoDiaSelecionado.length} paciente{pacientesDoDiaSelecionado.length > 1 ? "s" : ""}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pacientesDoDiaSelecionado.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => irParaPaciente(p.id)}
                  style={{
                    padding: "6px 12px", borderRadius: 999, border: "1px solid #d1d5db",
                    background: "#fff", cursor: "pointer", fontSize: 13, color: "#111827",
                  }}
                >
                  Paciente #{p.id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
