import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock, MapPin } from "@/components/MapBlock";
import { Button } from "@/components/Button";
import { useRiderJob } from "@/context/RiderJobContext";
import { formatCedis } from "@/utils/formatters";

export const RequestPopupPage: React.FC = () => {
  const navigate = useNavigate();
  const { incomingRequest, acceptIncoming, rejectIncoming } = useRiderJob();

  useEffect(() => {
    if (!incomingRequest) navigate("/rider/dashboard", { replace: true });
  }, [incomingRequest, navigate]);

  if (!incomingRequest) return null;

  return (
    <div className="page">
      <div style={{ flex: 1, position: "relative" }}>
        <MapBlock flat>
          <MapPin color="var(--green)" style={{ top: "40%", left: "45%" }} />
        </MapBlock>
      </div>

      <div style={{ padding: 22, borderRadius: "24px 24px 0 0", background: "white", boxShadow: "0 -10px 30px rgba(0,0,0,.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>New delivery request</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--green-dark)" }}>{formatCedis(incomingRequest.payout)}</span>
        </div>
        <Row label="Pickup" value={incomingRequest.pickupAddress} />
        <Row label="Destination" value={incomingRequest.dropoffAddress} />
        <Row label="Distance" value={`${incomingRequest.distanceKm} km`} />
        <Row label="Package type" value={incomingRequest.packageType} />

        <div className="btn-row" style={{ padding: 0, marginTop: 14 }}>
          <Button
            label="Reject"
            variant="danger"
            onClick={() => {
              rejectIncoming();
              navigate("/rider/dashboard", { replace: true });
            }}
          />
          <Button
            label="Accept"
            onClick={async () => {
              await acceptIncoming();
              navigate("/rider/pickup", { replace: true });
            }}
          />
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
    <span className="muted">{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
);
