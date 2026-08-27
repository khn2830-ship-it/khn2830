"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { STAGES } from "@/lib/constants";
import type { Stage } from "@/lib/db";
import MessageField from "@/components/MessageField";

interface CaseDetail {
  id: string;
  caseCode: string;
  stage: Stage;
  nextDate: string | null;
  statusMessage: string;
  retentionDays: number | null;
  closedAt: string | null;
  purgeAt: string | null;
}

export default function AdminCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [stage, setStage] = useState<Stage>("접수");
  const [nextDate, setNextDate] = useState("");
  const [message, setMessage] = useState("");
  const [retentionDays, setRetentionDays] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerated, setRegenerated] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/cases/${id}`)
      .then((r) => r.json())
      .then((d: CaseDetail) => {
        setData(d);
        setStage(d.stage);
        setNextDate(d.nextDate ?? "");
        setMessage(d.statusMessage ?? "");
        setRetentionDays(d.retentionDays != null ? String(d.retentionDays) : "");
      });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          nextDate: nextDate || null,
          statusMessage: message,
          retentionDays: retentionDays ? Number(retentionDays) : null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "저장에 실패했습니다.");
        return;
      }
      router.refresh();
      setError(null);
      alert("저장되었습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegeneratePassword() {
    if (!confirm("비밀번호를 재발급하면 기존 비밀번호는 즉시 무효화됩니다. 계속할까요?")) return;
    const res = await fetch(`/api/admin/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate-password" }),
    });
    const d = await res.json();
    if (res.ok) setRegenerated(d.password);
  }

  if (!data) return <p className="text-sm text-slate-500">불러오는 중...</p>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-lg font-bold">
        사안 상세 <span className="font-mono text-slate-500">{data.caseCode}</span>
      </h1>

      {regenerated && (
        <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
          <p className="mb-1 font-semibold text-emerald-800">새 비밀번호가 발급되었습니다. 지금 복사해 두세요.</p>
          <p className="font-mono font-bold">{regenerated}</p>
          <button
            onClick={() => setRegenerated(null)}
            className="mt-2 rounded border border-emerald-400 px-3 py-1 text-sm hover:bg-emerald-100"
          >
            확인했습니다
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
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

        {stage === "종결" && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              보존 기간(일) — 종결일로부터 이 기간이 지나면 자동 파기됩니다
            </label>
            <input
              type="number"
              min={1}
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="예: 365"
            />
          </div>
        )}

        {data.purgeAt && (
          <p className="text-xs text-slate-500">
            현재 파기 예정일: {new Date(data.purgeAt).toLocaleString()}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={handleRegeneratePassword}
            className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            비밀번호 재발급
          </button>
        </div>
      </form>
    </div>
  );
}
