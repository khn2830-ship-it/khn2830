import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminSession";

// nonce 기반 strict-dynamic CSP는 Next.js가 미들웨어에서 만든 nonce를 자기 스크립트
// 태그에 자동으로 심어주는 동작에 의존하는데, Netlify의 Next.js 런타임(Edge Function
// → Function 경계)에서는 이 미들웨어發 요청 헤더가 렌더링 단계까지 전달되지 않아
// 모든 스크립트가 nonce 불일치로 막혀버렸다(운영에서 확인됨). 그래서 nonce는 쓰지 않고
// 'self'(외부 스크립트 출처 차단)만으로 스크립트를 제한한다.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi =
    pathname.startsWith("/api/admin") &&
    pathname !== "/api/admin/login" &&
    pathname !== "/api/admin/logout";

  if (isAdminPath || isAdminApi) {
    const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const authenticated = await verifyAdminSessionCookie(cookie);
    if (!authenticated) {
      if (isAdminApi) {
        return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", CSP);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
