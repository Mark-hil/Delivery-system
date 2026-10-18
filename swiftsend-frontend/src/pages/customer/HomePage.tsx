import React from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock, MapPin } from "@/components/MapBlock";
import { SectionTitle, StatusBadge } from "@/components/Primitives";
import { useAuth } from "@/context/AuthContext";
import { CustomerUser } from "@/types";

const quickActions = [
  { label: "Send package", bg: "var(--green-soft)", icon: "📦" },
  { label: "Schedule", bg: "#FFF6DE", icon: "📅" },
  { label: "Business", bg: "var(--blue-soft)", icon: "💼" },
  { label: "Saved", bg: "var(--purple-soft)", icon: "🔖" },
];

const recents: { initials: string; title: string; sub: string; status: string; tone: "green" | "red" }[] = [
  { initials: "AD", title: "To Ama D. — Adenta", sub: "Yesterday · GH₵ 38", status: "Delivered", tone: "green" },
  { initials: "KK", title: "To Kofi K. — East Legon", sub: "Mon · GH₵ 54.50", status: "Cancelled", tone: "red" },
  { initials: "EB", title: "To Efua B. — Dansoman", sub: "Sun · GH₵ 27", status: "Delivered", tone: "green" },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const customer = session?.user as CustomerUser;

  return (
    <div>
      <div style={{ padding: "16px 22px 0" }}>
        <h2 style={{ fontSize: 18 }}>Hi {customer?.fullName?.split(" ")[0] ?? "there"} 👋</h2>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
          Where do you need a delivery today?
        </p>
      </div>

      <button
        onClick={() => navigate("/customer/request")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--bg)",
          borderRadius: 14,
          padding: 14,
          margin: "16px 22px 0",
          border: "1px solid var(--line)",
          width: "calc(100% - 44px)",
          textAlign: "left",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--green)" }} />
        <span className="muted" style={{ fontSize: 13.5 }}>
          Where are we picking up from?
        </span>
      </button>

      <MapBlock badge="● 6 riders nearby">
        <MapPin color="var(--blue)" style={{ bottom: "34%", left: "30%" }} />
        <MapPin color="var(--green)" style={{ top: "26%", left: "58%" }} />
      </MapBlock>

      <div style={{ display: "flex", gap: 10, padding: "0 22px" }}>
        {quickActions.map((q) => (
          <button
            key={q.label}
            onClick={() => navigate("/customer/request")}
            style={{ flex: 1, background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: 14, textAlign: "center" }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 9, background: q.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 14 }}>
              {q.icon}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 600 }}>{q.label}</div>
          </button>
        ))}
      </div>

      <div
        style={{
          margin: "16px 22px",
          borderRadius: 18,
          padding: 18,
          background: "var(--green-dark)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "white" }}>Your first delivery's on us</div>
          <div style={{ fontSize: 11.5, color: "#DFF3E7", marginTop: 3 }}>Any drop-off under 5km, just this week</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 10, padding: "8px 12px", fontWeight: 800, fontSize: 13, color: "white" }}>
          –100%
        </div>
      </div>

      <SectionTitle title="Recent deliveries" action="See all" onAction={() => navigate("/customer/orders")} />
      <div className="list-grid">
        {recents.map((r) => (
          <div key={r.title} className="row-list-item">
            <div className="icon">{r.initials}</div>
            <div className="meta">
              <div className="title">{r.title}</div>
              <div className="sub">{r.sub}</div>
            </div>
            <StatusBadge label={r.status} tone={r.tone} />
          </div>
        ))}
      </div>
    </div>
  );
};
