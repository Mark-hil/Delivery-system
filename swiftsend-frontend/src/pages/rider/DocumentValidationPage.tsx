import React, { useState } from "react";
import { DocumentUploadRow } from "@/components/DocumentUploadRow";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { RiderUser } from "@/types";
import * as api from "@/services/mockApi";
import { daysUntil } from "@/utils/formatters";

/**
 * Riders are routed here automatically (see RequireRider in src/routes) whenever a
 * required document has expired. They cannot reach the dashboard until every
 * required document is re-uploaded and resubmitted.
 */
export const DocumentValidationPage: React.FC = () => {
  const { session, updateRiderUser, signOut } = useAuth();
  const { toast } = useUI();
  const rider = session?.user as RiderUser;
  const [documents, setDocuments] = useState(rider.documents);
  const [loading, setLoading] = useState(false);

  const setDocumentUri = (kind: string, uri: string) => {
    setDocuments((prev) => prev.map((d) => (d.kind === kind ? { ...d, uri } : d)));
  };

  const expiredDocs = documents.filter((d) => d.required && d.expiresAt && daysUntil(d.expiresAt) <= 0);

  const submit = async () => {
    const missing = documents.filter((d) => expiredDocs.some((e) => e.kind === d.kind) && !d.uri);
    if (missing.length) {
      toast(`Please re-upload: ${missing.map((d) => d.label).join(", ")}`);
      return;
    }
    setLoading(true);
    try {
      const updated = await api.riderSubmitDocuments(rider.id, documents);
      await updateRiderUser(updated);
      toast("Documents submitted — you're all set to keep accepting deliveries.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <div
          style={{
            display: "flex",
            gap: 12,
            margin: 22,
            padding: 16,
            borderRadius: 16,
            background: "var(--danger-soft)",
            border: "1px solid #F6C7CB",
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--danger)", marginBottom: 4 }}>Document verification required</div>
            <div style={{ fontSize: 11.5, color: "var(--danger)", lineHeight: 1.5 }}>
              One or more of your documents has expired. Re-upload them below to keep accepting delivery
              requests.
            </div>
          </div>
        </div>

        {documents.map((d) => (
          <DocumentUploadRow key={d.kind} document={d} onChange={(uri) => setDocumentUri(d.kind, uri)} />
        ))}

        <div className="btn-block-group">
          <Button label="Resubmit documents" onClick={submit} loading={loading} />
          <Button label="Log out" variant="secondary" onClick={signOut} />
        </div>
      </div>
    </div>
  );
};
