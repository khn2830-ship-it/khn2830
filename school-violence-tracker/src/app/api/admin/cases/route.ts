import { NextRequest, NextResponse } from "next/server";
import { insertCase, listCases } from "@/lib/db";
import { generateCaseCode, generatePassword, hashPassword } from "@/lib/crypto";
import { isSameOrigin } from "@/lib/net";
import { STAGES } from "@/lib/constants";
import type { Stage } from "@/lib/db";
import { withErrorHandling } from "@/lib/apiError";

export const GET = withErrorHandling(async () => {
  const cases = await listCases();
  const sanitized = cases.map((c) => ({
    id: c.id,
    caseCode: c.case_code,
    stage: c.stage,
    nextDate: c.next_date,
    statusMessage: c.status_message,
    closedAt: c.closed_at,
    purgeAt: c.purge_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    locked: !!(c.locked_until && new Date(c.locked_until).getTime() > Date.now()),
  }));
  return NextResponse.json({ cases: sanitized });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!isSameOrigin(req.headers)) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }

  let body: { stage?: string; nextDate?: string | null; statusMessage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const stage = (body.stage ?? "접수") as Stage;
  if (!STAGES.includes(stage)) {
    return NextResponse.json({ error: "유효하지 않은 단계입니다." }, { status: 400 });
  }

  const caseCode = generateCaseCode();
  const rawPassword = generatePassword();
  const passwordHash = await hashPassword(rawPassword);

  const created = await insertCase({
    caseCode,
    passwordHash,
    stage,
    nextDate: body.nextDate ?? null,
    statusMessage: body.statusMessage ?? "",
  });

  // 평문 비밀번호는 응답 시 단 1회만 노출하고 서버에는 해시만 남는다.
  return NextResponse.json({
    id: created.id,
    caseCode: created.case_code,
    password: rawPassword,
  });
});
