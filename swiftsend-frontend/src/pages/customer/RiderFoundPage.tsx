import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/Primitives";
import { Button } from "@/components/Button";
import { useDelivery } from "@/context/DeliveryContext";

export const RiderFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { current, resetFlow } = useDelivery();

  return (
    <div className="page">
      <div className="page-scroll">
        <div style={{ textAlign: "center", paddingTop: 30 }}>
          <div style={{ width: 76, height: 76, borderRadius: 38, background: "var(--yellow)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16 }}>{current?.riderName ?? "Your rider"}</h3>
          <p className="muted" style={{ fontSize: 12, marginTop: 3 }}>Honda CB125 · GT 4471-22 · ⭐ 4.9</p>
        </div>

        <div style={{ margin: "10px 22px" }}>
          <Card style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>4 min</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>Estimated arrival</div>
          </Card>
        </div>

        <div className="btn-row" style={{ marginTop: 16, marginBottom: 10 }}>
          <a href="tel:+233204451198" className="btn" style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}>
            📞 Call rider
          </a>
          <button className="btn" style={{ background: "#EEF0F2", color: "var(--ink)" }}>
            💬 Message
          </button>
        </div>

        <div className="btn-block-group">
          <Button label="Continue to tracking" onClick={() => navigate("/customer/tracking", { replace: true })} />
          <Button
            label="Cancel"
            variant="danger"
            onClick={() => {
              resetFlow();
              navigate("/customer/home", { replace: true });
            }}
          />
        </div>
      </div>
    </div>
  );
};
