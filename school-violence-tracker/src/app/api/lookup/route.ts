import { NextRequest, NextResponse } from "next/server";
import {
  getCaseByCode,
  logAttempt,
  countRecentFailuresByIp,
  recordFailure,
  resetFailures,
} from "@/lib/db";
import { verifyPassword, verifyAgainstDummy } from "@/lib/crypto";
import { createViewerSessionCookie, VIEWER_COOKIE_NAME, VIEWER_SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { getClientIp, maskIp } from "@/lib/net";
import {
  LOGIN_FAIL_LIMIT,
  LOGIN_LOCK_MINUTES,
  IP_FAIL_LIMIT,
  IP_FAIL_WINDOW_MINUTES,
} from "@/lib/constants";
import { withErrorHandling } from "@/lib/apiError";

const GENERIC_ERROR = "사안번호 또는 비밀번호가 올바르지 않습니다.";

export const POST = withErrorHandling(async (req: NextRequest) => {
  let body: { caseCode?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const caseCode = (body.caseCode ?? "").trim().toUpperCase();
  const password = body.password ?? "";

  if (!/^[A-Z0-9]{6,10}$/.test(caseCode) || password.length < 4 || password.length > 64) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const ipMasked = maskIp(getClientIp(req.headers));

  const recentFailures = await countRecentFailuresByIp(ipMasked, IP_FAIL_WINDOW_MINUTES);
  if (recentFailures >= IP_FAIL_LIMIT) {
    return NextResponse.json(
      { error: "너무 많은 조회 시도가 있었습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const caseRow = await getCaseByCode(caseCode);

  if (!caseRow) {
    await verifyAgainstDummy(password);
    await logAttempt({ caseCode, result: "fail", ipMasked });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (caseRow.locked_until && new Date(caseRow.locked_until).getTime() > Date.now()) {
    await logAttempt({ caseCode, result: "locked", ipMasked });
    return NextResponse.json(
      { error: `조회 실패 횟수가 초과되어 일시적으로 잠겼습니다. 약 ${LOGIN_LOCK_MINUTES}분 후 다시 시도해 주세요.` },
      { status: 423 }
    );
  }

  const passwordOk = await verifyPassword(password, caseRow.password_hash);

  if (!passwordOk) {
    const nextFailCount = caseRow.fail_count + 1;
    const shouldLock = nextFailCount >= LOGIN_FAIL_LIMIT;
    const lockUntil = shouldLock ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000) : null;
    await recordFailure(caseRow.id, shouldLock, lockUntil);
    await logAttempt({ caseCode, result: shouldLock ? "locked" : "fail", ipMasked });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await resetFailures(caseRow.id);
  await logAttempt({ caseCode, result: "success", ipMasked });

  const cookieValue = createViewerSessionCookie(caseRow.id, caseRow.case_code);
  const res = NextResponse.json({
    stage: caseRow.stage,
    nextDate: caseRow.next_date,
    statusMessage: caseRow.status_message,
    sessionSeconds: VIEWER_SESSION_MAX_AGE_SECONDS,
  });
  res.cookies.set(VIEWER_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: VIEWER_SESSION_MAX_AGE_SECONDS,
  });
  return res;
});
