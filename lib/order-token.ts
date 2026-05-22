import crypto from "crypto";

/**
 * Token de orden firmado (HMAC). Se genera en /api/checkout y viaja en una
 * cookie httpOnly. La página de gracias lo verifica: solo quien inició el
 * checkout (y por tanto el pago) tiene una cookie con firma válida — nadie
 * puede falsificarla sin el secreto.
 */
const SECRET = process.env.ORDER_TOKEN_SECRET ?? "dev-secret-cambiar-en-produccion";

export function signOrderToken(orderId: string): string {
  const sig = crypto.createHmac("sha256", SECRET).update(orderId).digest("hex");
  return `${orderId}.${sig}`;
}

export function verifyOrderToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [orderId, sig] = token.split(".");
  if (!orderId || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(orderId).digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return orderId;
}
