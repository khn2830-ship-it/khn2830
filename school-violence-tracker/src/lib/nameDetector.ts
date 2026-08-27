// 완벽한 필터가 아닌 "한 번 더 확인시키는" 안전장치 목적의 휴리스틱.
// 담당자가 진행 메시지에 사람 이름처럼 보이는 텍스트를 넣으면 경고만 띄우고,
// 저장 자체를 막지는 않는다(담당자 판단 존중).

const COMMON_SURNAMES = [
  "김","이","박","최","정","강","조","윤","장","임",
  "한","오","서","신","권","황","안","송","전","홍",
  "유","고","문","양","손","배","백","허","남","심",
  "노","하","곽","성","차","주","우","구","민","진",
];

const HANGUL = /[가-힣]/;

export interface NameDetectionResult {
  suspicious: boolean;
  matches: string[];
}

export function detectPossibleName(text: string): NameDetectionResult {
  const matches = new Set<string>();

  // 1) "성씨 + 1~2글자" 패턴
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (!COMMON_SURNAMES.includes(ch)) continue;
    for (const len of [3, 2]) {
      const candidate = text.slice(i, i + len);
      if (candidate.length === len && [...candidate].every((c) => HANGUL.test(c))) {
        matches.add(candidate);
        break;
      }
    }
  }

  // 2) "OO학생 / OO군 / OO양 / OO님" 같은 호칭 접미사 패턴
  const suffixPattern = /[가-힣]{2,3}(?=(학생|군|양|님))/g;
  let m: RegExpExecArray | null;
  while ((m = suffixPattern.exec(text)) !== null) {
    matches.add(m[0]);
  }

  return { suspicious: matches.size > 0, matches: [...matches] };
}
