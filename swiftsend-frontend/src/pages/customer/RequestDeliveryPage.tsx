import React from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useDelivery } from "@/context/DeliveryContext";

const vehicles: { key: "bike" | "car" | "van" | "truck"; label: string; icon: string }[] = [
  { key: "bike", label: "Bike", icon: "🏍" },
  { key: "car", label: "Car", icon: "🚗" },
  { key: "van", label: "Van", icon: "🚐" },
  { key: "truck", label: "Truck", icon: "🚛" },
];

export const RequestDeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { draft, setDraft } = useDelivery();

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title="Request delivery" />
        <TextField label="Pickup address" value={draft.pickupAddress} onChange={(v) => setDraft({ pickupAddress: v })} dotColor="var(--green)" />
        <TextField label="Drop-off address" value={draft.dropoffAddress} onChange={(v) => setDraft({ dropoffAddress: v })} dotColor="var(--danger)" />
        <TextField label="Package type" value={draft.packageType} onChange={(v) => setDraft({ packageType: v })} />
        <TextField label="Package description" value={draft.packageDescription} onChange={(v) => setDraft({ packageDescription: v })} />
        <TextField label="Weight (optional)" value={draft.weight} onChange={(v) => setDraft({ weight: v })} />
        <TextField label="Special instructions" value={draft.instructions} onChange={(v) => setDraft({ instructions: v })} />

        <p style={{ margin: "6px 22px 8px", fontWeight: 600, fontSize: 12, color: "var(--ink-soft)" }}>Delivery type</p>
        <div className="chip-row">
          {(["immediate", "scheduled"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${draft.deliveryType === t ? "selected" : ""}`}
              onClick={() => setDraft({ deliveryType: t })}
            >
              {t === "immediate" ? "Immediate" : "Scheduled"}
            </button>
          ))}
        </div>

        <p style={{ margin: "6px 22px 8px", fontWeight: 600, fontSize: 12, color: "var(--ink-soft)" }}>Vehicle type</p>
        <div className="chip-row">
          {vehicles.map((v) => (
            <button
              key={v.key}
              type="button"
              className={`chip ${draft.vehicleType === v.key ? "selected" : ""}`}
              onClick={() => setDraft({ vehicleType: v.key })}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "4px 22px 0" }}>
          <Button label="Continue" onClick={() => navigate("/customer/estimate")} />
        </div>
      </div>
    </div>
  );
};
