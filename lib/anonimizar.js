import crypto from "crypto";

export function anonimizar(valor) {
  if (!valor) return "";
  return crypto
    .createHmac("sha256", process.env.ANONYMIZATION_SECRET)
    .update(String(valor).trim().toLowerCase())
    .digest("hex");
}
