import { NextResponse } from "next/server";
import { appendRow } from "@/lib/sheets";
import { anonimizar } from "@/lib/anonimizar";

export async function POST(request) {
  try {
    const body = await request.json();
    const { nome, email, mensagem } = body;

    if (!nome || !email) {
      return NextResponse.json(
        { ok: false, erro: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    const nomeAnonimo = anonimizar(nome);
    const emailAnonimo = anonimizar(email);
    const mensagemAnonima = anonimizar(mensagem);

    const timestamp = new Date().toISOString();
    await appendRow([timestamp, nomeAnonimo, emailAnonimo, mensagemAnonima]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao salvar:", err);
    return NextResponse.json(
      { ok: false, erro: "Erro interno ao salvar" },
      { status: 500 }
    );
  }
}
