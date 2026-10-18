import React from "react";
import { useNavigate } from "react-router-dom";

export const TopBar: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <button className="circ" onClick={onBack ?? (() => navigate(-1))} aria-label="Go back">
        ←
      </button>
      <span className="title">{title}</span>
      <span style={{ width: 34 }} />
    </div>
  );
};
