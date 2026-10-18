import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { isEmail } from "@/utils/validators";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!isEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const code = await api.requestOtp(email, "resetPassword");
      toast(`OTP sent to ${email} (demo code: ${code})`);
      navigate(`/reset-otp?email=${encodeURIComponent(email)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title="Reset password" />
        <p style={{ margin: "14px 22px 18px", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          Enter the email linked to your account — customer, rider, or admin. We'll send a one-time code so
          you can set a new password.
        </p>
        <TextField label="Email" placeholder="you@email.com" value={email} onChange={setEmail} error={error} type="email" />
        <div style={{ padding: "10px 22px 0" }}>
          <Button label="Send OTP" onClick={submit} loading={loading} />
        </div>
      </div>
    </div>
  );
};
