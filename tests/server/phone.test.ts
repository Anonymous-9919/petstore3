import { describe, expect, it } from "vitest";
import { canonicalizeKuwaitPhone, kuwaitPhoneLookupValues } from "@/lib/phone";

describe("Kuwait phone identity", () => {
  it.each([
    "+965 5123 4567",
    "96551234567",
    "00965-5123-4567",
    "51234567",
    "\u0665\u0661\u0662\u0663\u0664\u0665\u0666\u0667",
  ])("canonicalizes %s", (value) => {
    expect(canonicalizeKuwaitPhone(value)).toBe("+96551234567");
  });

  it("rejects non-Kuwait and malformed values", () => {
    expect(canonicalizeKuwaitPhone("+1 202 555 0100")).toBeNull();
    expect(canonicalizeKuwaitPhone("+965123")).toBeNull();
    expect(canonicalizeKuwaitPhone("965+51234567")).toBeNull();
  });

  it("provides bounded aliases for safely matching legacy stored forms", () => {
    expect(kuwaitPhoneLookupValues("51234567")).toEqual([
      "+96551234567",
      "96551234567",
      "0096551234567",
      "51234567",
    ]);
  });
});
