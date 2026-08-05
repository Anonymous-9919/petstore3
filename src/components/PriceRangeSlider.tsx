"use client";

import { useCallback, useRef } from "react";

function fmtLabel(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 0.01,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  step?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<0 | 1 | null>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      return Math.round(raw / step) * step;
    },
    [min, max, step]
  );

  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);

  const onDown = (idx: 0 | 1) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragging.current = idx;
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragging.current === null) return;
    const v = clamp(valueFromClientX(e.clientX));
    const idx = dragging.current;
    const next: [number, number] =
      idx === 0 ? [Math.min(v, value[1]), value[1]] : [value[0], Math.max(v, value[0])];
    if (next[0] !== value[0] || next[1] !== value[1]) onChange(next);
  };

  const onUp = () => {
    dragging.current = null;
  };

  const left = Math.min(pct(value[0]), pct(value[1]));
  const width = Math.abs(pct(value[1]) - pct(value[0]));

  const thumb = (idx: 0 | 1) => (
    <button
      type="button"
      aria-label={idx === 0 ? "min" : "max"}
      onPointerDown={onDown(idx)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="absolute top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-none rounded-full border-2 border-[#ff6600] bg-white shadow-none outline-none"
      style={{ left: `${pct(value[idx])}%` }}
    />
  );

  return (
    <div className="w-full select-none">
      <div className="relative h-[30px]">
        <div
          ref={trackRef}
          className="absolute top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-[#ff6600]"
        >
          <div
            className="absolute top-0 h-full bg-[#ff6600]"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        </div>
        {thumb(0)}
        {thumb(1)}
      </div>
      <div className="flex items-start justify-between">
        <span className="text-[15px] text-[rgba(0,0,0,0.87)]">{fmtLabel(min)}</span>
        <span className="text-[15px] text-[rgba(0,0,0,0.87)]">{fmtLabel(max)}</span>
      </div>
    </div>
  );
}
