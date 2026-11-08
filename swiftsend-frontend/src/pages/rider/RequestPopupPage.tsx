import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock } from "@/components/MapBlock";
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
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={() => {
            rejectIncoming();
            navigate("/rider/dashboard", { replace: true });
          }}
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: "50%",
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 700,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          ←
        </button>
      </div>

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
          pickupAddress={incomingRequest.pickupAddress}
          dropoffAddress={incomingRequest.dropoffAddress}
          badge={`${incomingRequest.distanceKm} km · Route preview`}
        />
      </div>

      <div
        style={{
          padding: 22,
          borderRadius: "24px 24px 0 0",
          background: "white",
          boxShadow: "0 -10px 30px rgba(0,0,0,.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14 }}>New delivery request</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--green-dark)",
            }}
          >
            {formatCedis(incomingRequest.payout)}
          </span>
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
