import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SectionTitle } from "@/components/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CustomerUser } from "@/types";
import * as api from "@/services/mockApi";
import { WalletTxn } from "@/services/mockApi";
import { formatCedis, formatDateTime } from "@/utils/formatters";

export const WalletPage: React.FC = () => {
  const { session } = useAuth();
  const { toast } = useUI();
  const [searchParams, setSearchParams] = useSearchParams();
  const customer = session?.user as CustomerUser;
  const [balance, setBalance] = useState<number>(customer?.walletBalance ?? 0);
  const [txns, setTxns] = useState<WalletTxn[]>([]);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    api.fetchWalletTxns().then(setTxns);
  }, []);

  // Handle returning from Paystack redirect (e.g. ?reference=ss_topup_...&status=success)
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (reference) {
      setIsProcessing(true);
      api.verifyPaystackPayment(reference).then((res) => {
        setIsProcessing(false);
        if (res.verified) {
          if (res.walletBalance !== undefined) {
            setBalance(res.walletBalance);
          }
          toast("Payment successful! Wallet balance updated via Paystack.");
          // Append new txn
          setTxns((prev) => [
            {
              id: `txn_${Date.now()}`,
              label: "Paystack Top-up (Mobile Money)",
              when: new Date().toISOString(),
              amount: 50,
            },
            ...prev,
          ]);
        } else {
          toast("Payment verification failed or was cancelled.");
        }
        // Clear params
        searchParams.delete("reference");
        searchParams.delete("status");
        setSearchParams(searchParams);
      });
    }
  }, [searchParams, setSearchParams, toast]);

  const handlePaystackTopup = async () => {
    if (!topupAmount || topupAmount <= 0) {
      toast("Please enter a valid amount.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.initializePaystackTopup(topupAmount);
      setIsProcessing(false);
      setIsTopupOpen(false);

      if (res.authorization_url) {
        // In local/mock or production, redirect to Paystack checkout or simulator
        toast(`Redirecting to Paystack checkout for GH₵ ${topupAmount.toFixed(2)}...`);
        if (res.authorization_url.startsWith("http")) {
          window.location.href = res.authorization_url;
        } else {
          // If relative route, verify directly
          const verifyRes = await api.verifyPaystackPayment(res.reference);
          if (verifyRes.walletBalance !== undefined) {
            setBalance(verifyRes.walletBalance);
          } else {
            setBalance((prev) => prev + topupAmount);
          }
          setTxns((prev) => [
            {
              id: `txn_${Date.now()}`,
              label: `Paystack MoMo Top-up (${res.reference.substring(0, 10)})`,
              when: new Date().toISOString(),
              amount: topupAmount,
            },
            ...prev,
          ]);
          toast(`Wallet successfully credited with GH₵ ${topupAmount.toFixed(2)}!`);
        }
      }
    } catch {
      setIsProcessing(false);
      toast("Failed to initiate Paystack checkout.");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 19, margin: "10px 22px 14px" }}>Wallet</h2>

      <div
        style={{
          margin: "0 22px",
          borderRadius: 20,
          padding: 20,
          background: "linear-gradient(135deg, var(--green-dark) 0%, #175438 100%)",
          boxShadow: "0 8px 24px rgba(18, 92, 58, 0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#DFF3E7", fontSize: 11.5, letterSpacing: "0.5px" }}>
            CURRENT BALANCE
          </div>
          <span
            style={{
              fontSize: 10,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 600,
            }}
          >
            Paystack Secured
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            color: "white",
            margin: "8px 0 16px",
            fontWeight: 800,
          }}
        >
          {formatCedis(balance)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              flex: 1,
              background: "white",
              border: "none",
              borderRadius: 12,
              padding: "11px 0",
              color: "var(--green-dark)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
            onClick={() => setIsTopupOpen(true)}
          >
            + Top up
          </button>
          <button
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.16)",
              border: "none",
              borderRadius: 12,
              padding: "11px 0",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
            onClick={() => toast("Withdrawal initiated to Mobile Money account.")}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Paystack Top-Up Modal */}
      {isTopupOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setIsTopupOpen(false)}
        >
          <div
            style={{
              background: "var(--bg, #FFFFFF)",
              width: "100%",
              maxWidth: 480,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: "24px 22px 34px",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Top Up Wallet</h3>
              <button
                onClick={() => setIsTopupOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                ✕
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 16px" }}>
              Add funds instantly via Mobile Money (MTN, Telecel, AT) or Bank Card.
            </p>

            {/* Presets */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              {[20, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopupAmount(amt)}
                  style={{
                    padding: "10px 0",
                    borderRadius: 12,
                    border: topupAmount === amt ? "2px solid var(--green)" : "1px solid var(--line)",
                    background: topupAmount === amt ? "var(--green-soft)" : "transparent",
                    color: topupAmount === amt ? "var(--green-dark)" : "inherit",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  GH₵ {amt}
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
                CUSTOM AMOUNT (GH₵)
              </label>
              <input
                type="number"
                min="1"
                step="5"
                value={topupAmount}
                onChange={(e) => setTopupAmount(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  fontSize: 16,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="Enter amount in GH₵"
              />
            </div>

            {/* Paystack Payment Badges */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(0,0,0,0.03)",
                borderRadius: 12,
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Channels Supported</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>MTN MoMo • Telecel • AT • Visa/MC</span>
            </div>

            <button
              disabled={isProcessing}
              onClick={handlePaystackTopup}
              style={{
                width: "100%",
                background: "var(--green-dark)",
                color: "white",
                border: "none",
                borderRadius: 14,
                padding: "14px 0",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: isProcessing ? "not-allowed" : "pointer",
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              {isProcessing
                ? "Connecting to Paystack..."
                : `Pay GH₵ ${topupAmount ? topupAmount.toFixed(2) : "0.00"} with Paystack`}
            </button>
          </div>
        </div>
      )}

      <SectionTitle title="Transactions" />
      <div className="list-grid">
        {txns.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "0 22px 10px",
              padding: 12,
              border: "1px solid var(--line)",
              borderRadius: 14,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                {formatDateTime(t.when)}
              </div>
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: t.amount < 0 ? "var(--danger)" : "var(--green-dark)",
              }}
            >
              {t.amount < 0 ? "– " : "+ "}
              {formatCedis(Math.abs(t.amount))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
