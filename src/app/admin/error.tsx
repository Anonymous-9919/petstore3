"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Admin route failed to render", error); }, [error]);
  return <div className="rounded-xl border border-red-200 bg-white p-6"><h2 className="text-lg font-bold">Unable to load this admin page</h2><p className="mt-2 text-sm text-[#666]">Please try again. If the issue persists, contact an administrator.</p><button type="button" onClick={reset} className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Try again</button></div>;
}
