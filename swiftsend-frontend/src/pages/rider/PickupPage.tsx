import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock } from "@/components/MapBlock";
import { SectionTitle } from "@/components/Primitives";
import { Button } from "@/components/Button";
import { useRiderJob } from "@/context/RiderJobContext";

export const PickupPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeJob, markPickedUp } = useRiderJob();
  const [arrived, setArrived] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirmPickedUp = async () => {
    setLoading(true);
    try {
      await markPickedUp();
      navigate("/rider/delivery", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const pickupAddr = activeJob?.pickupAddress ?? "12 Oxford Street, Osu";
  const dropoffAddr = activeJob?.dropoffAddress ?? "Plot 9 Boundary Road, East Legon";

  return (
    <div className="page">
      <div className="page-scroll">
        <MapBlock
          height={235}
          routeColor="#4285F4"
          pickupAddress={pickupAddr}
          dropoffAddress={dropoffAddr}
          navigationMode="to_pickup"
          animateRider={!arrived}
          badge={arrived ? "✅ Arrived at Pickup" : "🧭 Blue route to Customer Pickup"}
        />

        <SectionTitle title="Customer Pickup" />
        <div className="row-list-item">
          <div className="icon">{activeJob?.customerName?.slice(0, 2).toUpperCase() ?? "CU"}</div>
          <div className="meta">
            <div className="title">{activeJob?.customerName ?? "Customer"}</div>
            <div className="sub">
              {pickupAddr} · {activeJob?.packageType ?? "Package"} pickup
            </div>
          </div>
        </div>

        <div className="btn-row" style={{ marginBottom: 14 }}>
          <a
            href="tel:+233267749931"
            className="btn"
            style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}
          >
            📞 Call customer
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              `${pickupAddr}, Ghana`
            )}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="btn"
            style={{ background: "#EFF6FF", color: "#185ABC" }}
          >
            🧭 Google Maps
          </a>
        </div>

        <div className="btn-block-group">
          <Button
            label={arrived ? "Arrived at pickup ✓" : "Arrived at pickup"}
            variant="secondary"
            onClick={() => setArrived(true)}
          />
          <Button
            label="Package picked up — Start delivery"
            onClick={confirmPickedUp}
            loading={loading}
            disabled={!arrived}
          />
        </div>
      </div>
    </div>
  );
};
