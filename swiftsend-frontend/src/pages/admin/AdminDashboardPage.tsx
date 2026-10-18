import React, { useEffect, useState } from "react";
import { KpiCard, Panel, BarChart, DataTable, Column } from "@/components/AdminWidgets";
import * as api from "@/services/mockApi";
import { formatCedis } from "@/utils/formatters";

type Overview = Awaited<ReturnType<typeof api.fetchAdminOverview>>;
type Delivery = api.AdminDeliveryRow;

export const AdminDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    api.fetchAdminOverview().then(setOverview);
    api.fetchAdminDeliveries().then(setDeliveries);
  }, []);

  if (!overview) return <div className="loading-center"><div className="spinner" /></div>;

  const columns: Column<Delivery>[] = [
    { key: "id", header: "ID", render: (r) => r.id },
    { key: "route", header: "Route", render: (r) => r.route },
    { key: "rider", header: "Rider", render: (r) => r.rider },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "amount", header: "Amount", render: (r) => formatCedis(r.amount) },
  ];

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2>Dashboard</h2>
          <div className="sub">Overview across all regions</div>
        </div>
      </div>

      <div className="kpi-row">
        <KpiCard label="Total users" value={overview.totalUsers.toLocaleString()} delta="▲ 4.2% wk" />
        <KpiCard label="Total riders" value={overview.totalRiders.toLocaleString()} delta="▲ 1.8% wk" />
        <KpiCard label="Active deliveries" value={String(overview.activeDeliveries)} delta="Live" deltaColor="var(--blue)" />
        <KpiCard label="Completed today" value={overview.completedToday.toLocaleString()} delta="▲ 6.1% wk" />
        <KpiCard label="Revenue (today)" value={formatCedis(overview.revenueToday)} delta="▲ 9.4% wk" />
      </div>

      <div className="chart-row">
        <Panel title="Daily deliveries — last 7 days">
          <BarChart values={overview.dailyDeliveries} />
        </Panel>
        <Panel title="Popular locations">
          {overview.locationShare.map((l) => (
            <div key={l.label} className="legend-row">
              <span className="legend-sw" style={{ background: l.color }} />
              {l.label} — {l.pct}%
            </div>
          ))}
        </Panel>
      </div>

      <p style={{ margin: "6px 28px", fontWeight: 600, fontSize: 13.5 }}>Recent deliveries</p>
      <DataTable columns={columns} rows={deliveries} />
    </div>
  );
};
