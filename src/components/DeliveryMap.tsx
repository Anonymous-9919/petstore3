"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import type { Map, Marker } from "leaflet";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletLib = Record<string, any>;

export default function DeliveryMap({
  lat,
  lng,
  userLat,
  userLng,
  className,
}: {
  lat?: number | null;
  lng?: number | null;
  userLat?: number | null;
  userLng?: number | null;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ map: Map; markers: Marker[] } | null>(null);
  const [lib, setLib] = useState<LeafletLib | null>(null);

  useEffect(() => {
    if (!lib) {
      import("leaflet").then((mod) => setLib((mod as any).default ?? mod));
    }
  }, [lib]);

  useEffect(() => {
    const node = ref.current;
    if (!lib || !node) return;

    if (!mapRef.current) {
      const map: Map = lib.map(node, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
      }).setView([lat ?? userLat ?? 29.365, lng ?? userLng ?? 47.968], 14);

      lib
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "",
          maxZoom: 18,
        })
        .addTo(map);

      mapRef.current = { map, markers: [] };
    }

    const { map, markers } = mapRef.current;

    markers.forEach((m) => m.removeFrom(map));
    markers.length = 0;

    const areaIcon: LeafletLib = lib.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    const userIcon: LeafletLib = lib.divIcon({
      className: "user-location-pin",
      html:
        '<div style="width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 3px #fff,0 0 0 6px rgba(66,153,225,0.55);background:rgba(66,153,225,0.95);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const hasArea = typeof lat === "number" && typeof lng === "number";
    const hasUser = typeof userLat === "number" && typeof userLng === "number";

    const positions: { lat: number; lng: number; icon: LeafletLib }[] = [];
    if (hasArea) positions.push({ lat, lng: lng!, icon: areaIcon });
    if (hasUser) positions.push({ lat: userLat!, lng: userLng!, icon: userIcon });

    if (positions.length > 1) {
      const group = lib.featureGroup(
        positions.map((p) => lib.marker([p.lat, p.lng], { icon: p.icon }))
      );
      group.addTo(map);
      markers.push(...(group.getLayers() as Marker[]));
      map.fitBounds(group.getBounds().pad(0.5), { maxZoom: 15 });
    } else if (positions.length === 1) {
      const m = lib.marker([positions[0].lat, positions[0].lng], {
        icon: positions[0].icon,
      });
      m.addTo(map);
      markers.push(m);
      map.setView([positions[0].lat, positions[0].lng], 14);
    }
  }, [lib, lat, lng, userLat, userLng, className]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={ref} className={cn(className)} />;
}
