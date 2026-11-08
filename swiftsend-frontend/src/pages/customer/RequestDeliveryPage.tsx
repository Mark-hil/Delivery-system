import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { MapBlock } from "@/components/MapBlock";
import { useDelivery } from "@/context/DeliveryContext";
import { useUI } from "@/context/UIContext";
import { detectUserLocationInGhana } from "@/services/geoService";

const vehicles: { key: "bike" | "car" | "van" | "truck"; label: string; icon: string }[] = [
  { key: "bike", label: "Bike", icon: "🏍" },
  { key: "car", label: "Car", icon: "🚗" },
  { key: "van", label: "Van", icon: "🚐" },
  { key: "truck", label: "Truck", icon: "🚛" },
];

export const RequestDeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { draft, setDraft } = useDelivery();
  const { toast } = useUI();
  const [detectingGps, setDetectingGps] = useState(false);

  const pickupCoords =
    draft.pickupLat != null && draft.pickupLng != null
      ? { lat: draft.pickupLat, lng: draft.pickupLng }
      : undefined;
  const dropoffCoords =
    draft.dropoffLat != null && draft.dropoffLng != null
      ? { lat: draft.dropoffLat, lng: draft.dropoffLng }
      : undefined;

  const handleUseMyLocation = async () => {
    setDetectingGps(true);
    try {
      const loc = await detectUserLocationInGhana();
      if (loc) {
        setDraft({
          pickupAddress: loc.address,
          pickupLat: loc.lat,
          pickupLng: loc.lng,
        });
        toast(`📍 Pickup set to ${loc.address}`);
      } else {
        toast("Could not access device GPS. Please allow browser location access or type your town.");
      }
    } finally {
      setDetectingGps(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title="Request delivery" />
        <MapBlock
          height={170}
          pickupAddress={draft.pickupAddress}
          dropoffAddress={draft.dropoffAddress}
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          interactivePins
          onPickupChange={({ address, lat, lng }) =>
            setDraft({ pickupAddress: address, pickupLat: lat, pickupLng: lng })
          }
          onDropoffChange={({ address, lat, lng }) =>
            setDraft({ dropoffAddress: address, dropoffLat: lat, dropoffLng: lng })
          }
        />
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "2px 22px 0" }}>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={detectingGps}
            style={{
              background: "var(--green-soft)",
              color: "var(--green-dark)",
              border: "1px solid rgba(22, 163, 74, 0.25)",
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {detectingGps ? "📡 Detecting GPS…" : "📍 Use my current location"}
          </button>
        </div>
        <TextField
          label="Pickup address (Any city or town in Ghana)"
          value={draft.pickupAddress}
          onChange={(v) => setDraft({ pickupAddress: v, pickupLat: undefined, pickupLng: undefined })}
          enablePlacesAutocomplete
          onPlaceSelect={({ address, lat, lng }) =>
            setDraft({ pickupAddress: address, pickupLat: lat, pickupLng: lng })
          }
          dotColor="var(--green)"
        />
        <TextField
          label="Drop-off address (Any city or town in Ghana)"
          value={draft.dropoffAddress}
          onChange={(v) => setDraft({ dropoffAddress: v, dropoffLat: undefined, dropoffLng: undefined })}
          enablePlacesAutocomplete
          onPlaceSelect={({ address, lat, lng }) =>
            setDraft({ dropoffAddress: address, dropoffLat: lat, dropoffLng: lng })
          }
          dotColor="var(--danger)"
        />
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
