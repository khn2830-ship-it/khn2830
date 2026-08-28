import bcrypt from "bcryptjs";
import { getAdminPasswordHash } from "./db";

// DB에 저장된 관리자 비밀번호 해시가 있으면 그것을, 없으면(최초 부트스트랩)
// ADMIN_PASSWORD 환경변수를 비교 대상으로 사용한다.
export async function verifyAdminPassword(plain: string): Promise<boolean> {
  const storedHash = await getAdminPasswordHash();
  if (storedHash) {
    return bcrypt.compare(plain, storedHash);
  }
  const bootstrapPassword = process.env.ADMIN_PASSWORD;
  if (!bootstrapPassword) return false;
  return timingSafeStringEqual(plain, bootstrapPassword);
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}
