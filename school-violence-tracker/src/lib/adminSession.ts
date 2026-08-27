import { ADMIN_SESSION_MAX_AGE_SECONDS } from "./constants";

// middleware.ts(Edge 런타임)에서도 호출되므로 Node의 'crypto' 모듈 대신
// 표준 Web Crypto API(globalThis.crypto.subtle)만 사용한다.

export const ADMIN_COOKIE_NAME = "admin_sess";

interface AdminSessionPayload {
  role: "admin";
  exp: number; // epoch ms
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET 환경변수가 설정되어 있지 않습니다.");
  return secret;
}

async function importKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(getSecret()) as BufferSource;
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const bin = String.fromCharCode(...arr);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(str.length / 4) * 4, "=");
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function createAdminSessionCookie(): Promise<string> {
  const payload: AdminSessionPayload = {
    role: "admin",
    exp: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const json = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(json) as BufferSource);
  return `${json}.${toBase64Url(sig)}`;
}

export async function verifyAdminSessionCookie(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const [json, sig] = value.split(".");
  if (!json || !sig) return false;

  try {
    const key = await importKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sig) as BufferSource,
      new TextEncoder().encode(json) as BufferSource
    );
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(json))) as AdminSessionPayload;
    return payload.role === "admin" && typeof payload.exp === "number" && payload.exp >= Date.now();
  } catch {
    return false;
  }
}
