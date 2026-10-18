import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { StarRating } from "@/components/Misc";
import { useDelivery } from "@/context/DeliveryContext";
import * as api from "@/services/mockApi";

export const RateRiderPage: React.FC = () => {
  const navigate = useNavigate();
  const { current, resetFlow } = useDelivery();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.submitRating(current?.id ?? "", stars, comment);
      resetFlow();
      navigate("/customer/home", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <div style={{ textAlign: "center", paddingTop: 26 }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: "var(--yellow)", margin: "0 auto 10px" }} />
          <h3 style={{ fontSize: 16 }}>Rate {current?.riderName ?? "your rider"}</h3>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>How was your delivery experience?</p>
        </div>

        <StarRating value={stars} onChange={setStars} />

        <p style={{ margin: "0 22px 8px", fontWeight: 600, fontSize: 12, color: "var(--ink-soft)" }}>Add a comment (optional)</p>
        <div className="field" style={{ margin: "0 22px 18px" }}>
          <textarea
            placeholder="Fast and careful with the package…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ border: "1.4px solid var(--line)", borderRadius: 14, padding: 14, width: "100%", fontSize: 12.5 }}
          />
        </div>

        <div style={{ padding: "0 22px" }}>
          <Button label="Submit rating" onClick={submit} loading={loading} />
        </div>
      </div>
    </div>
  );
};
