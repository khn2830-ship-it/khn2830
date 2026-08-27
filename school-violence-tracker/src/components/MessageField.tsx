"use client";

import { useMemo } from "react";
import { detectPossibleName } from "@/lib/nameDetector";

export default function MessageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const detection = useMemo(() => detectPossibleName(value), [value]);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">진행 메시지</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={1000}
        className="w-full rounded border border-slate-300 px-3 py-2"
        placeholder="조회자에게 안내할 진행 상황 메시지를 입력하세요. (구체적 조사 내용/증거는 입력하지 마세요)"
      />
      {detection.suspicious && (
        <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
          ⚠ &ldquo;{detection.matches.join(", ")}&rdquo; 등 사람 이름처럼 보이는 텍스트가 포함된 것 같습니다.
          학생을 특정할 수 있는 표현은 저장하지 않도록 다시 확인해 주세요. (자동 필터가 아니므로 최종 판단은 직접
          해주세요)
        </p>
      )}
    </div>
  );
}
