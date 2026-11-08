import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/Primitives";
import { Button } from "@/components/Button";
import { MapBlock } from "@/components/MapBlock";
import { useDelivery } from "@/context/DeliveryContext";

export const RiderFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { draft, current, resetFlow } = useDelivery();

  return (
    <div className="page">
      <div className="page-scroll">
        <MapBlock
          height={215}
          pickupAddress={current?.pickupAddress || draft.pickupAddress}
          dropoffAddress={current?.dropoffAddress || draft.dropoffAddress}
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
          navigationMode="to_pickup"
          animateRider
          badge="🏍 Rider accepted · Coming to pickup"
        />

        <div style={{ textAlign: "center", paddingTop: 10 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              background: "#4285F4",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              margin: "0 auto 8px",
              boxShadow: "0 4px 14px rgba(66,133,244,0.35)",
            }}
          >
            🏍
          </div>
          <h3 style={{ fontSize: 16 }}>{current?.riderName ?? "Kwame Mensah"}</h3>
          <p className="muted" style={{ fontSize: 12, marginTop: 3 }}>
            Honda CB125 · GT 4471-22 · ⭐ 4.9
          </p>
        </div>

        <div style={{ margin: "10px 22px" }}>
          <Card style={{ textAlign: "center", border: "1px solid rgba(66,133,244,0.25)", background: "#EFF6FF" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "#185ABC" }}>
              Arriving at pickup in 4 min
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
              Following blue route to {(current?.pickupAddress || draft.pickupAddress).split(",")[0]}
            </div>
          </Card>
        </div>

        <div className="btn-row" style={{ marginTop: 10, marginBottom: 8 }}>
          <a
            href="tel:+233204451198"
            className="btn"
            style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}
          >
            📞 Call rider
          </a>
          <button
            className="btn"
            style={{ background: "#EEF0F2", color: "var(--ink)" }}
            onClick={() => navigate("/customer/chat")}
          >
            💬 Message
          </button>
        </div>

        <div className="btn-block-group">
          <Button
            label="Open Live Map Tracking"
            onClick={() => navigate("/customer/tracking", { replace: true })}
          />
          <Button
            label="Cancel"
            variant="danger"
            onClick={() => {
              resetFlow();
              navigate("/customer/home", { replace: true });
            }}
          />
        </div>
      </div>
    </div>
  );
};
