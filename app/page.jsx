"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [state, setState] = useState("loading");
  const [email, setEmail] = useState("");
  const [data, setData] = useState(null);
  const [erro, setErro] = useState("");

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
        setData({ headers: json.headers, rows: json.rows });
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
    setEmail("");
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
        <button onClick={sair} style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}>
          Voltar
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Dados</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>Logado como {email}</p>
        </div>
        <button onClick={sair} style={{ padding: "8px 16px", cursor: "pointer" }}>Sair</button>
      </div>
      {!data || data.rows.length === 0 ? (
        <p>Nenhum dado disponível.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                {data.headers.map((h, i) => (
                  <th key={i} style={{ padding: "8px 12px", borderBottom: "1px solid #ddd" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  {data.headers.map((_, j) => (
                    <td key={j} style={{ padding: "8px 12px" }}>{row[j] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
