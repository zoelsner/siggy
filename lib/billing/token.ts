function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

type AccessClaims = {
  sid: string;
  iat: number;
  v: 1;
};

export async function signAccessToken(sessionId: string): Promise<string> {
  const secret = process.env.SIGGY_TOKEN_SECRET;
  if (!secret) throw new Error("SIGGY_TOKEN_SECRET not configured");

  const claims: AccessClaims = { sid: sessionId, iat: Math.floor(Date.now() / 1000), v: 1 };
  const payload = base64url(new TextEncoder().encode(JSON.stringify(claims)));
  const sig = base64url(await hmac(secret, payload));
  return `${payload}.${sig}`;
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  const secret = process.env.SIGGY_TOKEN_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expected = await hmac(secret, payload);
  let provided: Uint8Array;
  try {
    provided = fromBase64url(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, provided)) return null;

  try {
    const claims = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as AccessClaims;
    if (claims.v !== 1 || typeof claims.sid !== "string") return null;
    return claims;
  } catch {
    return null;
  }
}
