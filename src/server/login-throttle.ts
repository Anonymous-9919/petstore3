import "server-only";

import { createHash } from "crypto";

type Realm = "admin" | "customer";
type Attempt = { failures: number; resetAt: number };
type CheckResult = { allowed: true } | { allowed: false; retryAfter: number };

const WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LIMIT = 8;
const IP_LIMIT = 40;
const MAX_BUCKETS = 5_000;

export class LocalLoginThrottle {
  private readonly attempts = new Map<string, Attempt>();

  constructor(
    private readonly options = {
      windowMs: WINDOW_MS,
      accountLimit: ACCOUNT_LIMIT,
      ipLimit: IP_LIMIT,
      maxBuckets: MAX_BUCKETS,
    },
  ) {}

  check(realm: Realm, identifier: string, ip: string, now = Date.now()): CheckResult {
    this.prune(now);
    const blockedUntil = Math.max(
      this.blockedUntil(this.key(realm, "account", identifier), this.options.accountLimit, now),
      this.blockedUntil(this.key(realm, "ip", ip), this.options.ipLimit, now),
    );
    return blockedUntil > now
      ? { allowed: false, retryAfter: Math.max(1, Math.ceil((blockedUntil - now) / 1_000)) }
      : { allowed: true };
  }

  recordFailure(realm: Realm, identifier: string, ip: string, now = Date.now()) {
    this.increment(this.key(realm, "account", identifier), now);
    this.increment(this.key(realm, "ip", ip), now);
  }

  clearAccount(realm: Realm, identifier: string) {
    this.attempts.delete(this.key(realm, "account", identifier));
  }

  get size() {
    return this.attempts.size;
  }

  private key(realm: Realm, kind: "account" | "ip", value: string) {
    const digest = createHash("sha256").update(value).digest("base64url");
    return `${realm}:${kind}:${digest}`;
  }

  private blockedUntil(key: string, limit: number, now: number) {
    const attempt = this.attempts.get(key);
    if (!attempt || attempt.resetAt <= now || attempt.failures < limit) return 0;
    this.touch(key, attempt);
    return attempt.resetAt;
  }

  private increment(key: string, now: number) {
    const current = this.attempts.get(key);
    const attempt = !current || current.resetAt <= now
      ? { failures: 1, resetAt: now + this.options.windowMs }
      : { failures: current.failures + 1, resetAt: current.resetAt };
    if (!current) this.makeRoom();
    this.touch(key, attempt);
  }

  private touch(key: string, attempt: Attempt) {
    this.attempts.delete(key);
    this.attempts.set(key, attempt);
  }

  private prune(now: number) {
    for (const [key, attempt] of this.attempts) {
      if (attempt.resetAt <= now) this.attempts.delete(key);
    }
  }

  private makeRoom() {
    while (this.attempts.size >= this.options.maxBuckets) {
      const oldest = this.attempts.keys().next().value;
      if (oldest === undefined) break;
      this.attempts.delete(oldest);
    }
  }
}

const globalThrottle = globalThis as typeof globalThis & { petstoreLoginThrottle?: LocalLoginThrottle };
export const loginThrottle = globalThrottle.petstoreLoginThrottle ?? new LocalLoginThrottle();
globalThrottle.petstoreLoginThrottle = loginThrottle;

export function requestClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}
