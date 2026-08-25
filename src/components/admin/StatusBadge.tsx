import type { ReactNode } from "react";

const styles = { neutral: "bg-[#f0f0ed] text-[#555]", success: "bg-green-50 text-green-800", warning: "bg-amber-50 text-amber-800", danger: "bg-red-50 text-red-800" };

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof styles }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[tone]}`}>{children}</span>;
}
