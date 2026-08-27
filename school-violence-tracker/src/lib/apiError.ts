import { NextResponse } from "next/server";

// API 라우트 핸들러를 감싸서, DB 연결 실패 등 예기치 못한 예외가
// Next.js의 기본 HTML 에러 페이지(비-JSON 응답)로 새어나가지 않고
// 항상 JSON 형태의 500 응답으로 내려가도록 한다.
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("API error:", err);
      return NextResponse.json(
        { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }
  };
}
