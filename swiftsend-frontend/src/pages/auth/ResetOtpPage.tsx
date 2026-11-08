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
  const initialDevCode = params.get("devCode") ?? "";

  const [otp, setOtp] = useState(initialDevCode);
  const [devCode, setDevCode] = useState(initialDevCode);
  const [newPassword, setNewPassword] = useState("");
  const [stage, setStage] = useState<"otp" | "password">("otp");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const ok = await api.verifyOtp(email, "resetPassword", otp);
      if (!ok) {
        setError("Incorrect or expired code, please try again");
        return;
      }
      setError(undefined);
      setStage("password");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not verify code";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(undefined);
    try {
      const code = await api.requestOtp(email, "resetPassword");
      const isNumeric = /^\d{4,6}$/.test(code);
      if (isNumeric) {
        setDevCode(code);
        setOtp(code);
      }
      toast(isNumeric ? `New OTP sent (Sandbox code: ${code})` : `New OTP sent to ${email}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not resend OTP");
    }
  };

  const savePassword = async () => {
    const pw = checkPassword(newPassword);
    if (!pw.valid) {
      setError(`Password needs: ${pw.messages.join(", ")}`);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      await api.resetPassword(email, newPassword);
      toast("Password updated — you can now log in.");
      navigate("/login", { replace: true });
    } catch (e: any) {
      const msg = e?.message ?? "Couldn't reset password.";
      setError(msg);
      toast(msg);
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
            <p style={{ margin: "14px 22px 12px", fontSize: 13, color: "var(--ink-soft)" }}>
              Enter the 6-digit verification code sent for <strong>{email}</strong>
            </p>
            {devCode && (
              <div
                style={{
                  margin: "0 22px 14px",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "var(--green-soft)",
                  border: "1px solid rgba(22, 163, 74, 0.25)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  color: "var(--green-dark)",
                }}
              >
                <span>
                  Sandbox OTP Code: <strong>{devCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(devCode)}
                  style={{
                    background: "var(--green)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Use code
                </button>
              </div>
            )}
            <OtpInput value={otp} onChange={setOtp} />
            {error && <p style={{ margin: "-10px 22px 12px", fontSize: 11.5, color: "var(--danger)" }}>{error}</p>}
            <div style={{ padding: "0 22px" }}>
              <Button label="Verify" onClick={verify} loading={loading} disabled={otp.length < 6} />
            </div>
            <p className="text-center muted" style={{ fontSize: 12, marginTop: 10 }}>
              Didn't get it?{" "}
              <button
                type="button"
                className="link-text"
                style={{ background: "none", border: "none", cursor: "pointer" }}
                onClick={handleResend}
              >
                Resend OTP
              </button>
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: "14px 22px 12px", fontSize: 13, color: "var(--ink-soft)" }}>
              Create a new password for <strong>{email}</strong> (at least 6 characters, 1 uppercase letter, and 1 number).
            </p>
            <TextField
              label="New password"
              placeholder="••••••••"
              value={newPassword}
              onChange={setNewPassword}
              error={error}
              isPassword
            />
            <div style={{ padding: "6px 22px 0" }}>
              <Button label="Update password" onClick={savePassword} loading={loading} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
