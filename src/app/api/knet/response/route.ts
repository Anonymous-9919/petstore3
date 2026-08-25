const disabledResponse = () => new Response("KNET is not enabled.", { status: 503 });

// A browser-posted result is not proof of settlement. Keep this callback
// disabled until KNET supplies credentials and a signature or inquiry contract.
export async function POST() {
  return disabledResponse();
}

export async function GET() {
  return disabledResponse();
}
