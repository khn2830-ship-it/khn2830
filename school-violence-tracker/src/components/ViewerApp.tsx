"use client";

import { useEffect, useRef, useState } from "react";
import { ROLE_OPTIONS, type RoleOption } from "@/lib/constants";
import type { Stage } from "@/lib/db";
import FlowChart from "./FlowChart";
import FaqList from "./FaqList";

interface StatusData {
  stage: Stage;
  nextDate: string | null;
  statusMessage: string;
  sessionSeconds: number;
}

const ROLE_STORAGE_KEY = "sv_viewer_role";

export default function ViewerApp() {
  const [caseCode, setCaseCode] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleOption>("victim");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const savedRole = sessionStorage.getItem(ROLE_STORAGE_KEY) as RoleOption | null;
    if (savedRole) setRole(savedRole);

    // 새로고침 등으로 재진입 시 기존 세션이 살아있는지 확인
    fetch("/api/status")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as StatusData;
        setStatus(data);
        setRemaining(data.sessionSeconds);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!status) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  function handleRoleChange(next: RoleOption) {
    setRole(next);
    sessionStorage.setItem(ROLE_STORAGE_KEY, next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirmed) {
      setError("본인 또는 보호자(해당 사안 관련자) 확인란에 체크해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseCode, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "조회에 실패했습니다.");
        return;
      }
      setStatus(data as StatusData);
      setRemaining(data.sessionSeconds);
      setPassword("");
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    setStatus(null);
    setCaseCode("");
  }

  if (status) {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">사안 진행상황</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              세션 종료까지 {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            <button onClick={handleLogout} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100">
              로그아웃
            </button>
          </div>
        </div>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">현재 단계</p>
          <p className="text-lg font-semibold text-blue-700">{status.stage}</p>
          <p className="mt-3 text-sm text-slate-500">다음 예정일</p>
          <p className="text-base">{status.nextDate ?? "예정된 일정이 없습니다."}</p>
          <p className="mt-3 text-sm text-slate-500">담당자 메시지</p>
          <p className="whitespace-pre-wrap text-base">{status.statusMessage || "등록된 메시지가 없습니다."}</p>
        </section>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">처리 절차 안내</h2>
          <FlowChart currentStage={status.stage} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">자주 묻는 질문</h2>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as RoleOption)}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <FaqList role={role} />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-1 text-xl font-bold">학교폭력 사안 진행상황 조회</h1>
      <p className="mb-6 text-sm text-slate-500">
        학교로부터 안내받은 사안번호와 조회 비밀번호를 입력해 주세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">사안번호</label>
          <input
            value={caseCode}
            onChange={(e) => setCaseCode(e.target.value)}
            maxLength={10}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="예: A3K7P9QZ"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">조회 비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">확인 유형 (FAQ 안내용)</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {ROLE_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="role"
                  checked={role === r.value}
                  onChange={() => handleRoleChange(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span>본인 또는 보호자(해당 사안 관련자)임을 확인합니다.</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "조회 중..." : "조회하기"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        <a href="/admin" className="hover:underline">
          관리자이신가요?
        </a>
      </p>
    </main>
  );
}
