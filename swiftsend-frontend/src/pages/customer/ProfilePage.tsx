import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CustomerUser } from "@/types";

const menu = [
  { icon: "📍", label: "Saved addresses" },
  { icon: "💳", label: "Payment methods" },
  { icon: "🔔", label: "Notification settings" },
  { icon: "🎧", label: "Support" },
];

export const ProfilePage: React.FC = () => {
  const { session, signOut } = useAuth();
  const { toast, confirm } = useUI();
  const customer = session?.user as CustomerUser;

  const handleLogout = async () => {
    const ok = await confirm({ title: "Log out", message: "Are you sure you want to log out?", confirmLabel: "Log out", destructive: true });
    if (ok) await signOut();
  };

  return (
    <div>
      <div style={{ textAlign: "center", padding: "24px 22px 10px" }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            background: "var(--green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 10px",
            color: "white",
            fontFamily: "var(--font-display)",
            fontSize: 22,
          }}
        >
          {customer?.avatarInitials}
        </div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{customer?.fullName}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{customer?.phone}</div>
      </div>

      {menu.map((m) => (
        <button key={m.label} className="menu-row" onClick={() => toast(`${m.label} isn't wired up in this demo build.`)}>
          <div className="icon-wrap">{m.icon}</div>
          <span className="label">{m.label}</span>
          <span className="muted">›</span>
        </button>
      ))}

      <button className="menu-row" onClick={handleLogout}>
        <div className="icon-wrap">↪</div>
        <span className="label" style={{ color: "var(--danger)" }}>Logout</span>
      </button>
    </div>
  );
};
