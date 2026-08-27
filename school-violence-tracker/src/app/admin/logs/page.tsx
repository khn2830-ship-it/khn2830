"use client";

import { useEffect, useState } from "react";

interface Attempt {
  id: number;
  case_code: string;
  result: "success" | "fail" | "locked";
  ip_masked: string;
  attempted_at: string;
}

const RESULT_LABEL: Record<Attempt["result"], string> = {
  success: "성공",
  fail: "실패",
  locked: "잠금",
};

export default function AdminLogsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [caseCode, setCaseCode] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(filter?: string) {
    setLoading(true);
    const url = filter ? `/api/admin/logs?caseCode=${encodeURIComponent(filter)}` : "/api/admin/logs";
    const res = await fetch(url);
    const data = await res.json();
    setAttempts(data.attempts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">조회 시도 로그</h1>
      <div className="mb-4 flex gap-2">
        <input
          value={caseCode}
          onChange={(e) => setCaseCode(e.target.value)}
          placeholder="사안번호로 필터링"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => load(caseCode || undefined)}
          className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          검색
        </button>
        <button
          onClick={() => {
            setCaseCode("");
            load();
          }}
          className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          초기화
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">사안번호</th>
                <th className="px-3 py-2">결과</th>
                <th className="px-3 py-2">IP(마스킹)</th>
                <th className="px-3 py-2">시각</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{a.case_code}</td>
                  <td className="px-3 py-2">{RESULT_LABEL[a.result]}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{a.ip_masked}</td>
                  <td className="px-3 py-2">{new Date(a.attempted_at).toLocaleString()}</td>
                </tr>
              ))}
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
