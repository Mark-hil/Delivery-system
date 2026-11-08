import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { isEmail, isPhone } from "@/utils/validators";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = destination.trim();
    if (channel === "sms") {
      if (!isPhone(trimmed)) {
        setError("Enter a valid Ghana phone number (e.g. 0248125567 or +233248125567)");
        return;
      }
    } else {
      if (!isEmail(trimmed)) {
        setError("Enter a valid email address");
        return;
      }
    }

    setError(undefined);
    setLoading(true);
    try {
      const code = await api.requestOtp(trimmed, "resetPassword");
      const isNumericCode = /^\d{4,6}$/.test(code);
      toast(
        isNumericCode
          ? `SMS OTP sent to ${trimmed} (Sandbox code: ${code})`
          : `SMS verification code sent to ${trimmed}`
      );
      const query = new URLSearchParams({ email: trimmed });
      if (isNumericCode) {
        query.set("devCode", code);
      }
      navigate(`/reset-otp?${query.toString()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send verification code";
      setError(msg);
      toast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title="Reset password" />
        <p style={{ margin: "14px 22px 14px", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          Choose how you want to receive your 6-digit verification code — via <strong>SMS to your phone number</strong> or via your linked <strong>email</strong>.
        </p>

        <div className="chip-row" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={`chip ${channel === "sms" ? "selected" : ""}`}
            onClick={() => {
              setChannel("sms");
              setDestination("");
              setError(undefined);
            }}
          >
            📱 Send via SMS (Phone)
          </button>
          <button
            type="button"
            className={`chip ${channel === "email" ? "selected" : ""}`}
            onClick={() => {
              setChannel("email");
              setDestination("");
              setError(undefined);
            }}
          >
            ✉️ Via Email
          </button>
        </div>

        {channel === "sms" ? (
          <TextField
            label="Phone number (Ghana SMS)"
            placeholder="0248125567"
            value={destination}
            onChange={setDestination}
            error={error}
            type="tel"
          />
        ) : (
          <TextField
            label="Email address"
            placeholder="ama.owusu@email.com"
            value={destination}
            onChange={setDestination}
            error={error}
            type="email"
          />
        )}

        <div style={{ padding: "10px 22px 0" }}>
          <Button
            label={channel === "sms" ? "Send OTP via SMS" : "Send OTP"}
            onClick={submit}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};
