import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { OtpInput } from "@/components/OtpInput";
import { Button } from "@/components/Button";
import { useRiderJob } from "@/context/RiderJobContext";
import { useUI } from "@/context/UIContext";

const methods = ["Receiver OTP", "Signature", "Package photo"] as const;

export const ProofOfDeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { confirmDelivery, clearJob } = useRiderJob();
  const { toast } = useUI();
  const [method, setMethod] = useState<(typeof methods)[number]>("Receiver OTP");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const ok = await confirmDelivery(otp);
      if (!ok) {
        toast("Incorrect code. Ask the receiver for the correct 4-digit code.");
        return;
      }
      clearJob();
      toast("Delivery confirmed — nice work!");
      navigate("/rider/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title="Proof of delivery" />
        <div className="chip-row" style={{ marginTop: 16 }}>
          {methods.map((m) => (
            <button key={m} className={`chip ${method === m ? "selected" : ""}`} onClick={() => setMethod(m)}>
              {m}
            </button>
          ))}
        </div>

        {method === "Receiver OTP" ? (
          <>
            <OtpInput length={4} value={otp} onChange={setOtp} />
            <p className="muted text-center" style={{ fontSize: 12, margin: "0 22px" }}>
              Ask the receiver for the 4-digit code sent to their phone
            </p>
            <div style={{ padding: "16px 22px 0" }}>
              <Button label="Confirm delivery" onClick={submit} loading={loading} disabled={otp.length < 4} />
            </div>
          </>
        ) : (
          <p className="muted text-center" style={{ fontSize: 12, margin: "0 22px" }}>
            This capture method isn't wired up in the demo build — use Receiver OTP.
          </p>
        )}
      </div>
    </div>
  );
};
