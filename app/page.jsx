"use client";
import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({ nome: "", email: "", mensagem: "" });
  const [status, setStatus] = useState("idle");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("enviando");
    const res = await fetch("/api/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setStatus(data.ok ? "ok" : "erro");
    if (data.ok) setForm({ nome: "", email: "", mensagem: "" });
  }

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Cadastro Seguro</h1>
      <p style={{ fontSize: 14, color: "#555" }}>
        Seus dados são anonimizados no servidor antes de serem armazenados.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} required />
        <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handleChange} required />
        <textarea name="mensagem" placeholder="Mensagem (opcional)" value={form.mensagem} onChange={handleChange} rows={4} />
        <button type="submit" disabled={status === "enviando"}>
          {status === "enviando" ? "Enviando..." : "Enviar"}
        </button>
      </form>
      {status === "ok" && <p style={{ color: "green" }}>Salvo com sucesso! Seus dados foram anonimizados.</p>}
      {status === "erro" && <p style={{ color: "red" }}>Erro ao salvar. Tente novamente.</p>}
    </main>
  );
}
