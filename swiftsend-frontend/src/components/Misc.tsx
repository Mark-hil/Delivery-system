import React, { useEffect, useState } from "react";
import { getBiometricAvailability, promptBiometricLogin } from "@/services/biometric";

export const StarRating: React.FC<{ value: number; onChange: (n: number) => void }> = ({ value, onChange }) => (
  <div className="stars-row">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" className="star-btn" onClick={() => onChange(n)}>
        {n <= value ? "★" : "☆"}
      </button>
    ))}
  </div>
);

/** Renders nothing if the browser/device has no platform authenticator available. */
export const BiometricLoginButton: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [availability, setAvailability] = useState<{ available: boolean; typeLabel: string | null }>({
    available: false,
    typeLabel: null,
  });

  useEffect(() => {
    getBiometricAvailability().then(setAvailability);
  }, []);

  if (!availability.available) return null;

  return (
    <button
      type="button"
      className="btn"
      style={{ background: "var(--green-soft)", color: "var(--green-dark)", marginTop: 4, marginBottom: 10 }}
      onClick={async () => {
        const ok = await promptBiometricLogin(availability.typeLabel);
        if (ok) onSuccess();
      }}
    >
      🔐 Log in with {availability.typeLabel}
    </button>
  );
};
