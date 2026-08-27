import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/adminSession";
import { withErrorHandling } from "@/lib/apiError";

export const POST = withErrorHandling(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
});
