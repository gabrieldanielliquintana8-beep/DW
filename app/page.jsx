"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MANIFESTACOES, temManifestacao } from "@/lib/patients";

export default function Home() {
  const [state, setState] = useState("loading");
  const [data, setData] = useState(null);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

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

  const { patients } = data;
  const filtrados = busca
    ? patients.filter((p) => String(p.id).toLowerCase().includes(busca.toLowerCase()))
    : patients;

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Pacientes</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>
            {patients.length} registros · logado como {email}
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtrados.map((p) => {
          const sexo = p.values["Demograficos||Sexo"] || "";
          const idade = p.values["Demograficos||Idade_atual_anos"] || "";
          const etnia = p.values["Demograficos||Etnia"] || "";
          return (
            <Link key={p.id} href={`/paciente/${encodeURIComponent(p.id)}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, transform 0.15s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
                  e.currentTarget.style.transform = "translateY(0)";
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
                    return (
                      <span
                        key={m.key}
                        title={`${m.label}: ${ativo ? "presente" : "ausente"}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          fontSize: 16,
                          background: ativo ? `${m.color}22` : "#f3f4f6",
                          border: ativo ? `1px solid ${m.color}66` : "1px solid transparent",
                          opacity: ativo ? 1 : 0.35,
                          filter: ativo ? "none" : "grayscale(1)",
                        }}
                      >
                        {m.icon}
                      </span>
                    );
                  })}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <p style={{ marginTop: 40, color: "#999", textAlign: "center" }}>Nenhum paciente encontrado.</p>
      )}
    </main>
  );
}
