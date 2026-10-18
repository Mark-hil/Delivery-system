import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Icon, IconName } from "@/components/Icon";

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: "/customer/home", label: "Home", icon: "home" },
  { to: "/customer/orders", label: "Orders", icon: "orders" },
  { to: "/customer/wallet", label: "Wallet", icon: "wallet" },
  { to: "/customer/profile", label: "Profile", icon: "profile" },
];

export const CustomerLayout: React.FC = () => (
  <div className="page">
    <div className="app-header">
      <img className="mark" src="/logo-mark.png" alt="SwiftSend" />
      <span className="name">SwiftSend — Customer</span>
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
