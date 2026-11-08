import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBadge, BadgeTone } from "@/components/Primitives";
import { useDelivery } from "@/context/DeliveryContext";
import * as api from "@/services/mockApi";
import { OrderSummary } from "@/services/mockApi";
import { formatCedis } from "@/utils/formatters";

const tabs = ["Active", "Completed", "Cancelled"] as const;
const statusTone: Record<string, BadgeTone> = {
  "In transit": "blue",
  "In Transit": "blue",
  Arriving: "purple",
  "Rider Arriving": "purple",
  Pending: "gray",
  "Searching Rider": "gray",
  "Rider Accepted": "blue",
  "Picked Up": "blue",
  Delivered: "green",
  Cancelled: "red",
};

const ACTIVE_STATUS_SET = new Set([
  "In transit",
  "In Transit",
  "Arriving",
  "Rider Arriving",
  "Pending",
  "Searching Rider",
  "Rider Accepted",
  "Picked Up",
]);

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDraft } = useDelivery();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Active");
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);

  useEffect(() => {
    api.fetchCustomerOrders().then(setOrders);
  }, []);

  const filtered =
    orders?.filter((o) => {
      if (tab === "Active") return ACTIVE_STATUS_SET.has(o.status);
      if (tab === "Completed") return o.status === "Delivered";
      return o.status === "Cancelled";
    }) ?? [];

  const handleTrackOrder = (order: OrderSummary) => {
    if (order.pickupAddress && order.dropoffAddress) {
      setDraft({
        pickupAddress: order.pickupAddress,
        dropoffAddress: order.dropoffAddress,
        pickupLat: undefined,
        pickupLng: undefined,
        dropoffLat: undefined,
        dropoffLng: undefined,
      });
    }
    if (order.status === "Pending" || order.status === "Searching Rider") {
      navigate("/customer/searching");
    } else {
      navigate("/customer/tracking");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 19, margin: "10px 22px 14px" }}>Orders</h2>
      <div style={{ display: "flex", gap: 6, padding: "0 22px", marginBottom: 14 }}>
        {tabs.map((t) => (
          <button key={t} className={`filter-chip ${tab === t ? "selected" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {!orders ? (
        <div className="loading-center">
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="muted text-center" style={{ marginTop: 30, fontSize: 13 }}>
          No {tab.toLowerCase()} orders yet.
        </p>
      ) : (
        <div className="list-grid">
          {filtered.map((o) => {
            const isActive = ACTIVE_STATUS_SET.has(o.status);
            const numericAmount =
              typeof o.amount === "number"
                ? o.amount
                : parseFloat(String(o.amount).replace(/[^0-9.]/g, "")) || 0;

            return (
              <div
                key={o.id}
                className="row-list-item"
                onClick={isActive ? () => handleTrackOrder(o) : undefined}
                style={{ cursor: isActive ? "pointer" : "default" }}
              >
                <div className="icon">📦</div>
                <div className="meta">
                  <div className="title">{o.route}</div>
                  <div className="sub">
                    {o.trackingNumber ? `#${o.trackingNumber} · ` : ""}
                    {formatCedis(numericAmount)} · {o.when}
                  </div>
                  {isActive && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--green-dark)",
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      {o.deliveryOtp && <span>🔐 OTP: {o.deliveryOtp}</span>}
                      <span>🗺 Tap to track live →</span>
                    </div>
                  )}
                </div>
                <StatusBadge label={o.status} tone={statusTone[o.status] ?? "gray"} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
