import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Icon, IconName } from "@/components/Icon";

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: "/rider/dashboard", label: "Home", icon: "home" },
  { to: "/rider/earnings", label: "Earnings", icon: "earnings" },
  { to: "/rider/profile", label: "Profile", icon: "profile" },
];

export const RiderLayout: React.FC = () => (
  <div className="page">
    <div className="app-header">
      <img className="mark" src="/logo-mark.png" alt="SwiftSend" />
      <span className="name">SwiftSend — Rider</span>
      <span className="spacer" />
    </div>

    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `item ${isActive ? "active" : ""}`}>
          <Icon name={t.icon} />
          {t.label}
        </NavLink>
      ))}
    </nav>

    <div className="page-scroll">
      <Outlet />
    </div>
  </div>
);
