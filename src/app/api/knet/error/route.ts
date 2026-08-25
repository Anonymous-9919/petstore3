const disabledResponse = () => new Response("KNET is not enabled.", { status: 503 });

// Error callbacks are also untrusted until the gateway verification contract
// is available. Pending attempts are instead closed by reservation expiry.
export async function POST() {
  return disabledResponse();
}

export async function GET() {
  return disabledResponse();
}
