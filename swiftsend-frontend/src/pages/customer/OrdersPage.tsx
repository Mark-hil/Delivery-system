import React, { useEffect, useState } from "react";
import { StatusBadge, BadgeTone } from "@/components/Primitives";
import * as api from "@/services/mockApi";
import { OrderSummary } from "@/services/mockApi";
import { formatCedis } from "@/utils/formatters";

const tabs = ["Active", "Completed", "Cancelled"] as const;
const statusTone: Record<string, BadgeTone> = {
  "In transit": "blue",
  Arriving: "purple",
  Pending: "gray",
  Delivered: "green",
  Cancelled: "red",
};

export const OrdersPage: React.FC = () => {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Active");
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);

  useEffect(() => {
    api.fetchCustomerOrders().then(setOrders);
  }, []);

  const filtered =
    orders?.filter((o) => {
      if (tab === "Active") return ["In transit", "Arriving", "Pending"].includes(o.status);
      if (tab === "Completed") return o.status === "Delivered";
      return o.status === "Cancelled";
    }) ?? [];

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
        <p className="muted text-center" style={{ marginTop: 30, fontSize: 13 }}>No {tab.toLowerCase()} orders yet.</p>
      ) : (
        <div className="list-grid">
          {filtered.map((o) => (
            <div key={o.id} className="row-list-item">
              <div className="icon">→</div>
              <div className="meta">
                <div className="title">{o.route}</div>
                <div className="sub">
                  {o.status} · {formatCedis(o.amount)}
                </div>
              </div>
              <StatusBadge label={o.status} tone={statusTone[o.status] ?? "gray"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
