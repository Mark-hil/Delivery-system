import React from "react";

export const KpiCard: React.FC<{ label: string; value: string; delta?: string; deltaColor?: string }> = ({
  label,
  value,
  delta,
  deltaColor,
}) => (
  <div className="kpi-card">
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {delta && (
      <div className="delta" style={deltaColor ? { color: deltaColor } : undefined}>
        {delta}
      </div>
    )}
  </div>
);

export const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="panel">
    <h3>{title}</h3>
    {children}
  </div>
);

export const BarChart: React.FC<{ values: number[]; light?: boolean }> = ({ values, light }) => {
  const max = Math.max(...values, 1);
  return (
    <div className="bars">
      {values.map((v, i) => (
        <div key={i} className={`bar ${light ? "light" : ""}`} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
};

export const AddButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button className="add-btn" onClick={onClick}>
    + {label}
  </button>
);

export const IconAction: React.FC<{ icon: string; color?: string; title: string; onClick: () => void }> = ({
  icon,
  color,
  title,
  onClick,
}) => (
  <button className="icon-action" style={color ? { color } : undefined} title={title} onClick={onClick}>
    {icon}
  </button>
);

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                No records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
