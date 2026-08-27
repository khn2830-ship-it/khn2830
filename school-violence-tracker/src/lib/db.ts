import { Pool, types } from "pg";

// date(OID 1082)를 JS Date로 파싱하면 UTC 변환 과정에서 하루가 밀려 보일 수 있으므로
// 'YYYY-MM-DD' 문자열 그대로 사용한다.
types.setTypeParser(1082, (val) => val);

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }
  return global.__pgPool;
}

export const pool = getPool();

export type Stage =
  | "접수"
  | "조사중"
  | "자체해결검토"
  | "심의위회부"
  | "심의위개최예정"
  | "조치결정"
  | "종결";

export interface CaseRow {
  id: string;
  case_code: string;
  password_hash: string;
  password_set_at: string;
  stage: Stage;
  next_date: string | null;
  status_message: string;
  message_updated_at: string | null;
  fail_count: number;
  locked_until: string | null;
  closed_at: string | null;
  retention_days: number | null;
  purge_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCaseByCode(caseCode: string): Promise<CaseRow | null> {
  const { rows } = await pool.query<CaseRow>(
    "select * from cases where case_code = $1",
    [caseCode]
  );
  return rows[0] ?? null;
}

export async function getCaseById(id: string): Promise<CaseRow | null> {
  const { rows } = await pool.query<CaseRow>(
    "select * from cases where id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function listCases(): Promise<CaseRow[]> {
  const { rows } = await pool.query<CaseRow>(
    "select * from cases order by created_at desc"
  );
  return rows;
}

export async function insertCase(params: {
  caseCode: string;
  passwordHash: string;
  stage: Stage;
  nextDate: string | null;
  statusMessage: string;
}): Promise<CaseRow> {
  const { rows } = await pool.query<CaseRow>(
    `insert into cases (case_code, password_hash, stage, next_date, status_message, message_updated_at)
     values ($1, $2, $3, $4, $5, now())
     returning *`,
    [params.caseCode, params.passwordHash, params.stage, params.nextDate, params.statusMessage]
  );
  return rows[0];
}

export async function updateCaseProgress(params: {
  id: string;
  stage: Stage;
  nextDate: string | null;
  statusMessage: string;
  retentionDays: number | null;
}): Promise<CaseRow> {
  const isClosing = params.stage === "종결";
  const { rows } = await pool.query<CaseRow>(
    `update cases set
       stage = $2,
       next_date = $3,
       status_message = $4,
       message_updated_at = now(),
       retention_days = $5::int,
       closed_at = case when $6::boolean then coalesce(closed_at, now()) else null end,
       purge_at = case when $6::boolean and $5::int is not null
                    then coalesce(closed_at, now()) + make_interval(days => $5::int)
                  else null end
     where id = $1
     returning *`,
    [params.id, params.stage, params.nextDate, params.statusMessage, params.retentionDays, isClosing]
  );
  return rows[0];
}

export async function updateCasePassword(id: string, passwordHash: string): Promise<void> {
  await pool.query(
    `update cases set password_hash = $2, password_set_at = now(), fail_count = 0, locked_until = null
     where id = $1`,
    [id, passwordHash]
  );
}

export async function recordFailure(id: string, lock: boolean, lockUntil: Date | null): Promise<void> {
  if (lock) {
    await pool.query(
      "update cases set fail_count = fail_count + 1, locked_until = $2 where id = $1",
      [id, lockUntil]
    );
  } else {
    await pool.query(
      "update cases set fail_count = fail_count + 1 where id = $1",
      [id]
    );
  }
}

export async function resetFailures(id: string): Promise<void> {
  await pool.query(
    "update cases set fail_count = 0, locked_until = null where id = $1",
    [id]
  );
}

export async function logAttempt(params: {
  caseCode: string;
  result: "success" | "fail" | "locked";
  ipMasked: string;
}): Promise<void> {
  await pool.query(
    "insert into access_attempts (case_code, result, ip_masked) values ($1, $2, $3)",
    [params.caseCode, params.result, params.ipMasked]
  );
}

export async function countRecentFailuresByIp(ipMasked: string, windowMinutes: number): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*)::text as count from access_attempts
     where ip_masked = $1 and result = 'fail' and attempted_at > now() - ($2 || ' minutes')::interval`,
    [ipMasked, windowMinutes]
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

export async function listRecentAttempts(limit: number, caseCodeFilter?: string) {
  if (caseCodeFilter) {
    const { rows } = await pool.query(
      `select * from access_attempts where case_code = $1 order by attempted_at desc limit $2`,
      [caseCodeFilter, limit]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `select * from access_attempts order by attempted_at desc limit $1`,
    [limit]
  );
  return rows;
}

export async function purgeDueCases(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ case_code: string }>(
      "select case_code from cases where purge_at is not null and purge_at <= now()"
    );
    const codes = rows.map((r) => r.case_code);
    if (codes.length > 0) {
      await client.query("delete from access_attempts where case_code = any($1)", [codes]);
      await client.query(
        "delete from cases where purge_at is not null and purge_at <= now()"
      );
    }
    await client.query(
      "insert into purge_log (purged_count) values ($1)",
      [codes.length]
    );
    await client.query("commit");
    return codes.length;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
