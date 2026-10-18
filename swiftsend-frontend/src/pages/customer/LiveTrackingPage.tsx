import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapBlock, MapPin } from "@/components/MapBlock";
import { StatusBadge } from "@/components/Primitives";
import { useDelivery } from "@/context/DeliveryContext";
import { useUI } from "@/context/UIContext";

export const LiveTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { finishDelivery } = useDelivery();
  const { toast } = useUI();
  const [etaMin, setEtaMin] = useState(6);

  useEffect(() => {
    const tick = setInterval(() => setEtaMin((m) => Math.max(0, m - 1)), 4000);
    const finish = setTimeout(async () => {
      await finishDelivery();
      navigate("/customer/completed", { replace: true });
    }, 9000);
    return () => {
      clearInterval(tick);
      clearTimeout(finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page" style={{ position: "relative" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <MapBlock flat routeColor="var(--blue)">
          <MapPin color="var(--blue)" style={{ bottom: "34%", left: "30%" }} />
          <MapPin color="var(--green)" style={{ top: "26%", left: "58%" }} />
        </MapBlock>

        <div
          style={{
            position: "absolute",
            top: 16,
            left: 22,
            right: 22,
            background: "white",
            borderRadius: 16,
            padding: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div>
            <div className="muted" style={{ fontSize: 10.5 }}>Arriving in</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--green-dark)" }}>{etaMin} min</div>
          </div>
          <StatusBadge label="In transit" tone="blue" />
        </div>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "24px 24px 0 0",
          padding: "18px 22px 24px",
          boxShadow: "0 -10px 30px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 23, background: "var(--yellow)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Kwame Mensah</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Honda CB125 · GT 4471-22 · ⭐ 4.9</div>
          </div>
          <div className="muted" style={{ fontSize: 11, textAlign: "right" }}>2.1 km<br />remaining</div>
        </div>
        <div className="btn-row" style={{ padding: 0 }}>
          <a href="tel:+233204451198" className="btn" style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}>📞 Call</a>
          <button className="btn" style={{ background: "#EEF0F2", color: "var(--ink)" }}>💬 Chat</button>
          <button
            className="btn"
            style={{ background: "#FFF6DE", color: "#9A6B00" }}
            onClick={() => navigator.share?.({ text: "Track my SwiftSend delivery live." }).catch(() => {})}
          >
            ↗ Share
          </button>
          <button
            className="btn"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            onClick={() => toast("Emergency alert sent to SwiftSend support.")}
          >
            ⚠ SOS
          </button>
        </div>
      </div>
    </div>
  );
};
