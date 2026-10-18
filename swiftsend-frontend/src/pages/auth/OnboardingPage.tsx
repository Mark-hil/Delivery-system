import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { storage } from "@/services/storage";

const pages = [
  { emoji: "🚀", title: "Fast delivery, every time", desc: "Request a rider in seconds and watch your package move across town." },
  { emoji: "📍", title: "Track your rider", desc: "See exactly where they are on the map, from pickup to your door." },
  { emoji: "🔒", title: "Secure payments", desc: "Pay only after your delivery arrives — safe, simple, and cashless." },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const page = pages[index];
  const isLast = index === pages.length - 1;

  const finish = () => {
    storage.setJSON(storage.keys.onboardingSeen, true);
    navigate("/login", { replace: true });
  };

  return (
    <div className="page">
      <div className="page-scroll" style={{ paddingTop: 30 }}>
        <div className="auth-hero" style={{ fontSize: 70 }}>
          {page.emoji}
        </div>
        <div className="auth-copy">
          <h2>{page.title}</h2>
          <p>{page.desc}</p>
        </div>
        <div className="dots-row">
          {pages.map((_, i) => (
            <span key={i} className={i === index ? "active" : ""} onClick={() => setIndex(i)} />
          ))}
        </div>
        <div style={{ padding: "0 22px" }}>
          <Button label={isLast ? "Get started" : "Next"} onClick={() => (isLast ? finish() : setIndex(index + 1))} />
        </div>
        {!isLast && (
          <p className="text-center" style={{ marginTop: 10 }}>
            <button className="muted" style={{ background: "none", border: "none", fontWeight: 600, fontSize: 12.5 }} onClick={finish}>
              Skip
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
