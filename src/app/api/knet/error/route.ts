export async function POST(req: Request) {
  const text = await req.text().catch(() => "");
  const origin = new URL(req.url).origin;
  const trackId = new URLSearchParams(text).get("trackid") || "";
  return new Response(`REDIRECT=${origin}/checkout/confirmation?payment_error=1&order=${encodeURIComponent(trackId)}`, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const trackId = url.searchParams.get("trackid") || "";
  return new Response(`REDIRECT=${url.origin}/checkout/confirmation?payment_error=1&order=${encodeURIComponent(trackId)}`, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
