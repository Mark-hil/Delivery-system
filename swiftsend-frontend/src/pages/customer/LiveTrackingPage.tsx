import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock, MapNavigationMode } from "@/components/MapBlock";
import { StatusBadge } from "@/components/Primitives";
import { useDelivery } from "@/context/DeliveryContext";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";

export const LiveTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { draft, current, setCurrent, finishDelivery } = useDelivery();
  const { toast } = useUI();

  // Stage 1: "to_pickup" (Rider coming to pickup) -> Stage 2: "to_dropoff" (Rider delivering package)
  const [navStage, setNavStage] = useState<MapNavigationMode>("to_pickup");
  const [etaMin, setEtaMin] = useState(4);

  // Poll real delivery status from backend every 3 seconds to respond to rider's real actions
  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const pollStatus = async () => {
      if (!current?.id || cancelled) return;
      try {
        const fresh = await api.fetchDeliveryById(current.id);
        if (!fresh || cancelled) return;

        setCurrent(fresh);

        // When rider confirms package pickup, switch to stage 2
        if (fresh.status === "pickedUp" || fresh.status === "inTransit") {
          setNavStage("to_dropoff");
          setEtaMin(5);
        } else if (fresh.status === "delivered") {
          toast("🎉 Package delivered successfully!");
          navigate("/customer/completed", { replace: true });
          return;
        }
      } catch {
        // Silently retry on next poll
      }

      if (!cancelled) {
        timerId = setTimeout(pollStatus, 3000);
      }
    };

    timerId = setTimeout(pollStatus, 3000);

    const tick = setInterval(() => {
      setEtaMin((m) => Math.max(1, m - 1));
    }, 15000);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const pickupAddr = current?.pickupAddress || draft.pickupAddress;
  const dropoffAddr = current?.dropoffAddress || draft.dropoffAddress;

  return (
    <div className="page" style={{ position: "relative" }}>
      <div
        style={{
          flex: 1,
          minHeight: 480,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <MapBlock
          flat
          height={480}
          routeColor="#4285F4"
          navigationMode={navStage}
          pickupAddress={pickupAddr}
          dropoffAddress={dropoffAddr}
          pickupCoords={
            draft.pickupLat != null && draft.pickupLng != null
              ? { lat: draft.pickupLat, lng: draft.pickupLng }
              : undefined
          }
          dropoffCoords={
            draft.dropoffLat != null && draft.dropoffLng != null
              ? { lat: draft.dropoffLat, lng: draft.dropoffLng }
              : undefined
          }
          animateRider
        />

        {/* Top status card with stage switcher */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 18,
            right: 18,
            zIndex: 20,
            background: "white",
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.14)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="muted" style={{ fontSize: 10.5 }}>
                {navStage === "to_pickup"
                  ? "🏍 Rider coming to pickup"
                  : "📦 Rider delivering to destination"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16.5,
                  color: "#185ABC",
                  marginTop: 1,
                }}
              >
                {etaMin} min away
              </div>
            </div>
            <StatusBadge
              label={navStage === "to_pickup" ? "Heading to pickup" : "In transit"}
              tone="blue"
            />
          </div>

          {/* Interactive stage pills so the customer can view both legs anytime */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 10,
              background: "#F1F5F9",
              padding: 4,
              borderRadius: 10,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setNavStage("to_pickup");
                setEtaMin(4);
              }}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 7,
                padding: "5px 8px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: navStage === "to_pickup" ? "#4285F4" : "transparent",
                color: navStage === "to_pickup" ? "#FFFFFF" : "#475569",
              }}
            >
              1. Coming to Pickup
            </button>
            <button
              type="button"
              onClick={() => {
                setNavStage("to_dropoff");
                setEtaMin(6);
              }}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 7,
                padding: "5px 8px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: navStage === "to_dropoff" ? "#4285F4" : "transparent",
                color: navStage === "to_dropoff" ? "#FFFFFF" : "#475569",
              }}
            >
              2. Delivering Package
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "24px 24px 0 0",
          padding: "16px 22px 22px",
          boxShadow: "0 -10px 30px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "#4285F4",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            🏍
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{current?.riderName ?? "Kwame Mensah"}</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
              Honda CB125 · GT 4471-22 · ⭐ 4.9
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11, textAlign: "right" }}>
            {navStage === "to_pickup" ? "1.3 km" : "2.1 km"}
            <br />
            remaining
          </div>
        </div>

        <div className="btn-row" style={{ padding: 0 }}>
          <a
            href="tel:+233204451198"
            className="btn"
            style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}
          >
            📞 Call
          </a>
          <button
            className="btn"
            style={{ background: "#EEF0F2", color: "var(--ink)" }}
            onClick={() => navigate("/customer/chat")}
          >
            💬 Chat
          </button>
          <button
            className="btn"
            style={{ background: "#FFF6DE", color: "#9A6B00" }}
            onClick={() =>
              navigator.share?.({ text: "Track my SwiftSend delivery live." }).catch(() => {})
            }
          >
            ↗ Share
          </button>
          <button
            className="btn"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            onClick={() => toast("Emergency alert sent to SwiftSend support.")}
          >
            ⚠ SOS
          </button>
        </div>
      </div>
    </div>
  );
};
