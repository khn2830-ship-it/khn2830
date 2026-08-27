import { NextRequest, NextResponse } from "next/server";
import { listRecentAttempts } from "@/lib/db";
import { withErrorHandling } from "@/lib/apiError";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const caseCode = req.nextUrl.searchParams.get("caseCode")?.trim().toUpperCase() || undefined;
  const attempts = await listRecentAttempts(200, caseCode);
  return NextResponse.json({ attempts });
});
