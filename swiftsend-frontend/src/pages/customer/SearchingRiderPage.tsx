import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { useDelivery } from "@/context/DeliveryContext";

export const SearchingRiderPage: React.FC = () => {
  const navigate = useNavigate();
  const { waitForMatch, loadingMatch, resetFlow } = useDelivery();

  useEffect(() => {
    (async () => {
      await waitForMatch();
      navigate("/customer/rider-found", { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page" style={{ justifyContent: "space-between" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px" }}>
        <div className="pulse-wrap">
          <div className="pulse-ring" />
          <div className="pulse-ring delay" />
          <div className="pulse-core" />
        </div>
        <h3 style={{ fontSize: 16, marginBottom: 6, textAlign: "center" }}>Searching nearby riders…</h3>
        <p className="muted text-center" style={{ fontSize: 13 }}>4 riders are close to your pickup point</p>
      </div>
      <div style={{ padding: "0 22px 22px" }}>
        <Button
          label="Cancel request"
          variant="danger"
          loading={loadingMatch}
          onClick={() => {
            resetFlow();
            navigate("/customer/home", { replace: true });
          }}
        />
      </div>
    </div>
  );
};
