import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, onGoogleMapsAuthFailure } from "@/services/googleMaps";
import {
  Coords,
  detectUserLocationInGhana,
  fetchOsrmRoute,
  geocodeGhanaAddress,
  getCachedDeviceLocation,
  resolveSyncGhanaCoords,
  reverseGeocodeGhana,
} from "@/services/geoService";

interface Props {
  routeColor?: string;
  badge?: string;
  height?: number;
  flat?: boolean;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupCoords?: Coords;
  dropoffCoords?: Coords;
  showRoute?: boolean;
  interactivePins?: boolean;
  showNearbyRiders?: boolean;
  animateRider?: boolean;
  autoLocateUser?: boolean;
  onPickupChange?: (place: { address: string; lat: number; lng: number }) => void;
  onDropoffChange?: (place: { address: string; lat: number; lng: number }) => void;
  children?: React.ReactNode;
}

export const resolveAccraCoords = resolveSyncGhanaCoords;

function resolveCssColor(color: string): string {
  if (!color.startsWith("var(")) return color;
  if (color.includes("--blue")) return "#111827";
  if (color.includes("--green")) return "#16A34A";
  return "#111827";
}

// Strict Ghana bounding box so the map never pans or zooms out to other countries
const GHANA_BOUNDS: [[number, number], [number, number]] = [
  [4.65, -3.35],
  [11.25, 1.3],
];

export const MapBlock: React.FC<Props> = ({
  routeColor = "#111827",
  badge,
  height,
  flat,
  pickupAddress,
  dropoffAddress,
  pickupCoords,
  dropoffCoords,
  showRoute = true,
  interactivePins = false,
  showNearbyRiders = false,
  animateRider = false,
  autoLocateUser = false,
  onPickupChange,
  onDropoffChange,
  children,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<any>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const onPickupChangeRef = useRef(onPickupChange);
  const onDropoffChangeRef = useRef(onDropoffChange);
  onPickupChangeRef.current = onPickupChange;
  onDropoffChangeRef.current = onDropoffChange;

  const [forceFallback, setForceFallback] = useState(false);

  const cachedDevice = getCachedDeviceLocation();
  const defaultPickupFallback = cachedDevice
    ? { lat: cachedDevice.lat, lng: cachedDevice.lng, label: cachedDevice.address.split(",")[0] || "Current Location" }
    : { lat: 5.556, lng: -0.1826, label: "12 Oxford St, Osu" };

  const [pickup, setPickup] = useState(() =>
    resolveSyncGhanaCoords(pickupAddress, defaultPickupFallback, pickupCoords)
  );
  const [dropoff, setDropoff] = useState(() =>
    resolveSyncGhanaCoords(
      dropoffAddress,
      { lat: 5.6358, lng: -0.1614, label: "East Legon" },
      dropoffCoords
    )
  );

  // Dynamically geocode typed addresses anywhere across all 16 regions of Ghana
  useEffect(() => {
    let cancelled = false;
    const syncPickup = resolveSyncGhanaCoords(pickupAddress, defaultPickupFallback, pickupCoords);
    setPickup(syncPickup);

    const timer = setTimeout(async () => {
      const resolved = await geocodeGhanaAddress(pickupAddress, defaultPickupFallback, pickupCoords);
      if (!cancelled) {
        setPickup(resolved);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupAddress, pickupCoords?.lat, pickupCoords?.lng]);

  useEffect(() => {
    let cancelled = false;
    const syncDropoff = resolveSyncGhanaCoords(
      dropoffAddress,
      { lat: 5.6358, lng: -0.1614, label: "East Legon" },
      dropoffCoords
    );
    setDropoff(syncDropoff);

    const timer = setTimeout(async () => {
      const resolved = await geocodeGhanaAddress(
        dropoffAddress,
        { lat: 5.6358, lng: -0.1614, label: "East Legon" },
        dropoffCoords
      );
      if (!cancelled) {
        setDropoff(resolved);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dropoffAddress, dropoffCoords?.lat, dropoffCoords?.lng]);

  // Live Device GPS Auto-Detection (strictly validated inside Ghana)
  useEffect(() => {
    if (!autoLocateUser && pickupAddress && pickupCoords) return;
    let cancelled = false;
    detectUserLocationInGhana().then((loc) => {
      if (cancelled || !loc) return;
      if (autoLocateUser || (!pickupAddress && !pickupCoords)) {
        setPickup({
          lat: loc.lat,
          lng: loc.lng,
          label: loc.address.split(",")[0] || "My Location",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [autoLocateUser, pickupAddress, pickupCoords]);

  useEffect(() => {
    return onGoogleMapsAuthFailure(() => {
      setForceFallback(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let riderInterval: ReturnType<typeof setInterval> | null = null;
    const container = mapContainerRef.current;
    if (!container) return;

    const cleanupMaps = () => {
      if (riderInterval) {
        clearInterval(riderInterval);
        riderInterval = null;
      }
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
      if (googleMapInstanceRef.current) {
        googleMapInstanceRef.current = null;
        container.innerHTML = "";
      }
    };

    const initUberStyleLeafletMap = async () => {
      if (cancelled || !mapContainerRef.current) return;
      cleanupMaps();
      const L = (window as unknown as { L?: any }).L;
      if (!L) return;

      // Lock zoom to street/city level (minZoom: 12) and restrict panning strictly to Ghana
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        minZoom: 12,
        maxZoom: 18,
        maxBounds: GHANA_BOUNDS,
        maxBoundsViscosity: 1.0,
      });
      leafletInstanceRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Uber-style Pickup Marker: Black circle with white center + floating white address pill
      const pickupIcon = L.divIcon({
        className: "swiftsend-leaflet-pin",
        html: `<div style="display:flex;align-items:center;gap:6px;transform:translate(-11px,-11px);cursor:${
          interactivePins ? "grab" : "pointer"
        };">
          <div style="width:20px;height:20px;border-radius:50%;background:#111827;border:2.5px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
            <div style="width:6px;height:6px;border-radius:50%;background:#16A34A;"></div>
          </div>
          <div style="display:flex;align-items:center;background:#FFFFFF;color:#111827;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.18);border:1px solid rgba(15,23,42,0.08);">
            <span style="width:6px;height:6px;border-radius:50%;background:#16A34A;margin-right:5px;"></span>
            <span>${pickup.label}</span>
          </div>
        </div>`,
        iconSize: [22, 22],
      });

      // Uber-style Drop-off Marker: Square stop pin + floating dark address pill
      const dropoffIcon = L.divIcon({
        className: "swiftsend-leaflet-pin",
        html: `<div style="display:flex;align-items:center;gap:6px;transform:translate(-11px,-11px);cursor:${
          interactivePins ? "grab" : "pointer"
        };">
          <div style="width:20px;height:20px;border-radius:4px;background:#111827;border:2.5px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
            <div style="width:6px;height:6px;background:#FFFFFF;"></div>
          </div>
          <div style="display:flex;align-items:center;background:#111827;color:#FFFFFF;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.24);">
            <span>${dropoff.label}</span>
          </div>
        </div>`,
        iconSize: [22, 22],
      });

      const pickupMarker = L.marker([pickup.lat, pickup.lng], {
        icon: pickupIcon,
        draggable: interactivePins,
      }).addTo(map);

      if (interactivePins) {
        pickupMarker.on("dragend", async () => {
          const pos = pickupMarker.getLatLng();
          const addr = await reverseGeocodeGhana(pos.lat, pos.lng);
          onPickupChangeRef.current?.({
            address: addr,
            lat: Number(pos.lat.toFixed(6)),
            lng: Number(pos.lng.toFixed(6)),
          });
        });
      }

      if (showNearbyRiders) {
        const riderOffsets = [
          { dLat: 0.0034, dLng: -0.0041 },
          { dLat: -0.0029, dLng: 0.0038 },
          { dLat: 0.0048, dLng: 0.0027 },
          { dLat: -0.0041, dLng: -0.0032 },
        ];
        riderOffsets.forEach((off) => {
          const bikeIcon = L.divIcon({
            className: "swiftsend-rider-bike",
            html: `<div style="width:28px;height:28px;border-radius:50%;background:#111827;border:2px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;font-size:13px;transform:translate(-14px,-14px);">🏍</div>`,
            iconSize: [28, 28],
          });
          L.marker([pickup.lat + off.dLat, pickup.lng + off.dLng], { icon: bikeIcon }).addTo(map);
        });
      }

      // Helper to frame route at street level without zooming out to a regional/country view
      const frameUberCamera = (boundsObj: any) => {
        const distDeg = Math.hypot(dropoff.lat - pickup.lat, dropoff.lng - pickup.lng);
        // If pickup and dropoff are within ~30 km, fit both at street level (zoom 12..15)
        if (distDeg <= 0.28) {
          map.fitBounds(boundsObj, { padding: [36, 48], maxZoom: 15 });
        } else {
          // For inter-city trips across Ghana, stay zoomed in at street level around the pickup neighborhood
          map.setView([pickup.lat, pickup.lng], 13);
        }
      };

      if (showRoute) {
        const dropoffMarker = L.marker([dropoff.lat, dropoff.lng], {
          icon: dropoffIcon,
          draggable: interactivePins,
        }).addTo(map);

        if (interactivePins) {
          dropoffMarker.on("dragend", async () => {
            const pos = dropoffMarker.getLatLng();
            const addr = await reverseGeocodeGhana(pos.lat, pos.lng);
            onDropoffChangeRef.current?.({
              address: addr,
              lat: Number(pos.lat.toFixed(6)),
              lng: Number(pos.lng.toFixed(6)),
            });
          });
        }

        const initialBounds = L.latLngBounds([
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ]);
        frameUberCamera(initialBounds);

        const osrm = await fetchOsrmRoute(
          { lat: pickup.lat, lng: pickup.lng },
          { lat: dropoff.lat, lng: dropoff.lng }
        );
        if (cancelled || !leafletInstanceRef.current) return;

        // Uber signature bold dark route line with subtle outer halo
        L.polyline(osrm.coordinates, {
          color: "#FFFFFF",
          weight: 7,
          opacity: 0.75,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        const routeLine = L.polyline(osrm.coordinates, {
          color: resolveCssColor(routeColor),
          weight: 4.5,
          opacity: 0.98,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        frameUberCamera(routeLine.getBounds());

        if (animateRider && osrm.coordinates.length >= 2) {
          let stepIdx = Math.floor(osrm.coordinates.length * 0.2);
          const liveRiderIcon = L.divIcon({
            className: "swiftsend-live-rider",
            html: `<div style="display:flex;align-items:center;gap:4px;transform:translate(-16px,-16px);">
              <div style="width:32px;height:32px;border-radius:50%;background:#111827;border:2.5px solid #16A34A;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:16px;">🏍</div>
              <span style="background:#16A34A;color:#fff;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">LIVE</span>
            </div>`,
            iconSize: [32, 32],
          });

          const liveMarker = L.marker(osrm.coordinates[stepIdx], {
            icon: liveRiderIcon,
            zIndexOffset: 1000,
          }).addTo(map);

          riderInterval = setInterval(() => {
            if (cancelled) return;
            stepIdx = (stepIdx + 1) % osrm.coordinates.length;
            liveMarker.setLatLng(osrm.coordinates[stepIdx]);
          }, 850);
        }
      } else {
        map.setView([pickup.lat, pickup.lng], 14);
      }

      setTimeout(() => {
        if (!cancelled && leafletInstanceRef.current) {
          map.invalidateSize();
        }
      }, 100);
    };

    const initGoogleMap = (gmaps: any) => {
      if (cancelled || !mapContainerRef.current) return;
      cleanupMaps();

      const strokeHex = resolveCssColor(routeColor);
      const map = new gmaps.Map(mapContainerRef.current, {
        center: { lat: pickup.lat, lng: pickup.lng },
        zoom: 14,
        minZoom: 12,
        maxZoom: 18,
        restriction: {
          latLngBounds: {
            north: 11.25,
            south: 4.65,
            west: -3.35,
            east: 1.3,
          },
          strictBounds: true,
        },
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ saturation: -75 }, { lightness: 10 }],
          },
          {
            featureType: "poi.business",
            stylers: [{ visibility: "off" }],
          },
        ],
      });
      googleMapInstanceRef.current = map;

      const pickupMarker = new gmaps.Marker({
        position: { lat: pickup.lat, lng: pickup.lng },
        map,
        draggable: interactivePins,
        title: `Pickup: ${pickup.label}`,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#111827",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
      });

      if (interactivePins) {
        pickupMarker.addListener("dragend", async (ev: any) => {
          const lat = ev?.latLng?.lat?.();
          const lng = ev?.latLng?.lng?.();
          if (typeof lat === "number" && typeof lng === "number") {
            const addr = await reverseGeocodeGhana(lat, lng);
            onPickupChangeRef.current?.({ address: addr, lat, lng });
          }
        });
      }

      if (showRoute) {
        const dropoffMarker = new gmaps.Marker({
          position: { lat: dropoff.lat, lng: dropoff.lng },
          map,
          draggable: interactivePins,
          title: `Drop-off: ${dropoff.label}`,
          icon: {
            path: gmaps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#16A34A",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 3,
          },
        });

        if (interactivePins) {
          dropoffMarker.addListener("dragend", async (ev: any) => {
            const lat = ev?.latLng?.lat?.();
            const lng = ev?.latLng?.lng?.();
            if (typeof lat === "number" && typeof lng === "number") {
              const addr = await reverseGeocodeGhana(lat, lng);
              onDropoffChangeRef.current?.({ address: addr, lat, lng });
            }
          });
        }

        const directionsService = new gmaps.DirectionsService();
        const directionsRenderer = new gmaps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: strokeHex,
            strokeWeight: 5,
            strokeOpacity: 0.95,
          },
        });

        directionsService.route(
          {
            origin: { lat: pickup.lat, lng: pickup.lng },
            destination: { lat: dropoff.lat, lng: dropoff.lng },
            travelMode: gmaps.TravelMode.DRIVING,
            region: "GH",
          },
          (result: any, status: string) => {
            if (cancelled) return;
            if (status === "OK" && result) {
              directionsRenderer.setDirections(result);
            } else {
              fetchOsrmRoute(
                { lat: pickup.lat, lng: pickup.lng },
                { lat: dropoff.lat, lng: dropoff.lng }
              ).then((osrm) => {
                if (cancelled) return;
                new gmaps.Polyline({
                  path: osrm.coordinates.map(([lat, lng]) => ({ lat, lng })),
                  geodesic: true,
                  strokeColor: strokeHex,
                  strokeOpacity: 0.95,
                  strokeWeight: 4.5,
                  map,
                });
              });
            }
          }
        );
      }
    };

    if (forceFallback) {
      initUberStyleLeafletMap();
    } else {
      loadGoogleMaps().then((gmaps) => {
        if (cancelled) return;
        if (gmaps) {
          initGoogleMap(gmaps);
        } else {
          initUberStyleLeafletMap();
        }
      });
    }

    return () => {
      cancelled = true;
      cleanupMaps();
    };
  }, [
    pickup.lat,
    pickup.lng,
    pickup.label,
    dropoff.lat,
    dropoff.lng,
    dropoff.label,
    routeColor,
    showRoute,
    interactivePins,
    showNearbyRiders,
    animateRider,
    forceFallback,
  ]);

  return (
    <div
      className={`map-block ${flat ? "flat" : ""}`}
      style={{
        position: "relative",
        overflow: "hidden",
        ...(height ? { height } : {}),
      }}
    >
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
      {interactivePins && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 10,
            zIndex: 10,
            background: "rgba(17, 24, 39, 0.88)",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 999,
            pointerEvents: "none",
          }}
        >
          ✋ Drag pins to adjust spot
        </div>
      )}
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
