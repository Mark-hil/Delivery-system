import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Card, SectionTitle } from "@/components/Primitives";
import { MapBlock } from "@/components/MapBlock";
import { Button } from "@/components/Button";
import { useDelivery } from "@/context/DeliveryContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";
import { CustomerUser } from "@/types";
import { formatCedis } from "@/utils/formatters";

export const PriceEstimatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useUI();
  const { session } = useAuth();
  const { draft, estimate, loadingEstimate, fetchEstimate, confirmRequest } = useDelivery();

  const customer = session?.role === "customer" ? (session.user as CustomerUser) : null;
  const walletBalance = customer?.walletBalance ?? 0;

  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "card" | "wallet">("mobile_money");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.pickupAddress, draft.dropoffAddress, draft.vehicleType, draft.pickupLat, draft.dropoffLat]);

  useEffect(() => {
    if (estimate) {
      if (walletBalance >= estimate.totalFee) {
        setPaymentMethod("wallet");
      } else {
        setPaymentMethod("mobile_money");
      }
    }
  }, [estimate, walletBalance]);

  const handleRequest = async () => {
    if (!estimate) return;
    setSubmitting(true);
    try {
      const delivery = await confirmRequest(paymentMethod);
      if (!delivery) return;

      if (paymentMethod === "mobile_money" || paymentMethod === "card") {
        const callbackUrl = `${window.location.origin}/customer/searching`;
        const init = await api.initializeDeliveryPayment(delivery.id, callbackUrl);

        // If external Paystack hosted checkout URL, redirect browser
        if (
          init.authorization_url.startsWith("http") &&
          !init.authorization_url.startsWith(window.location.origin)
        ) {
          window.location.href = init.authorization_url;
          return;
        }

        // Local / Sandbox Paystack verification: settle immediately and proceed to rider search
        await api.verifyPaystackPayment(init.reference);
        toast(`Payment of ${formatCedis(estimate.totalFee)} confirmed! Dispatching rider…`);
      }

      navigate("/customer/searching", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request rider";
      if (/insufficient wallet balance/i.test(msg)) {
        const useDirect = await confirm({
          title: "Insufficient Wallet Balance",
          message: `${msg}. Switch to direct Mobile Money / Card payment to pay ${formatCedis(estimate.totalFee)} now?`,
          confirmLabel: "Pay Direct (MoMo / Card)",
        });
        if (useDirect) {
          setPaymentMethod("mobile_money");
        }
      } else {
        toast(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title="Price estimate" />
        <MapBlock
          height={175}
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
          badge={estimate ? `${estimate.distanceKm} km · ${estimate.etaMinutes} min` : undefined}
        />

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

            <SectionTitle title="Payment method" />
            <div style={{ margin: "0 22px", display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPaymentMethod("mobile_money")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: paymentMethod === "mobile_money" ? "2px solid var(--green)" : "1px solid var(--line)",
                  background: paymentMethod === "mobile_money" ? "var(--green-soft)" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>
                    📱 Mobile Money / Card (Pay Direct)
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                    Pay {formatCedis(estimate.totalFee)} directly via Paystack checkout
                  </div>
                </div>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: paymentMethod === "mobile_money" ? "5px solid var(--green)" : "2px solid #CBD5E1",
                  }}
                />
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("wallet")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: paymentMethod === "wallet" ? "2px solid var(--green)" : "1px solid var(--line)",
                  background: paymentMethod === "wallet" ? "var(--green-soft)" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>
                    💳 SwiftSend Wallet
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                    Available balance: {formatCedis(walletBalance)}
                    {walletBalance < estimate.totalFee ? " (Insufficient for wallet payment)" : ""}
                  </div>
                </div>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: paymentMethod === "wallet" ? "5px solid var(--green)" : "2px solid #CBD5E1",
                  }}
                />
              </button>
            </div>

            <div className="btn-block-group">
              <Button
                label={
                  paymentMethod === "wallet"
                    ? "Request rider (Wallet)"
                    : `Pay ${formatCedis(estimate.totalFee)} & Request rider`
                }
                loading={submitting}
                onClick={handleRequest}
              />
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
