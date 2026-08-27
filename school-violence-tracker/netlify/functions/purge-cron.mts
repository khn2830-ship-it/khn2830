// Netlify Scheduled Function: 종결된 사안 중 보존기간이 지난 것을 매일 자동 파기한다.
// (Vercel Cron 대신 Netlify의 예약 함수를 사용 — 별도의 CRON_SECRET 없이
//  Netlify 스케줄러만 이 함수를 호출할 수 있다)
import { purgeDueCases } from "../../src/lib/db";

export default async () => {
  const purgedCount = await purgeDueCases();
  console.log(`[purge-cron] 파기된 사안 수: ${purgedCount}`);
};

export const config = {
  schedule: "0 18 * * *",
};
