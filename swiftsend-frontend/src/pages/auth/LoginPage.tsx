import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { BiometricLoginButton } from "@/components/Misc";
import { isEmailOrPhone, isRequired } from "@/utils/validators";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!isEmailOrPhone(identifier)) next.identifier = "Enter a valid email or phone number";
    if (!isRequired(password)) next.password = "Password is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const result = await api.login(identifier, password);
      await signIn(result);
      navigate("/", { replace: true });
    } catch (e: any) {
      toast(e.message ?? "Login failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <div style={{ textAlign: "center", padding: "26px 22px" }}>
          <img src="/logo-mark.png" alt="SwiftSend" style={{ width: 64, height: 64, objectFit: "contain", margin: "0 auto 10px" }} />
          <h2 style={{ fontSize: 19, marginBottom: 6 }}>Welcome to SwiftSend</h2>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            Log in with your email or phone number to continue.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <TextField
            label="Email or phone number"
            placeholder="you@email.com or 024 812 5567"
            value={identifier}
            onChange={setIdentifier}
            error={errors.identifier}
            type="email"
          />
          <TextField label="Password" placeholder="••••••••" value={password} onChange={setPassword} error={errors.password} isPassword />
          <div style={{ textAlign: "right", margin: "-6px 22px 16px" }}>
            <Link to="/forgot-password" className="link-text" style={{ fontSize: 12 }}>
              Forgot password?
            </Link>
          </div>

          <div className="btn-block-group" style={{ padding: "0 22px" }}>
            <Button label="Log in" type="submit" onClick={submit} loading={loading} />
          </div>
        </form>

        <div style={{ padding: "0 22px" }}>
          <BiometricLoginButton onSuccess={submit} />
        </div>

        <p className="text-center muted" style={{ fontSize: 12, marginTop: 10 }}>
          New here?{" "}
          <Link to="/register" className="link-text">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
