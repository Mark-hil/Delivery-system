import React from "react";

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div className="card" style={style}>
    {children}
  </div>
);

export type BadgeTone = "gray" | "blue" | "orange" | "purple" | "cyan" | "green" | "red";

export const StatusBadge: React.FC<{ label: string; tone: BadgeTone }> = ({ label, tone }) => (
  <span className={`badge badge-${tone}`}>{label}</span>
);

export const SectionTitle: React.FC<{ title: string; action?: string; onAction?: () => void }> = ({
  title,
  action,
  onAction,
}) => (
  <div className="section-title">
    <h3>{title}</h3>
    {action && (
      <button className="action" onClick={onAction}>
        {action}
      </button>
    )}
  </div>
);
