import React, { useEffect, useState } from "react";
import { Panel, BarChart } from "@/components/AdminWidgets";
import * as api from "@/services/mockApi";
import { formatCedis } from "@/utils/formatters";

export const AdminReportsPage: React.FC = () => {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.fetchAdminReports>> | null>(null);

  useEffect(() => {
    api.fetchAdminReports().then(setData);
  }, []);

  if (!data) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2>Reports</h2>
          <div className="sub">Revenue, top riders &amp; customers, delivery analytics</div>
        </div>
      </div>

      <div className="chart-row">
        <Panel title="Revenue trend — 6 months">
          <BarChart values={data.revenueTrend} light />
        </Panel>
        <Panel title="Top riders">
          {data.topRiders.map((r, i) => (
            <div key={r.name} className="kv-row">
              <span className="k">
                {i + 1}. {r.name}
              </span>
              <span className="v">{formatCedis(r.amount)}</span>
            </div>
          ))}
        </Panel>
      </div>

      <div className="chart-row" style={{ gridTemplateColumns: "1fr" }}>
        <Panel title="Top customers this month">
          {data.topCustomers.map((c) => (
            <div key={c.name} className="kv-row">
              <span className="k">{c.name}</span>
              <span className="v">{c.deliveries} deliveries</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
};
