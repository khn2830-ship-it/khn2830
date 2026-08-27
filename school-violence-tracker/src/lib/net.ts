// IP는 "필요 최소한만" 저장한다는 원칙에 따라 마지막 옥텟/그룹을 마스킹한다.
export function maskIp(rawIp: string | null | undefined): string {
  if (!rawIp) return "unknown";
  const ip = rawIp.trim();
  if (ip.includes(":")) {
    // IPv6: 앞 4개 그룹만 남긴다 (/64 상당)
    const groups = ip.split(":");
    return groups.slice(0, 4).join(":") + "::/64";
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return "unknown";
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const host = headers.get("host");
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
