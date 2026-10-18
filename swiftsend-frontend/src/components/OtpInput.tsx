import React, { useRef } from "react";

interface Props {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

export const OtpInput: React.FC<Props> = ({ length = 6, value, onChange }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const handleChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, "");
    const next = [...digits];
    next[index] = clean.slice(-1) || "";
    onChange(next.join("").replace(/\s+$/, ""));
    if (clean && index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="otp-row">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          className={`otp-box ${d ? "filled" : ""}`}
          value={d}
          onChange={(e) => handleChange(e.target.value, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          inputMode="numeric"
          maxLength={1}
        />
      ))}
    </div>
  );
};
