import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { DocumentUploadRow } from "@/components/DocumentUploadRow";
import { FaceCapture } from "@/components/FaceCapture";
import { checkPassword, isEmail, isPhone, isRequired } from "@/utils/validators";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";
import { RiderDocument } from "@/types";

type Role = "customer" | "rider";

const vehicles: { key: "bike" | "car" | "van" | "truck"; label: string; icon: string }[] = [
  { key: "bike", label: "Bike", icon: "🏍" },
  { key: "car", label: "Car", icon: "🚗" },
  { key: "van", label: "Van", icon: "🚐" },
  { key: "truck", label: "Truck", icon: "🚛" },
];

export const RegisterPage: React.FC = () => {
  const { signInCustomer, signInRider } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [vehicleType, setVehicleType] = useState<"bike" | "car" | "van" | "truck">("bike");
  const [plateNumber, setPlateNumber] = useState("");
  const [documents, setDocuments] = useState<RiderDocument[]>(api.emptyDocumentSet());
  const [facePhotoUri, setFacePhotoUri] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setDocumentUri = (kind: RiderDocument["kind"], uri: string) => {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    setDocuments((prev) =>
      prev.map((d) => (d.kind === kind ? { ...d, uri, uploadedAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() } : d))
    );
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!isRequired(fullName)) next.fullName = "Full name is required";
    if (!isPhone(phone)) next.phone = "Enter a valid Ghanaian phone number";
    if (!isEmail(email)) next.email = "Enter a valid email address";
    const pw = checkPassword(password);
    if (!pw.valid) next.password = `Password needs: ${pw.messages.join(", ")}`;
    if (role === "rider" && !isRequired(plateNumber)) next.plateNumber = "Plate number is required";
    setErrors(next);

    if (role === "rider") {
      if (!facePhotoUri) {
        toast("Please capture a selfie for identity verification.");
        return;
      }
      const missing = documents.filter((d) => d.required && !d.uri);
      if (missing.length) {
        toast(`Please upload: ${missing.map((d) => d.label).join(", ")}`);
        return;
      }
    }
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      if (role === "customer") {
        const user = await api.customerRegister({ fullName, phone, email, password });
        await signInCustomer(user);
      } else {
        const user = await api.riderRegister({ fullName, phone, email, password, vehicleType, plateNumber, documents, facePhotoUri: facePhotoUri! });
        await signInRider(user);
      }
      navigate("/", { replace: true });
    } catch (e: any) {
      toast(e.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-scroll">
        <TopBar title="Create account" />

        <p style={{ margin: "6px 22px 8px", fontWeight: 600, fontSize: 12, color: "var(--ink-soft)" }}>I'm registering as a</p>
        <div className="role-row">
          <button type="button" className={`role-card ${role === "customer" ? "selected" : ""}`} onClick={() => setRole("customer")}>
            <div className="emoji">📦</div>
            <div className="title">Customer</div>
            <div className="sub">Request &amp; track deliveries</div>
          </button>
          <button type="button" className={`role-card ${role === "rider" ? "selected" : ""}`} onClick={() => setRole("rider")}>
            <div className="emoji">🏍</div>
            <div className="title">Rider</div>
            <div className="sub">Accept jobs &amp; earn</div>
          </button>
        </div>

        <TextField label="Full name" value={fullName} onChange={setFullName} error={errors.fullName} />
        <TextField label="Phone number" value={phone} onChange={setPhone} error={errors.phone} type="tel" />
        <TextField label="Email" value={email} onChange={setEmail} error={errors.email} type="email" />
        <TextField label="Password" value={password} onChange={setPassword} error={errors.password} isPassword />

        {role === "rider" && (
          <>
            <p style={{ margin: "6px 22px 8px", fontWeight: 600, fontSize: 12, color: "var(--ink-soft)" }}>Vehicle type</p>
            <div className="chip-row">
              {vehicles.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  className={`chip ${vehicleType === v.key ? "selected" : ""}`}
                  onClick={() => setVehicleType(v.key)}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <TextField label="Plate number" value={plateNumber} onChange={setPlateNumber} error={errors.plateNumber} />

            <p style={{ margin: "6px 22px 4px", fontWeight: 600, fontSize: 12, color: "var(--ink-soft)" }}>Face verification</p>
            <p style={{ margin: "0 22px 12px", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              Take a clear, well-lit selfie.
              This is compared against your ID photo to confirm it's really you.
            </p>
            <FaceCapture value={facePhotoUri} onChange={(uri) => setFacePhotoUri(uri || null)} />

            <p style={{ margin: "6px 22px 4px", fontWeight: 600, fontSize: 12, color: "var(--ink-soft)" }}>Verification documents</p>
            <p style={{ margin: "0 22px 12px", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              Upload clear photos of the front and back of your national ID, your driving license, vehicle
              insurance and any other supporting document.
            </p>
            {documents.map((d) => (
              <DocumentUploadRow key={d.kind} document={d} onChange={(uri) => setDocumentUri(d.kind, uri)} />
            ))}
          </>
        )}

        <div style={{ padding: "10px 22px 0" }}>
          <Button label={role === "customer" ? "Create account" : "Submit for review"} onClick={submit} loading={loading} />
        </div>
      </div>
    </div>
  );
};
