import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-black/15 bg-white px-6 py-12 text-center"><h3 className="font-bold">{title}</h3>{description && <p className="mx-auto mt-2 max-w-md text-sm text-[#666]">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}
