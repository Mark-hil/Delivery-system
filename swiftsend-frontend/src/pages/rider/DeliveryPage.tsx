import React from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock, MapPin } from "@/components/MapBlock";
import { Button } from "@/components/Button";
import { useRiderJob } from "@/context/RiderJobContext";

export const DeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeJob } = useRiderJob();

  return (
    <div className="page">
      <div style={{ height: "55%" }}>
        <MapBlock flat routeColor="var(--blue)">
          <MapPin color="var(--green)" style={{ top: "40%", left: "45%" }} />
        </MapBlock>
      </div>
      <div style={{ padding: 22, flex: 1 }}>
        <Row label="Customer" value={activeJob?.customerName ?? "—"} />
        <Row label="Drop-off" value={activeJob?.dropoffAddress ?? "—"} />
        <Row label="Progress" value="4.1 / 6.2 km" />
        <div className="btn-row" style={{ padding: 0, margin: "12px 0" }}>
          <a href="tel:+233267749931" className="btn" style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}>📞 Contact</a>
          <button className="btn" style={{ background: "#EEF0F2", color: "var(--ink)" }}>🧭 Navigate</button>
        </div>
        <Button label="Complete delivery" onClick={() => navigate("/rider/proof-of-delivery", { replace: true })} />
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
