import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminSession";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  const authenticated = await verifyAdminSessionCookie(cookie);

  return (
    <div className="min-h-screen">
      {authenticated && (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link href="/admin/cases">사안 관리</Link>
              <Link href="/admin/logs">조회 로그</Link>
              <Link href="/admin/settings">설정</Link>
            </nav>
            <LogoutButton />
          </div>
        </header>
      )}
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
