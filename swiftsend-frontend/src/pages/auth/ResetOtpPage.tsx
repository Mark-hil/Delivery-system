import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { OtpInput } from "@/components/OtpInput";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { checkPassword } from "@/utils/validators";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";

export const ResetOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [stage, setStage] = useState<"otp" | "password">("otp");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    try {
      const ok = await api.verifyOtp(email, "resetPassword", otp);
      if (!ok) {
        setError("Incorrect code, please try again");
        return;
      }
      setError(undefined);
      setStage("password");
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    const pw = checkPassword(newPassword);
    if (!pw.valid) {
      setError(`Password needs: ${pw.messages.join(", ")}`);
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email, newPassword);
      toast("Password updated — you can now log in.");
      navigate("/login", { replace: true });
    } catch (e: any) {
      toast(e.message ?? "Couldn't reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title={stage === "otp" ? "Verify code" : "New password"} />
        {stage === "otp" ? (
          <>
            <p style={{ margin: "14px 22px 18px", fontSize: 13, color: "var(--ink-soft)" }}>
              Enter the 6-digit code sent to {email}
            </p>
            <OtpInput value={otp} onChange={setOtp} />
            {error && <p style={{ margin: "-10px 22px 12px", fontSize: 11.5, color: "var(--danger)" }}>{error}</p>}
            <div style={{ padding: "0 22px" }}>
              <Button label="Verify" onClick={verify} loading={loading} disabled={otp.length < 6} />
            </div>
            <p className="text-center muted" style={{ fontSize: 12, marginTop: 4 }}>
              Didn't get it?{" "}
              <button className="link-text" style={{ background: "none", border: "none" }} onClick={() => api.requestOtp(email, "resetPassword")}>
                Resend OTP
              </button>
            </p>
          </>
        ) : (
          <>
            <TextField label="New password" placeholder="••••••••" value={newPassword} onChange={setNewPassword} error={error} isPassword />
            <div style={{ padding: "0 22px" }}>
              <Button label="Update password" onClick={savePassword} loading={loading} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
