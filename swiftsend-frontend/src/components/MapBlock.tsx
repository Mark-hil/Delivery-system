import React, { useEffect, useRef } from "react";

interface Props {
  routeColor?: string;
  badge?: string;
  height?: number;
  flat?: boolean;
  pickupAddress?: string;
  dropoffAddress?: string;
  showRoute?: boolean;
  children?: React.ReactNode;
}

interface LatLng {
  lat: number;
  lng: number;
  label: string;
}

const ACCRA_LOCATIONS: Array<{ keywords: string[]; lat: number; lng: number; label: string }> = [
  { keywords: ["osu", "oxford"], lat: 5.556, lng: -0.1826, label: "Osu Oxford St" },
  { keywords: ["east legon", "boundary"], lat: 5.6358, lng: -0.1614, label: "East Legon" },
  { keywords: ["airport", "kotoka"], lat: 5.6052, lng: -0.1718, label: "Airport Residential" },
  { keywords: ["kaneshie"], lat: 5.5653, lng: -0.2368, label: "Kaneshie" },
  { keywords: ["adenta"], lat: 5.7082, lng: -0.1655, label: "Adenta" },
  { keywords: ["spintex"], lat: 5.6295, lng: -0.1045, label: "Spintex Road" },
  { keywords: ["dansoman"], lat: 5.5398, lng: -0.2647, label: "Dansoman" },
  { keywords: ["labone"], lat: 5.5679, lng: -0.1695, label: "Labone" },
  { keywords: ["cantonments"], lat: 5.579, lng: -0.168, label: "Cantonments" },
  { keywords: ["ridge"], lat: 5.5642, lng: -0.1972, label: "Ridge, Accra" },
  { keywords: ["madina"], lat: 5.6784, lng: -0.167, label: "Madina" },
  { keywords: ["legon", "university"], lat: 5.6506, lng: -0.187, label: "Legon" },
  { keywords: ["achimota"], lat: 5.619, lng: -0.227, label: "Achimota" },
  { keywords: ["circle", "kwame nkrumah"], lat: 5.5698, lng: -0.2145, label: "Kwame Nkrumah Circle" },
  { keywords: ["tema"], lat: 5.6698, lng: -0.0166, label: "Tema" },
  { keywords: ["lapaz"], lat: 5.6058, lng: -0.246, label: "Lapaz" },
  { keywords: ["dzorwulu"], lat: 5.6122, lng: -0.2005, label: "Dzorwulu" },
  { keywords: ["accra mall", "tetteh quarshie"], lat: 5.6225, lng: -0.1733, label: "Accra Mall" },
];

export function resolveAccraCoords(address: string | undefined, fallback: LatLng): LatLng {
  if (!address || !address.trim()) return fallback;
  const lower = address.toLowerCase();
  for (const loc of ACCRA_LOCATIONS) {
    if (loc.keywords.some((k) => lower.includes(k))) {
      return { lat: loc.lat, lng: loc.lng, label: address.split(",")[0] || loc.label };
    }
  }
  // Deterministic offset around central Accra for custom street names
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash * 31 + lower.charCodeAt(i)) | 0;
  }
  const latOffset = ((Math.abs(hash) % 700) - 350) / 10000;
  const lngOffset = ((Math.abs(hash >> 8) % 700) - 350) / 10000;
  return {
    lat: 5.591 + latOffset,
    lng: -0.189 + lngOffset,
    label: address.split(",")[0] || "Accra",
  };
}

export const MapBlock: React.FC<Props> = ({
  routeColor = "#16A34A",
  badge,
  height,
  flat,
  pickupAddress,
  dropoffAddress,
  showRoute = true,
  children,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const pickup = resolveAccraCoords(pickupAddress, {
    lat: 5.556,
    lng: -0.1826,
    label: "12 Oxford St, Osu",
  });
  const dropoff = resolveAccraCoords(dropoffAddress, {
    lat: 5.6358,
    lng: -0.1614,
    label: "East Legon",
  });

  useEffect(() => {
    const L = (window as unknown as { L?: any }).L;
    const container = mapContainerRef.current;
    if (!L || !container) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const pickupIcon = L.divIcon({
      className: "swiftsend-leaflet-pin",
      html: `<div style="display:flex;align-items:center;gap:5px;transform:translate(-12px,-12px);">
        <div style="width:18px;height:18px;border-radius:50%;background:#16A34A;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);"></div>
        <span style="background:rgba(15,23,42,0.88);color:#fff;font-size:10px;font-weight:600;padding:2px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${pickup.label}</span>
      </div>`,
      iconSize: [20, 20],
    });

    const dropoffIcon = L.divIcon({
      className: "swiftsend-leaflet-pin",
      html: `<div style="display:flex;align-items:center;gap:5px;transform:translate(-12px,-12px);">
        <div style="width:18px;height:18px;border-radius:50%;background:#0F172A;border:3px solid #F5B700;box-shadow:0 2px 8px rgba(0,0,0,0.28);"></div>
        <span style="background:rgba(15,23,42,0.88);color:#F5B700;font-size:10px;font-weight:600;padding:2px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${dropoff.label}</span>
      </div>`,
      iconSize: [20, 20],
    });

    L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);

    if (showRoute) {
      L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon }).addTo(map);

      // Curved intermediate waypoint for realistic road path feel
      const midLat = (pickup.lat + dropoff.lat) / 2 + 0.006;
      const midLng = (pickup.lng + dropoff.lng) / 2 - 0.008;
      const routePoints = [
        [pickup.lat, pickup.lng],
        [midLat, midLng],
        [dropoff.lat, dropoff.lng],
      ];

      L.polyline(routePoints, {
        color: "#0F172A",
        weight: 6,
        opacity: 0.2,
      }).addTo(map);

      L.polyline(routePoints, {
        color: routeColor,
        weight: 4,
        opacity: 0.95,
        dashArray: "8, 6",
      }).addTo(map);

      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ]);
      map.fitBounds(bounds, { padding: [36, 48], maxZoom: 14 });
    } else {
      map.setView([pickup.lat, pickup.lng], 14);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pickup.lat, pickup.lng, pickup.label, dropoff.lat, dropoff.lng, dropoff.label, routeColor, showRoute]);

  return (
    <div
      className={`map-block ${flat ? "flat" : ""}`}
      style={{
        position: "relative",
        overflow: "hidden",
        ...(height ? { height } : {}),
      }}
    >
      {/* Real Interactive Leaflet Map Layer */}
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />
      {badge && (
        <div className="map-badge" style={{ zIndex: 10 }}>
          {badge}
        </div>
      )}
      <div style={{ position: "relative", zIndex: 10, pointerEvents: "none", width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
};

export const MapPin: React.FC<{ color: string; style?: React.CSSProperties }> = ({ color, style }) => (
  <div className="map-pin" style={{ background: color, zIndex: 10, ...style }} />
);
