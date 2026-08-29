"use client";

import { useEffect, useRef, useState } from "react";
import { storeData } from "@/data/loader";

const SLIDER_INTERVAL = 3000;

type Banner = { path: string; mobilePath?: string | null; alt: string | null; altAr: string | null };

export default function MobileCarousel({ banners = [] }: { banners?: Banner[] }) {
  const images: Banner[] = banners.length ? banners : ((storeData as { slider_images?: string[] }).slider_images || []).map((path) => ({ path, alt: null, altAr: null }));
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setActive((a) => (a + 1) % images.length);
    }, SLIDER_INTERVAL);
    return () => clearInterval(t);
  }, [images.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: active * el.clientWidth, behavior: "smooth" });
  }, [active]);

  if (images.length === 0) return null;

  return (
    <div className="relative lg:hidden">
      <div
        ref={trackRef}
        className="flex w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
        style={{ scrollBehavior: "smooth" }}
      >
        {images.map((image, i) => (
          <div key={i} className="w-full shrink-0 snap-start">
            <div
              className="h-[300px] w-full bg-cover bg-center"
               style={{ backgroundImage: `url(${image.mobilePath || image.path})` }}
              role="img"
              aria-label={image.alt ?? image.altAr ?? `slide-${i}`}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="previous-slide"
            onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
            className="absolute inset-y-0 left-0 w-[28px] bg-black/0"
          >
            <span className="block border-l-[2px] border-t-[2px] border-white/70" style={{ width: 10, height: 10, transform: "rotate(-45deg)", margin: "auto" }} />
          </button>
          <button
            type="button"
            aria-label="next-slide"
            onClick={() => setActive((a) => (a + 1) % images.length)}
            className="absolute inset-y-0 right-0 w-[28px] bg-black/0"
          >
            <span className="block border-r-[2px] border-t-[2px] border-white/70" style={{ width: 10, height: 10, transform: "rotate(45deg)", margin: "auto" }} />
          </button>
        </>
      )}
    </div>
  );
}
