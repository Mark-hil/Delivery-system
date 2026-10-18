import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock, MapPin } from "@/components/MapBlock";
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

  return (
    <div className="page">
      <div className="page-scroll">
        <MapBlock height={220}>
          <MapPin color="var(--green)" style={{ top: "40%", left: "45%" }} />
        </MapBlock>

        <SectionTitle title="Customer" />
        <div className="row-list-item">
          <div className="icon">{activeJob?.customerName?.slice(0, 2).toUpperCase() ?? "CU"}</div>
          <div className="meta">
            <div className="title">{activeJob?.customerName ?? "Customer"}</div>
            <div className="sub">{activeJob?.pickupAddress ?? "Pickup location"} · Documents pickup</div>
          </div>
        </div>

        <div className="btn-row" style={{ marginBottom: 14 }}>
          <a href="tel:+233267749931" className="btn" style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}>📞 Call customer</a>
          <button className="btn" style={{ background: "#EEF0F2", color: "var(--ink)" }}>🧭 Navigate</button>
        </div>

        <div className="btn-block-group">
          <Button label="Arrived at pickup" variant="secondary" onClick={() => setArrived(true)} />
          <Button label="Package picked up" onClick={confirmPickedUp} loading={loading} disabled={!arrived} />
        </div>
      </div>
    </div>
  );
};
