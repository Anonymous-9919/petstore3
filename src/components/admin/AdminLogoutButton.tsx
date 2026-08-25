"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return <button type="button" disabled={pending} onClick={logout} className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-semibold disabled:opacity-60">{pending ? "Signing out..." : "Sign out"}</button>;
}
