import { afterEach, describe, expect, it, vi } from "vitest";
import { knetConfigured, knetInitiate, knetPaymentPage } from "@/lib/knet";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("KNET configuration and initiation", () => {
  it("reports an unconfigured gateway without making a network request", async () => {
    delete process.env.KNET_INIT_URL;
    delete process.env.KNET_MERCHANT_ID;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(knetConfigured()).toBe(false);
    await expect(knetInitiate({ amount: "1.000", trackId: "PAY-1", lang: "ENG" })).resolves.toEqual({ error: "KNET payment gateway is not configured." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("encodes payment IDs when constructing the hosted payment URL", () => {
    process.env.KNET_PAYMENT_PAGE_URL = "https://payments.example.test/pay";

    expect(knetPaymentPage("id with spaces&symbols")).toBe("https://payments.example.test/pay?PaymentID=id%20with%20spaces%26symbols");
  });
});
