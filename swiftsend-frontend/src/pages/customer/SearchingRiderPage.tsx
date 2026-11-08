import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { MapBlock } from "@/components/MapBlock";
import { useDelivery } from "@/context/DeliveryContext";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";

export const SearchingRiderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useUI();
  const { draft, waitForMatch, loadingMatch, resetFlow } = useDelivery();

  useEffect(() => {
    (async () => {
      const ref = searchParams.get("reference") || searchParams.get("trxref");
      if (ref) {
        try {
          await api.verifyPaystackPayment(ref);
          toast("Payment verified! Dispatching nearby rider…");
        } catch {
          // Non-fatal if already verified
        }
        setSearchParams({}, { replace: true });
      }
      await waitForMatch();
      navigate("/customer/rider-found", { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page" style={{ justifyContent: "space-between" }}>
      <MapBlock
        height={220}
        pickupAddress={draft.pickupAddress}
        dropoffAddress={draft.dropoffAddress}
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
        badge="Searching nearby riders…"
        showNearbyRiders
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px" }}>
        <div className="pulse-wrap">
          <div className="pulse-ring" />
          <div className="pulse-ring delay" />
          <div className="pulse-core" />
        </div>
        <h3 style={{ fontSize: 16, marginBottom: 6, textAlign: "center" }}>Searching nearby riders…</h3>
        <p className="muted text-center" style={{ fontSize: 13 }}>Broadcasting your request to riders near {draft.pickupAddress.split(",")[0]}</p>
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
