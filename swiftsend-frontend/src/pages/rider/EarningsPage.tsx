import React, { useEffect, useState } from "react";
import { SectionTitle } from "@/components/Primitives";
import { Button } from "@/components/Button";
import * as api from "@/services/mockApi";
import { EarningsSummary } from "@/services/mockApi";
import { formatCedis, formatDateTime } from "@/utils/formatters";

const ranges = ["Daily", "Weekly", "Monthly"] as const;

export const EarningsPage: React.FC = () => {
  const [range, setRange] = useState<(typeof ranges)[number]>("Daily");
  const [data, setData] = useState<EarningsSummary | null>(null);

  useEffect(() => {
    api.fetchEarnings().then(setData);
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 19, margin: "10px 22px 14px" }}>Earnings</h2>
      <div style={{ display: "flex", gap: 6, padding: "0 22px", marginBottom: 14 }}>
        {ranges.map((r) => (
          <button key={r} className={`filter-chip ${range === r ? "selected" : ""}`} onClick={() => setRange(r)}>
            {r}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="loading-center">
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div style={{ margin: "0 22px", borderRadius: 20, padding: 20, background: "var(--ink)", marginBottom: 6 }}>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11.5 }}>{range}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "white", margin: "6px 0 14px" }}>{formatCedis(data.today)}</div>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{data.completedToday}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>Trips</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{data.onlineHours}h</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>Online</div>
              </div>
            </div>
          </div>

          <SectionTitle title="Transaction history" />
          <div className="list-grid">
            {data.history.map((h) => (
              <div key={h.id} style={{ display: "flex", justifyContent: "space-between", margin: "0 22px 10px", padding: 12, border: "1px solid var(--line)", borderRadius: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{h.label}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{formatDateTime(h.when)}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green-dark)" }}>+ {formatCedis(h.amount)}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "4px 22px 0" }}>
            <Button label="Withdraw" variant="secondary" onClick={() => {}} />
          </div>
        </>
      )}
    </div>
  );
};
