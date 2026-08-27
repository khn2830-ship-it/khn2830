import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminSession";

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  // 개발 모드에서는 Next.js HMR(webpack eval devtool)이 동작하려면 'unsafe-eval'이 필요하다.
  // 운영 빌드에서는 nonce + strict-dynamic만 사용한다.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

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

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // CDN/엣지가 이 응답(HTML)을 캐싱하면, 헤더의 nonce와 HTML에 박힌 nonce가 서로 다른
  // 요청의 것으로 어긋나 CSP가 모든 스크립트를 막아버린다. 페이지 캐싱을 금지해 항상
  // 같은 요청에서 나온 헤더/본문 쌍이 함께 쓰이도록 한다.
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
