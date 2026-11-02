import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { updatePatientEdits } from "@/lib/sheets";

export async function POST(request) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ ok: false, erro: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { patientId, spreadsheetRow, edits } = body;

    if (
      !patientId ||
      !spreadsheetRow ||
      !Array.isArray(edits) ||
      edits.length === 0
    ) {
      return NextResponse.json(
        { ok: false, erro: "Dados inválidos" },
        { status: 400 }
      );
    }

    const result = await updatePatientEdits({
      patientId,
      spreadsheetRow,
      edits,
      userEmail: session.email,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Erro ao atualizar:", err);
    return NextResponse.json(
      { ok: false, erro: err.message || "Erro ao salvar" },
      { status: 500 }
    );
  }
}
