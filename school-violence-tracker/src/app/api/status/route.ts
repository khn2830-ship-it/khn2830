import { NextRequest, NextResponse } from "next/server";
import { getCaseById } from "@/lib/db";
import { verifyViewerSessionCookie, VIEWER_COOKIE_NAME } from "@/lib/session";
import { withErrorHandling } from "@/lib/apiError";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const cookie = req.cookies.get(VIEWER_COOKIE_NAME)?.value;
  const session = verifyViewerSessionCookie(cookie);
  if (!session) {
    return NextResponse.json({ error: "세션이 만료되었습니다. 다시 조회해 주세요." }, { status: 401 });
  }
  const caseRow = await getCaseById(session.caseId);
  if (!caseRow) {
    return NextResponse.json({ error: "사안 정보를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({
    stage: caseRow.stage,
    nextDate: caseRow.next_date,
    statusMessage: caseRow.status_message,
    sessionSeconds: Math.max(0, Math.round((session.exp - Date.now()) / 1000)),
  });
});
