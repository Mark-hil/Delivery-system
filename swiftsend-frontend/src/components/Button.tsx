import React from "react";

interface Props {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}

export const Button: React.FC<Props> = ({ label, onClick, variant = "primary", loading, disabled, type = "button" }) => (
  <button
    type={type}
    className={`btn btn-${variant}`}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading ? "…" : label}
  </button>
);
