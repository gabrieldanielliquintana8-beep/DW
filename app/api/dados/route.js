import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { readTable } from "@/lib/sheets";

export async function GET() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ ok: false, erro: "Não autenticado" }, { status: 401 });
  }
  try {
    const data = await readTable();
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("Erro ao ler planilha:", err);
    return NextResponse.json({ ok: false, erro: "Erro ao ler dados" }, { status: 500 });
  }
}
