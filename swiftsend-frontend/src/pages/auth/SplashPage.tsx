import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "@/services/storage";

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const seen = storage.getJSON<boolean>(storage.keys.onboardingSeen);
      navigate(seen ? "/login" : "/onboarding", { replace: true });
    }, 900);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="page"
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: "var(--green-dark)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <img src="/logo-mark.png" alt="SwiftSend" style={{ width: 96, height: 96, objectFit: "contain", marginBottom: 14 }} />
      <div style={{ color: "white", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20 }}>SwiftSend</div>
      <div className="spinner" style={{ marginTop: 26, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
    </div>
  );
};
