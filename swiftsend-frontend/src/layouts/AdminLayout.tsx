import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

const modules = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/admin/users", label: "Users", icon: "👥" },
  { to: "/admin/riders", label: "Riders", icon: "🏍" },
  { to: "/admin/deliveries", label: "Deliveries", icon: "📦" },
  { to: "/admin/payments", label: "Payments", icon: "💳" },
  { to: "/admin/reports", label: "Reports", icon: "📈" },
  { to: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export const AdminLayout: React.FC = () => {
  const { session, signOut } = useAuth();
  const { confirm } = useUI();

  const handleLogout = async () => {
    const ok = await confirm({ title: "Log out", message: "Are you sure you want to log out?", confirmLabel: "Log out", destructive: true });
    if (ok) await signOut();
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <img src="/logo-mark.png" alt="SwiftSend" style={{ width: 30, height: 30, objectFit: "contain" }} />
          <div>
            <div className="name">SwiftSend Admin</div>
            <div className="sub">{session?.user.fullName ?? "Admin"}</div>
          </div>
        </div>

        {modules.map((m) => (
          <NavLink key={m.to} to={m.to} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}>
            <span>{m.icon}</span>
            {m.label}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />
        <button className="admin-nav-item" onClick={handleLogout} style={{ color: "#f08a93" }}>
          <span>↪</span>
          Log out
        </button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};
