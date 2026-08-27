import { NextResponse } from "next/server";
import { VIEWER_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
