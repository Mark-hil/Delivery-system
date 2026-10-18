import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Card, SectionTitle } from "@/components/Primitives";
import { MapBlock } from "@/components/MapBlock";
import { Button } from "@/components/Button";
import { useDelivery } from "@/context/DeliveryContext";
import { formatCedis } from "@/utils/formatters";

export const PriceEstimatePage: React.FC = () => {
  const navigate = useNavigate();
  const { estimate, loadingEstimate, fetchEstimate, confirmRequest } = useDelivery();

  useEffect(() => {
    if (!estimate) fetchEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequest = async () => {
    await confirmRequest();
    navigate("/customer/searching", { replace: true });
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title="Price estimate" />
        <MapBlock height={150} />

        {loadingEstimate || !estimate ? (
          <div className="loading-center">
            <div className="spinner" />
            Calculating your fare…
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, padding: "0 22px", marginBottom: 4 }}>
              <Card style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{estimate.distanceKm} km</div>
                <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>Distance</div>
              </Card>
              <Card style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{estimate.etaMinutes} min</div>
                <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>Est. time</div>
              </Card>
              <Card style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{formatCedis(estimate.totalFee)}</div>
                <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>Est. cost</div>
              </Card>
            </div>

            <SectionTitle title="Fare breakdown" />
            <div style={{ margin: "0 22px" }}>
              <Card>
                <Row label="Base fee" value={formatCedis(estimate.baseFee)} />
                <Row label="Distance fee" value={formatCedis(estimate.distanceFee)} />
                <Row label="Service fee" value={formatCedis(estimate.serviceFee)} />
                <div style={{ borderTop: "1px dashed var(--line)", margin: "6px 0" }} />
                <Row label="Total" value={formatCedis(estimate.totalFee)} bold />
              </Card>
            </div>

            <div className="btn-block-group">
              <Button label="Request rider" onClick={handleRequest} />
              <Button label="Cancel" variant="secondary" onClick={() => navigate(-1)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 400, color: bold ? "var(--ink)" : "var(--ink-soft)" }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);
