import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { RiderUser } from "@/types";
import { daysUntil, formatDate } from "@/utils/formatters";

export const RiderProfilePage: React.FC = () => {
  const { session, signOut } = useAuth();
  const { toast, confirm } = useUI();
  const rider = session?.user as RiderUser;

  const handleLogout = async () => {
    const ok = await confirm({ title: "Log out", confirmLabel: "Log out", destructive: true });
    if (ok) await signOut();
  };

  return (
    <div>
      <div style={{ textAlign: "center", padding: "24px 22px 6px" }}>
        {rider?.facePhotoUri && !rider.facePhotoUri.startsWith("mock://") ? (
          <img
            src={rider.facePhotoUri}
            alt={rider.fullName}
            style={{ width: 76, height: 76, borderRadius: 38, objectFit: "cover", margin: "0 auto 10px" }}
          />
        ) : (
          <div style={{ width: 76, height: 76, borderRadius: 38, background: "var(--yellow)", margin: "0 auto 10px" }} />
        )}
        <div style={{ fontWeight: 700, fontSize: 16 }}>{rider?.fullName}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          ⭐ {rider?.rating || "New"} · {rider?.trips} trips
        </div>
      </div>

      <p style={{ margin: "16px 22px 8px", fontWeight: 600, fontSize: 13 }}>Vehicle</p>
      <div className="card" style={{ margin: "0 22px" }}>
        <div className="kv-row">
          <span className="k">Type</span>
          <span className="v" style={{ textTransform: "capitalize" }}>{rider?.vehicleType}</span>
        </div>
        <div className="kv-row">
          <span className="k">Plate number</span>
          <span className="v">{rider?.plateNumber}</span>
        </div>
      </div>

      <p style={{ margin: "16px 22px 8px", fontWeight: 600, fontSize: 13 }}>Documents</p>
      <div className="card" style={{ margin: "0 22px" }}>
        {rider?.documents.map((d) => {
          const expired = d.expiresAt ? daysUntil(d.expiresAt) <= 0 : false;
          const soon = d.expiresAt ? daysUntil(d.expiresAt) > 0 && daysUntil(d.expiresAt) <= 14 : false;
          return (
            <div key={d.kind} className="kv-row">
              <span className="k">{d.label}</span>
              <span className="v" style={{ color: expired ? "var(--danger)" : soon ? "var(--warning)" : "var(--ink)" }}>
                {d.expiresAt ? `Until ${formatDate(d.expiresAt)}` : d.uri ? "Uploaded" : "Not uploaded"}
              </span>
            </div>
          );
        })}
      </div>

      <button className="menu-row" style={{ marginTop: 10 }} onClick={() => toast("Ratings isn't wired up in this demo build.")}>
        <div className="icon-wrap">⭐</div>
        <span className="label">Ratings</span>
      </button>
      <button className="menu-row" onClick={() => toast("Settings isn't wired up in this demo build.")}>
        <div className="icon-wrap">⚙️</div>
        <span className="label">Settings</span>
      </button>
      <button className="menu-row" onClick={handleLogout}>
        <div className="icon-wrap">↪</div>
        <span className="label" style={{ color: "var(--danger)" }}>Logout</span>
      </button>
    </div>
  );
};
