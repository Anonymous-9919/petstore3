export interface KnetInitOptions {
  amount: string;
  trackId: string;
  lang: "ENG" | "AR";
  udf1?: string;
  udf2?: string;
}

export interface KnetInitResult {
  paymentId?: string;
  error?: string;
}

export function knetConfigured(): boolean {
  return !!(
    process.env.KNET_INIT_URL &&
    process.env.KNET_MERCHANT_ID &&
    process.env.KNET_MERCHANT_PASSWORD &&
    process.env.KNET_RESPONSE_URL &&
    process.env.KNET_ERROR_URL
  );
}

export function knetPaymentPage(paymentId: string): string {
  const base = process.env.KNET_PAYMENT_PAGE_URL ?? "https://www.kpay.com.kw/kpg/paymentpage.htm";
  return `${base}?PaymentID=${encodeURIComponent(paymentId)}`;
}

export async function knetInitiate(opts: KnetInitOptions): Promise<KnetInitResult> {
  const initUrl = process.env.KNET_INIT_URL;
  const id = process.env.KNET_MERCHANT_ID;
  const password = process.env.KNET_MERCHANT_PASSWORD;
  const responseUrl = process.env.KNET_RESPONSE_URL;
  const errorUrl = process.env.KNET_ERROR_URL;
  if (!initUrl || !id || !password || !responseUrl || !errorUrl) {
    return { error: "KNET payment gateway is not configured." };
  }
  const body = new URLSearchParams({
    id,
    password,
    action: "1",
    amt: opts.amount,
    currencycode: "414",
    langid: opts.lang,
    responseURL: responseUrl,
    errorURL: errorUrl,
    trackid: opts.trackId,
    udf1: opts.udf1 ?? "",
    udf2: opts.udf2 ?? "",
    udf3: "",
    udf4: "",
    udf5: "",
  });
  const res = await fetch(initUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/plain",
    },
    body,
  });
  if (!res.ok) {
    return { error: `KNET gateway responded with status ${res.status}.` };
  }
  const text = await res.text();
  const parts = text.split(":");
  if (parts.length >= 2) {
    const key = parts[0].trim().toUpperCase();
    const value = parts[1].trim();
    if (key === "PAYMENTID" && value) {
      return { paymentId: value };
    }
    if (key === "ERROR") {
      return { error: value || "KNET returned an error." };
    }
  }
  return { error: text.trim() || "KNET returned an unexpected response." };
}
