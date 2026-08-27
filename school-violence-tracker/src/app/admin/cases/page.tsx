"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STAGES } from "@/lib/constants";
import type { Stage } from "@/lib/db";
import MessageField from "@/components/MessageField";

interface CaseListItem {
  id: string;
  caseCode: string;
  stage: Stage;
  nextDate: string | null;
  statusMessage: string;
  closedAt: string | null;
  purgeAt: string | null;
  updatedAt: string;
  locked: boolean;
}

export default function AdminCasesPage() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stage, setStage] = useState<Stage>("접수");
  const [nextDate, setNextDate] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<{ caseCode: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCases() {
    setLoading(true);
    const res = await fetch("/api/admin/cases");
    const data = await res.json();
    setCases(data.cases ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCases();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, nextDate: nextDate || null, statusMessage: message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setIssued({ caseCode: data.caseCode, password: data.password });
      setShowForm(false);
      setStage("접수");
      setNextDate("");
      setMessage("");
      await loadCases();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">사안 목록</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "취소" : "새 사안 등록"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">현재 단계</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">다음 예정일</label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <MessageField value={message} onChange={setMessage} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "등록 중..." : "등록"}
          </button>
        </form>
      )}

      {issued && (
        <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
          <p className="mb-2 font-semibold text-emerald-800">
            사안이 등록되었습니다. 아래 정보는 이 화면에서만 확인할 수 있으니 지금 복사해 두세요.
          </p>
          <p className="text-sm">
            사안번호: <span className="font-mono font-bold">{issued.caseCode}</span>
          </p>
          <p className="text-sm">
            조회 비밀번호: <span className="font-mono font-bold">{issued.password}</span>
          </p>
          <button
            onClick={() => setIssued(null)}
            className="mt-3 rounded border border-emerald-400 px-3 py-1 text-sm hover:bg-emerald-100"
          >
            확인했습니다
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">사안번호</th>
                <th className="px-3 py-2">단계</th>
                <th className="px-3 py-2">다음 예정일</th>
                <th className="px-3 py-2">잠금</th>
                <th className="px-3 py-2">파기 예정</th>
                <th className="px-3 py-2">수정</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{c.caseCode}</td>
                  <td className="px-3 py-2">{c.stage}</td>
                  <td className="px-3 py-2">{c.nextDate ?? "-"}</td>
                  <td className="px-3 py-2">{c.locked ? "🔒 잠김" : "-"}</td>
                  <td className="px-3 py-2">{c.purgeAt ? new Date(c.purgeAt).toLocaleDateString() : "-"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/cases/${c.id}`} className="text-blue-600 hover:underline">
                      상세/수정
                    </Link>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    등록된 사안이 없습니다.
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
