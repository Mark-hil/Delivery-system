import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { useDelivery } from "@/context/DeliveryContext";
import { formatCedis } from "@/utils/formatters";

export const DeliveryCompletedPage: React.FC = () => {
  const navigate = useNavigate();
  const { current, estimate } = useDelivery();

  return (
    <div className="page">
      <div className="page-scroll">
        <div
          style={{
            width: 74,
            height: 74,
            borderRadius: 37,
            background: "var(--green-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "30px auto 16px",
            fontSize: 34,
            color: "var(--green-dark)",
          }}
        >
          ✓
        </div>
        <h3 className="text-center" style={{ fontSize: 17 }}>Delivered successfully</h3>
        <p className="muted text-center" style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>Your package arrived safely</p>

        <div style={{ padding: "0 22px" }}>
          <Row label="Time taken" value={`${estimate?.etaMinutes ?? 24} min`} />
          <Row label="Distance" value={`${estimate?.distanceKm ?? 7.9} km`} />
          <Row label="Amount paid" value={formatCedis(current?.totalFee ?? estimate?.totalFee ?? 46.5)} />
          <Row label="Payment method" value="Mobile Money" />
        </div>

        <div className="btn-block-group">
          <Button label="Download receipt" variant="secondary" onClick={() => {}} />
          <Button label="Rate rider" onClick={() => navigate("/customer/rate", { replace: true })} />
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px dashed var(--line)", fontSize: 13 }}>
    <span className="muted">{label}</span>
    <span style={{ fontWeight: 700 }}>{value}</span>
  </div>
);
