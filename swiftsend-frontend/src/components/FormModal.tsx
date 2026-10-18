import React, { useEffect, useState } from "react";
import { Button } from "./Button";

export type FieldType = "text" | "number" | "select" | "switch";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  inputType?: "text" | "email" | "tel";
}

interface Props {
  visible: boolean;
  title: string;
  fields: FormField[];
  initialValues: Record<string, any>;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}

export const FormModal: React.FC<Props> = ({ visible, title, fields, initialValues, onClose, onSubmit, submitLabel = "Save", loading }) => {
  const [values, setValues] = useState<Record<string, any>>(initialValues);

  useEffect(() => {
    if (visible) setValues(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const set = (key: string, v: any) => setValues((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {fields.map((f) => (
          <div key={f.key} className="modal-field">
            <label>{f.label}</label>
            {f.type === "switch" ? (
              <div className="modal-switch-row">
                <span />
                <button type="button" className={`switch ${values[f.key] ? "on" : ""}`} onClick={() => set(f.key, !values[f.key])}>
                  <span className="knob" />
                </button>
              </div>
            ) : f.type === "select" ? (
              <div className="modal-options">
                {f.options?.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`chip ${values[f.key] === opt ? "selected" : ""}`}
                    style={{ flex: "0 0 auto" }}
                    onClick={() => set(f.key, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type={f.inputType ?? (f.type === "number" ? "number" : "text")}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        ))}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <Button
            label={submitLabel}
            loading={loading}
            onClick={async () => {
              const normalized = { ...values };
              fields.forEach((f) => {
                if (f.type === "number") normalized[f.key] = parseFloat(values[f.key]) || 0;
              });
              await onSubmit(normalized);
            }}
          />
          <Button label="Cancel" variant="secondary" onClick={onClose} />
        </div>
      </div>
    </div>
  );
};
