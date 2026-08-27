import crypto from "crypto";

const SESSION_TTL_MS = 10 * 60 * 1000; // 10분
export const VIEWER_COOKIE_NAME = "vw_sess";

interface SessionPayload {
  caseId: string;
  caseCode: string;
  exp: number; // epoch ms
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET 환경변수가 설정되어 있지 않습니다.");
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createViewerSessionCookie(caseId: string, caseCode: string): string {
  const payload: SessionPayload = { caseId, caseCode, exp: Date.now() + SESSION_TTL_MS };
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(json);
  return `${json}.${sig}`;
}

export function verifyViewerSessionCookie(value: string | undefined | null): SessionPayload | null {
  if (!value) return null;
  const [json, sig] = value.split(".");
  if (!json || !sig) return null;
  const expected = sign(json);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const VIEWER_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
