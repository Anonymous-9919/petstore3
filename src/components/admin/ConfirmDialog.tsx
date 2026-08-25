"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", onConfirm, onClose, pending = false }: { open: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void; pending?: boolean }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title"><button type="button" className="absolute inset-0 bg-black/40" aria-label="Close dialog" onClick={onClose} /><div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 id="confirm-dialog-title" className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-[#666]">{description}</p><div className="mt-6 flex justify-end gap-3"><button ref={cancelRef} type="button" disabled={pending} onClick={onClose} className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-black/5">Cancel</button><button type="button" disabled={pending} onClick={onConfirm} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Working..." : confirmLabel}</button></div></div></div>;
}
