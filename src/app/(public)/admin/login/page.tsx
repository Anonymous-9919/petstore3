"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Unable to sign in.");
      setSubmitting(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-12 text-[#262626]">
      <form onSubmit={submit} className="mx-auto max-w-md rounded-xl border border-black/10 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">Pet Store</p>
        <h1 className="mt-2 text-3xl font-bold">Admin sign in</h1>
        <p className="mt-2 text-sm text-[#666]">Use your staff email and password.</p>
        <label className="mt-7 block text-sm font-semibold">Email<input required name="email" type="email" autoComplete="email" className="mt-2 w-full rounded-md border border-[#ccc] px-3 py-2" /></label>
        <label className="mt-4 block text-sm font-semibold">Password<input required name="password" type="password" autoComplete="current-password" className="mt-2 w-full rounded-md border border-[#ccc] px-3 py-2" /></label>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="mt-7 w-full rounded-md bg-brand px-4 py-3 font-semibold text-white disabled:opacity-60">{submitting ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
