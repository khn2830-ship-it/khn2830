import { NextRequest, NextResponse } from "next/server";
import { getCaseById, updateCaseProgress, updateCasePassword } from "@/lib/db";
import { generatePassword, hashPassword } from "@/lib/crypto";
import { isSameOrigin } from "@/lib/net";
import { STAGES } from "@/lib/constants";
import type { Stage } from "@/lib/db";
import { withErrorHandling } from "@/lib/apiError";

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const c = await getCaseById(params.id);
  if (!c) return NextResponse.json({ error: "사안을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({
    id: c.id,
    caseCode: c.case_code,
    stage: c.stage,
    nextDate: c.next_date,
    statusMessage: c.status_message,
    retentionDays: c.retention_days,
    closedAt: c.closed_at,
    purgeAt: c.purge_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!isSameOrigin(req.headers)) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }

  const existing = await getCaseById(params.id);
  if (!existing) return NextResponse.json({ error: "사안을 찾을 수 없습니다." }, { status: 404 });

  let body: {
    action?: string;
    stage?: string;
    nextDate?: string | null;
    statusMessage?: string;
    retentionDays?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (body.action === "regenerate-password") {
    const rawPassword = generatePassword();
    const hash = await hashPassword(rawPassword);
    await updateCasePassword(params.id, hash);
    return NextResponse.json({ password: rawPassword });
  }

  const stage = (body.stage ?? existing.stage) as Stage;
  if (!STAGES.includes(stage)) {
    return NextResponse.json({ error: "유효하지 않은 단계입니다." }, { status: 400 });
  }

  if (stage === "종결" && (body.retentionDays == null || body.retentionDays <= 0)) {
    return NextResponse.json(
      { error: "종결 처리 시 보존 기간(일)을 지정해야 자동 파기 예정일이 계산됩니다." },
      { status: 400 }
    );
  }

  const updated = await updateCaseProgress({
    id: params.id,
    stage,
    nextDate: body.nextDate ?? null,
    statusMessage: body.statusMessage ?? "",
    retentionDays: body.retentionDays ?? null,
  });

  return NextResponse.json({
    id: updated.id,
    caseCode: updated.case_code,
    stage: updated.stage,
    nextDate: updated.next_date,
    statusMessage: updated.status_message,
    closedAt: updated.closed_at,
    purgeAt: updated.purge_at,
  });
});
