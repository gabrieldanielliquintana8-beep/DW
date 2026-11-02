import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { signSession, COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/session";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request) {
  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ ok: false, erro: "Token ausente" }, { status: 400 });
    }
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    if (!email || !payload.email_verified) {
      return NextResponse.json({ ok: false, erro: "E-mail não verificado" }, { status: 401 });
    }
    const permitidos = (process.env.EMAILS_PERMITIDOS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!permitidos.includes(email)) {
      return NextResponse.json({ ok: false, erro: "E-mail não autorizado" }, { status: 403 });
    }
    const token = signSession(email);
    const response = NextResponse.json({ ok: true, email });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Erro no login:", err);
    return NextResponse.json({ ok: false, erro: "Falha na autenticação" }, { status: 401 });
  }
}
