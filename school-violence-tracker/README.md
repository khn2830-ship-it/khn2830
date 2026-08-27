# 학교폭력 사안 진행상황 조회 시스템 (MVP)

사안번호만으로 진행상황을 조회하는 내부용 웹앱입니다. 학생 이름·학번·반·성별 등
개인을 특정할 수 있는 필드는 데이터베이스에 존재하지 않으며, 진술서·증거자료 등
구체적 조사 내용도 저장하지 않습니다.

> **중요**: 이 프로젝트는 Netlify(무료/개인 계정)와 Supabase(무료 티어)를 전제로 한
> MVP입니다. 학교 정식 서비스로 배포하기 전에 반드시 학교 관리자 및 교육청의
> 승인을 받아야 합니다. 무료/개인 계정 기반 인프라이므로 정식 운영 인프라로
> 전환이 필요한지 담당 부서와 반드시 협의하세요.

> **관리자 인증에 대해**: 지금은 관리자 화면에 "비밀번호 1개"로 로그인합니다.
> 담당자가 바뀌거나 인원이 늘어나면 개인별 계정 구분이 필요해지므로, 이후에는
> Google Workspace 계정 연동(개인별 로그인) 방식으로 업그레이드하는 것을
> 권장합니다.

## 기술 스택

- **Next.js 14 (App Router)** — 프론트엔드 + API Routes(서버리스 백엔드)
- **Supabase (Postgres)** — 사안/로그 데이터 저장
- **Netlify** — 배포 + Netlify Scheduled Functions(자동 파기 배치)

## 로컬 개발 준비

```bash
npm install
cp .env.example .env.local
```

`.env.local`에 아래 값을 채워주세요.

1. **DATABASE_URL**: Supabase 프로젝트 생성 후 `supabase/schema.sql`을 SQL Editor에서
   실행하고, Connection Pooling(Transaction 모드) URI를 복사해 넣습니다.
2. **ADMIN_PASSWORD**: 관리자 로그인용 비밀번호. 담당자만 아는 랜덤한 문자열로
   정해주세요.
3. **ADMIN_SESSION_SECRET / SESSION_SECRET**: 각각 랜덤 문자열로 채웁니다.
   (`openssl rand -base64 32` 등으로 생성, 서로 다른 값이어야 합니다)

```bash
npm run dev
```

## 배포 (Netlify)

1. GitHub 저장소에 푸시 후 Netlify에서 "Import an existing project"로 연결
2. Netlify가 `netlify.toml`을 인식해 `@netlify/plugin-nextjs`로 자동 빌드합니다.
3. 위 환경변수(DATABASE_URL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, SESSION_SECRET)를
   Netlify 사이트 설정 > Environment variables에 동일하게 등록합니다.
4. `netlify/functions/purge-cron.mts`가 Netlify Scheduled Function으로 자동
   등록되어 매일 자동 파기 배치가 실행됩니다. (Netlify 스케줄러만 호출할 수 있어
   별도 인증 비밀키가 필요 없습니다)
5. `public/robots.txt`가 `Disallow: /`로 설정되어 있어 검색엔진 색인을 차단합니다.
   Netlify는 기본적으로 HTTPS를 강제합니다.

## 데이터 모델 요약

- `cases`: 사안번호, 비밀번호 해시, 현재 단계, 다음 예정일, 진행 메시지, 실패횟수/잠금,
  종결일, 보존기간, 파기예정일만 저장 (`supabase/schema.sql` 참고)
- `access_attempts`: 조회 시도 로그(사안번호, 성공/실패/잠금, 마스킹된 IP, 시각).
  관리자 로그인 시도도 `ADMINLGN`이라는 고정 코드로 같은 표에 기록되어, 조회
  브루트포스와 동일한 IP 기반 잠금 로직을 공유합니다.
- `purge_log`: 파기 배치 실행 이력(건수만, 사안번호는 남기지 않음)

## MVP 범위 밖 (2차 과제)

- 관리자 개인별 계정 구분(현재는 비밀번호 1개를 공유) — Google 로그인 연동 권장
- 관리자 작업 상세 감사로그(누가 언제 어떤 필드를 바꿨는지)
- 비밀번호 분실 시 알림 자동 발송(문자/이메일)
- 통계 대시보드

## 유의사항

- 이 앱의 "자동 파기"는 조회용 요약 정보에만 적용됩니다. 학교폭력 사안의 공식 기록
  (나이스, 사안조사보고서 등)은 별도 시스템/문서로 법정 보존기간 동안 유지되어야
  하며, 이 앱의 파기가 그 의무를 대체하지 않습니다.
- 사안번호·비밀번호는 문자·카톡·서면 등 안전한 채널로 개별 전달하고, 이메일 평문
  전달은 지양해 주세요.
- 관리자 비밀번호는 담당자 간에만 구두/문자로 공유하고, 유출이 의심되면 즉시
  `ADMIN_PASSWORD` 값을 바꿔 배포하세요(변경 즉시 기존 세션도 유효하지만, 다음
  로그인부터 새 비밀번호가 적용됩니다).
- FAQ 문구(`src/lib/faq.ts`)는 자리표시 데이터입니다. 실제 문구로 교체해 주세요.
