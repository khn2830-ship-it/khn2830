import { NextRequest, NextResponse } from "next/server";
import { countRecentFailuresByIp, logAttempt } from "@/lib/db";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { createAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/adminSession";
import { getClientIp, maskIp } from "@/lib/net";
import { withErrorHandling } from "@/lib/apiError";
import {
  ADMIN_LOGIN_LOG_CODE,
  ADMIN_LOGIN_FAIL_LIMIT,
  ADMIN_LOGIN_FAIL_WINDOW_MINUTES,
  ADMIN_LOGIN_LOCK_MINUTES,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/constants";

export const POST = withErrorHandling(async (req: NextRequest) => {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const password = body.password ?? "";
  const ipMasked = maskIp(getClientIp(req.headers));

  const recentFailures = await countRecentFailuresByIp(ipMasked, ADMIN_LOGIN_FAIL_WINDOW_MINUTES);
  if (recentFailures >= ADMIN_LOGIN_FAIL_LIMIT) {
    return NextResponse.json(
      { error: `로그인 실패 횟수가 초과되어 일시적으로 잠겼습니다. 약 ${ADMIN_LOGIN_LOCK_MINUTES}분 후 다시 시도해 주세요.` },
      { status: 423 }
    );
  }

  const ok = await verifyAdminPassword(password);
  if (!ok) {
    await logAttempt({ caseCode: ADMIN_LOGIN_LOG_CODE, result: "fail", ipMasked });
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await logAttempt({ caseCode: ADMIN_LOGIN_LOG_CODE, result: "success", ipMasked });

  const cookieValue = await createAdminSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return res;
});
