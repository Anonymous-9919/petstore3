import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">{eyebrow ?? "Admin"}</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>{description && <p className="mt-2 max-w-3xl text-sm text-[#666]">{description}</p>}</div>{actions && <div className="shrink-0">{actions}</div>}</div>;
}
