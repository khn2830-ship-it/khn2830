-- 학교폭력 사안 진행상황 조회 앱 스키마
-- 원칙: 학생을 특정할 수 있는 필드(이름/학번/반/성별 등)는 절대 포함하지 않는다.

create extension if not exists pgcrypto;

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  case_code varchar(8) not null unique,
  password_hash text not null,
  password_set_at timestamptz not null default now(),
  stage text not null default '접수'
    check (stage in ('접수','조사중','자체해결검토','심의위회부','심의위개최예정','조치결정','종결')),
  next_date date,
  status_message text not null default '',
  message_updated_at timestamptz,
  fail_count int not null default 0,
  locked_until timestamptz,
  closed_at timestamptz,
  retention_days int,
  purge_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_case_code on cases (case_code);
create index if not exists idx_cases_purge_at on cases (purge_at) where purge_at is not null;

-- 조회 시도 로그: 사안번호는 남기되 IP는 최소한(마스킹)만 저장한다.
create table if not exists access_attempts (
  id bigserial primary key,
  case_code varchar(8) not null,
  result text not null check (result in ('success','fail','locked')),
  ip_masked text,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_access_attempts_case_code on access_attempts (case_code);
create index if not exists idx_access_attempts_attempted_at on access_attempts (attempted_at);
create index if not exists idx_access_attempts_ip_time on access_attempts (ip_masked, attempted_at);

-- 파기 배치 실행 기록 (사안번호 자체는 남기지 않는다)
create table if not exists purge_log (
  id bigserial primary key,
  executed_at timestamptz not null default now(),
  purged_count int not null default 0
);

-- 관리자 비밀번호(해시). 단일 관리자 계정을 전제로 한 1행짜리 테이블.
-- 이 행이 없으면 로그인 시 ADMIN_PASSWORD 환경변수(부트스트랩 값)를 사용한다.
create table if not exists admin_credentials (
  id smallint primary key default 1,
  password_hash text not null,
  updated_at timestamptz not null default now(),
  check (id = 1)
);

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cases_updated_at on cases;
create trigger trg_cases_updated_at
  before update on cases
  for each row execute function set_updated_at();
