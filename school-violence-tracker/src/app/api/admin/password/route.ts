import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setAdminPasswordHash } from "@/lib/db";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { isSameOrigin } from "@/lib/net";
import { withErrorHandling } from "@/lib/apiError";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/constants";

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  if (!isSameOrigin(req.headers)) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  const currentOk = await verifyAdminPassword(currentPassword);
  if (!currentOk) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (newPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { error: `새 비밀번호는 ${ADMIN_PASSWORD_MIN_LENGTH}자 이상이어야 합니다.` },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await setAdminPasswordHash(hash);

  return NextResponse.json({ ok: true });
});
