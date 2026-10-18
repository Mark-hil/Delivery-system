import React, { useState } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  isPassword?: boolean;
  dotColor?: string;
  autoCapitalize?: "none" | "characters" | "words";
}

export const TextField: React.FC<Props> = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  isPassword,
  dotColor,
  autoCapitalize,
}) => {
  const [hidden, setHidden] = useState(!!isPassword);

  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label>{label}</label>
      <div className="box">
        {dotColor && <span className="dot" style={{ background: dotColor }} />}
        <input
          type={isPassword ? (hidden ? "password" : "text") : type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          autoCapitalize={autoCapitalize ?? (isPassword || type === "email" ? "none" : "sentences")}
        />
        {isPassword && (
          <button type="button" className="icon-btn" onClick={() => setHidden((v) => !v)} aria-label="Toggle password visibility">
            {hidden ? "👁" : "🙈"}
          </button>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};
