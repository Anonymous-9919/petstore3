import { describe, expect, it } from "vitest";
import { LocalLoginThrottle } from "@/server/login-throttle";

const options = { windowMs: 1_000, accountLimit: 2, ipLimit: 3, maxBuckets: 4 };

describe("LocalLoginThrottle", () => {
  it("blocks repeated account failures until the fixed window expires", () => {
    const throttle = new LocalLoginThrottle(options);
    throttle.recordFailure("admin", "owner@example.com", "192.0.2.1", 0);
    throttle.recordFailure("admin", "owner@example.com", "192.0.2.1", 0);

    expect(throttle.check("admin", "owner@example.com", "192.0.2.1", 0)).toEqual({ allowed: false, retryAfter: 1 });
    expect(throttle.check("admin", "owner@example.com", "192.0.2.1", 1_000)).toEqual({ allowed: true });
  });

  it("also limits password spraying by source IP", () => {
    const throttle = new LocalLoginThrottle(options);
    throttle.recordFailure("customer", "one@example.com", "192.0.2.2", 0);
    throttle.recordFailure("customer", "two@example.com", "192.0.2.2", 0);
    throttle.recordFailure("customer", "three@example.com", "192.0.2.2", 0);

    expect(throttle.check("customer", "four@example.com", "192.0.2.2", 0).allowed).toBe(false);
  });

  it("evicts least-recently-used buckets instead of growing without bound", () => {
    const throttle = new LocalLoginThrottle(options);
    for (let index = 0; index < 20; index += 1) {
      throttle.recordFailure("admin", `user-${index}@example.com`, `192.0.2.${index}`, 0);
    }

    expect(throttle.size).toBeLessThanOrEqual(options.maxBuckets);
  });
});
