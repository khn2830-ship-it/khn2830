import type { Stage } from "./db";

export const STAGES: Stage[] = [
  "접수",
  "조사중",
  "자체해결검토",
  "심의위회부",
  "심의위개최예정",
  "조치결정",
  "종결",
];

// 조회자 화면에 노출되는 고정 절차 흐름도 (모든 사안 공통, 사안마다 달라지지 않음)
export const FLOW_STEPS: { stage: Stage; label: string; description: string }[] = [
  { stage: "접수", label: "접수", description: "학교폭력 사안이 접수되어 처리 절차가 시작됩니다." },
  { stage: "조사중", label: "조사중", description: "담당자가 사실관계를 확인하고 조사를 진행합니다." },
  { stage: "자체해결검토", label: "자체해결 검토", description: "법령상 자체해결 요건 충족 여부를 검토합니다." },
  { stage: "심의위회부", label: "심의위원회 회부", description: "학교폭력대책심의위원회에 사안이 회부됩니다." },
  { stage: "심의위개최예정", label: "심의위원회 개최 예정", description: "심의위원회 개최 일정이 예정되어 있습니다." },
  { stage: "조치결정", label: "조치 결정", description: "심의위원회 결정에 따른 조치가 결정 및 통보됩니다." },
  { stage: "종결", label: "종결", description: "조치 이행이 확인되어 사안이 종결됩니다." },
];

export const ROLE_OPTIONS = [
  { value: "victim", label: "피해측" },
  { value: "offender", label: "가해측" },
  { value: "homeroom", label: "담임교사" },
] as const;

export type RoleOption = (typeof ROLE_OPTIONS)[number]["value"];

export const LOGIN_FAIL_LIMIT = 5;
export const LOGIN_LOCK_MINUTES = 15;
export const IP_FAIL_LIMIT = 20;
export const IP_FAIL_WINDOW_MINUTES = 10;

// 관리자 로그인 시도 기록용. access_attempts.case_code는 varchar(8)이므로 8자 고정.
export const ADMIN_LOGIN_LOG_CODE = "ADMINLGN";
export const ADMIN_LOGIN_FAIL_LIMIT = 5;
export const ADMIN_LOGIN_FAIL_WINDOW_MINUTES = 15;
export const ADMIN_LOGIN_LOCK_MINUTES = 15;
export const ADMIN_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12시간
