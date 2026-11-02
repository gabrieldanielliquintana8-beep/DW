import crypto from "crypto";

export const COOKIE_NAME = "dw_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function signSession(email) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_DURATION_MS })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
