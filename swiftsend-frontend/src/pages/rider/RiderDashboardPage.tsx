import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock, MapPin } from "@/components/MapBlock";
import { useAuth } from "@/context/AuthContext";
import { useRiderJob } from "@/context/RiderJobContext";
import { RiderUser } from "@/types";
import { documentsExpiringSoon } from "@/services/notifications";
import { daysUntil, formatCedis } from "@/utils/formatters";

export const RiderDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const rider = session?.user as RiderUser;
  const { isOnline, toggleOnline, incomingRequest, startListening, listening } = useRiderJob();

  useEffect(() => {
    if (incomingRequest) navigate("/rider/request-popup");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingRequest]);

  const expiringSoon = documentsExpiringSoon(rider?.documents ?? []);

  return (
    <div>
      <div style={{ margin: "16px 22px", borderRadius: 20, padding: 20, background: "var(--ink)" }}>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11.5 }}>Today's earnings</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "white", margin: "6px 0 14px" }}>{formatCedis(312.8)}</div>
        <div style={{ display: "flex", gap: 20 }}>
          <Stat n="11" l="Completed" />
          <Stat n="3" l="Pending" />
          <Stat n={String(rider?.rating || "New")} l="Rating" />
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "0 22px 14px", padding: 12, borderRadius: 14, background: "var(--warning-soft)" }}>
          <span>⏰</span>
          <p style={{ fontSize: 11.5, color: "#9A4B0A", lineHeight: 1.5 }}>
            {expiringSoon[0].label} expires in {daysUntil(expiringSoon[0].expiresAt!)} day
            {daysUntil(expiringSoon[0].expiresAt!) === 1 ? "" : "s"}. Renew it from your profile soon.
          </p>
        </div>
      )}

      <button
        onClick={toggleOnline}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "calc(100% - 44px)",
          margin: "0 22px 16px",
          padding: 14,
          borderRadius: 16,
          background: "var(--green-soft)",
          border: "none",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--green-dark)" }}>{isOnline ? "You're online" : "You're offline"}</span>
        <span className={`switch ${isOnline ? "on" : ""}`}>
          <span className="knob" />
        </span>
      </button>

      <MapBlock badge="3 requests nearby">
        <MapPin color="var(--green)" style={{ top: "40%", left: "45%" }} />
      </MapBlock>

      <p style={{ margin: "0 22px 10px", fontWeight: 600, fontSize: 14.5 }}>New requests</p>
      <button
        onClick={startListening}
        disabled={!isOnline || listening}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "calc(100% - 44px)",
          margin: "0 22px",
          padding: 16,
          borderRadius: 16,
          border: `1.6px dashed ${isOnline ? "var(--green)" : "var(--line)"}`,
          background: "white",
          color: isOnline ? "var(--green-dark)" : "var(--gray)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {listening ? "Listening…" : isOnline ? "📡 Listen for a delivery request" : "Go online to receive requests"}
      </button>
    </div>
  );
};

const Stat: React.FC<{ n: string; l: string }> = ({ n, l }) => (
  <div>
    <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{n}</div>
    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{l}</div>
  </div>
);
