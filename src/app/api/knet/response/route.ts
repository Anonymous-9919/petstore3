function redirectPath(params: URLSearchParams): string {
  const trackId = params.get("trackid") || params.get("trackId") || "";
  const result = (params.get("result") || "").toUpperCase();
  const success = result === "CAPTURED";
  return success
    ? `/checkout/success?order=${encodeURIComponent(trackId)}`
    : `/checkout/confirmation?payment_error=1`;
}

function respond(origin: string, path: string): Response {
  return new Response(`REDIRECT=${origin}${path}`, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(req: Request) {
  const text = await req.text().catch(() => "");
  const origin = new URL(req.url).origin;
  return respond(origin, redirectPath(new URLSearchParams(text)));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return respond(url.origin, redirectPath(url.searchParams));
}
