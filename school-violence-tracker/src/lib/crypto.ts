import crypto from "crypto";
import bcrypt from "bcryptjs";

// 사안번호용 문자셋: 대문자+숫자, 혼동되기 쉬운 0/O, 1/I 제외
const CASE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
// 조회 비밀번호용 문자셋: 소문자+숫자+특수문자 (사안번호와 다른 알파벳/다른 로직)
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789#%*+-";

// crypto.randomInt은 Node의 CSPRNG(균등분포 보장)를 사용한다.
function randomStringFromAlphabet(alphabet: string, length: number): string {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    const idx = crypto.randomInt(0, alphabet.length);
    result += alphabet[idx];
  }
  return result;
}

export function generateCaseCode(): string {
  return randomStringFromAlphabet(CASE_CODE_ALPHABET, 8);
}

export function generatePassword(): string {
  return randomStringFromAlphabet(PASSWORD_ALPHABET, 10);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// 존재하지 않는 사안번호 조회 시에도 타이밍 차이를 없애기 위한 더미 해시
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO2Y3qL8oQ8oX8oQ8oX8oQ8oX8oQ8oX8o";
export async function verifyAgainstDummy(plain: string): Promise<void> {
  try {
    await bcrypt.compare(plain, DUMMY_HASH);
  } catch {
    // 더미 비교이므로 결과 무관, 실패해도 무시
  }
}
