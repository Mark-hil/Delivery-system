import React from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock } from "@/components/MapBlock";
import { Button } from "@/components/Button";
import { useRiderJob } from "@/context/RiderJobContext";

export const DeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeJob } = useRiderJob();

  const pickupAddr = activeJob?.pickupAddress ?? "12 Oxford Street, Osu";
  const dropoffAddr = activeJob?.dropoffAddress ?? "Plot 9 Boundary Road, East Legon";

  return (
    <div className="page">
      <div
        style={{
          flex: 1,
          minHeight: 420,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <MapBlock
          flat
          height={420}
          routeColor="#4285F4"
          pickupAddress={pickupAddr}
          dropoffAddress={dropoffAddr}
          navigationMode="to_dropoff"
          animateRider
          badge="🧭 Delivering · Blue route to Drop-off"
        />
      </div>
      <div style={{ padding: 22, flex: 1 }}>
        <Row label="Customer" value={activeJob?.customerName ?? "—"} />
        <Row label="Drop-off" value={dropoffAddr} />
        <Row label="Progress" value="Following blue direction route" />
        <div className="btn-row" style={{ padding: 0, margin: "12px 0" }}>
          <a
            href="tel:+233267749931"
            className="btn"
            style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}
          >
            📞 Contact
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
              `${pickupAddr}, Ghana`
            )}&destination=${encodeURIComponent(`${dropoffAddr}, Ghana`)}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="btn"
            style={{ background: "#EFF6FF", color: "#185ABC" }}
          >
            🧭 Google Maps
          </a>
        </div>
        <Button
          label="Complete delivery"
          onClick={() => navigate("/rider/proof-of-delivery", { replace: true })}
        />
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 13 }}>
    <span className="muted">{label}</span>
    <span style={{ fontWeight: 700 }}>{value}</span>
  </div>
);
