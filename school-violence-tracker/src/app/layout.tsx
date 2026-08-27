import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "학교폭력 사안 진행상황 조회",
  description: "사안번호로 진행상황을 조회하는 내부용 시스템",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
