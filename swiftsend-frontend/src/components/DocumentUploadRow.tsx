import React, { useRef, useState } from "react";
import { RiderDocument } from "@/types";
import { daysUntil, formatDate } from "@/utils/formatters";
import { uploadMediaToCloud } from "@/services/mockApi";

interface Props {
  document: RiderDocument;
  onChange: (uri: string) => void;
}

export const DocumentUploadRow: React.FC<Props> = ({ document, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const cloudUrl = await uploadMediaToCloud(file, "document");
      onChange(cloudUrl);
    } catch {
      const fallbackUrl = URL.createObjectURL(file);
      onChange(fallbackUrl);
    } finally {
      setUploading(false);
    }
  };

  const expired = document.expiresAt ? daysUntil(document.expiresAt) <= 0 : false;
  const expiringSoon = document.expiresAt ? daysUntil(document.expiresAt) <= 14 : false;

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "calc(100% - 44px)",
        margin: "0 22px 10px",
        padding: 12,
        borderRadius: 14,
        border: `1.4px ${document.uri ? "solid var(--green-soft)" : "dashed var(--line)"}`,
        background: document.uri ? "#FBFEFC" : "var(--white)",
        textAlign: "left",
        opacity: uploading ? 0.7 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      {uploading ? (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          ⏳
        </div>
      ) : document.uri ? (
        <img
          src={document.uri}
          alt={document.label}
          style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          📷
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--ink)" }}>
          {document.label}
          {!document.required && "  (optional)"}
        </div>
        <div
          style={{
            fontSize: 11,
            marginTop: 2,
            color: expired ? "var(--danger)" : expiringSoon ? "var(--warning)" : "var(--ink-soft)",
          }}
        >
          {uploading
            ? "Uploading to cloud…"
            : document.uri
            ? expired
              ? `Expired ${document.expiresAt ? formatDate(document.expiresAt) : ""}`
              : document.expiresAt
              ? `Valid until ${formatDate(document.expiresAt)}`
              : "Uploaded"
            : "Click to upload"}
        </div>
      </div>
      <span style={{ fontSize: 18, color: document.uri ? "var(--green)" : "var(--gray)" }}>
        {uploading ? "⋯" : document.uri ? "✓" : "+"}
      </span>
    </button>
  );
};
