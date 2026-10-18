import React, { useEffect, useState } from "react";
import { IconAction, AddButton } from "@/components/AdminWidgets";
import { FormModal, FormField } from "@/components/FormModal";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";
import { PlatformSettings, AdminTeamRow } from "@/services/mockApi";
import { formatCedis } from "@/utils/formatters";

type SectionKey = "pricing" | "areas" | "promo" | null;

const pricingFields: FormField[] = [
  { key: "baseFee", label: "Base fee (GH₵)", type: "number" },
  { key: "perKmRate", label: "Per km rate (GH₵)", type: "number" },
  { key: "serviceFee", label: "Service fee (GH₵)", type: "number" },
];
const areaFields: FormField[] = [
  { key: "activeRegions", label: "Active regions", type: "text" },
  { key: "coverageRadiusKm", label: "Coverage radius (km)", type: "number" },
];
const promoFields: FormField[] = [
  { key: "promoTitle", label: "Promo title", type: "text" },
  { key: "promoSubtitle", label: "Promo subtitle", type: "text" },
  { key: "promoPercentLabel", label: "Promo badge (e.g. –100%)", type: "text" },
];
const teamFields: FormField[] = [
  { key: "fullName", label: "Full name", type: "text" },
  { key: "email", label: "Email", type: "text", inputType: "email" },
  { key: "password", label: "Temporary password", type: "text" },
];

export const AdminSettingsPage: React.FC = () => {
  const { toast, confirm } = useUI();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [team, setTeam] = useState<AdminTeamRow[] | null>(null);
  const [section, setSection] = useState<SectionKey>(null);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.getPlatformSettings().then(setSettings);
    api.fetchAdminTeam().then(setTeam);
  };
  useEffect(load, []);

  const saveSection = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      const updated = await api.updatePlatformSettings(values);
      setSettings(updated);
      setSection(null);
      toast("Settings updated.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSwitch = async (key: "pushEnabled" | "smsEnabled" | "maintenanceMode", value: boolean) => {
    const updated = await api.updatePlatformSettings({ [key]: value });
    setSettings(updated);
  };

  const inviteAdmin = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      await api.inviteAdmin({ fullName: values.fullName, email: values.email, password: values.password });
      setTeam(await api.fetchAdminTeam());
      setAddingAdmin(false);
      toast("Admin invited.");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAdmin = async (row: AdminTeamRow) => {
    const ok = await confirm({ title: "Remove admin", message: `Remove ${row.fullName} from the admin team?`, confirmLabel: "Remove", destructive: true });
    if (!ok) return;
    await api.removeAdmin(row.id);
    setTeam(await api.fetchAdminTeam());
  };

  if (!settings || !team) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2>Settings</h2>
          <div className="sub">Pricing, service areas, notifications &amp; platform configuration</div>
        </div>
      </div>

      <div style={{ padding: "0 28px" }}>
        <SettingsCard title="Pricing" onEdit={() => setSection("pricing")}>
          <Kv label="Base fee" value={formatCedis(settings.baseFee)} />
          <Kv label="Per km rate" value={formatCedis(settings.perKmRate)} />
          <Kv label="Service fee" value={formatCedis(settings.serviceFee)} />
        </SettingsCard>
        <p style={{ fontSize: 11, color: "var(--green-dark)", margin: "-10px 4px 14px" }}>
          These rates feed directly into the Customer app's live price estimate.
        </p>

        <SettingsCard title="Service areas" onEdit={() => setSection("areas")}>
          <Kv label="Active regions" value={settings.activeRegions} />
          <Kv label="Coverage radius" value={`${settings.coverageRadiusKm} km`} />
        </SettingsCard>

        <SettingsCard title="Home promo banner" onEdit={() => setSection("promo")}>
          <Kv label="Title" value={settings.promoTitle} />
          <Kv label="Subtitle" value={settings.promoSubtitle} />
          <Kv label="Badge" value={settings.promoPercentLabel} />
        </SettingsCard>

        <div className="card" style={{ marginBottom: 14 }}>
          <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>Notifications</p>
          <SwitchRow label="Push notifications" value={settings.pushEnabled} onChange={(v) => toggleSwitch("pushEnabled", v)} />
          <SwitchRow label="SMS alerts" value={settings.smsEnabled} onChange={(v) => toggleSwitch("smsEnabled", v)} />
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>System</p>
          <SwitchRow label="Maintenance mode" value={settings.maintenanceMode} onChange={(v) => toggleSwitch("maintenanceMode", v)} />
          <Kv label="App version" value={settings.appVersion} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ fontWeight: 600, fontSize: 13.5 }}>Admin team</p>
          <AddButton label="Invite admin" onClick={() => setAddingAdmin(true)} />
        </div>
        <div className="card" style={{ marginBottom: 24 }}>
          {team.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{a.fullName}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{a.email}</div>
              </div>
              {team.length > 1 && <IconAction icon="🗑" color="var(--danger)" title="Remove" onClick={() => removeAdmin(a)} />}
            </div>
          ))}
        </div>
      </div>

      <FormModal visible={section === "pricing"} title="Edit pricing" fields={pricingFields} initialValues={settings} onClose={() => setSection(null)} onSubmit={saveSection} loading={saving} />
      <FormModal visible={section === "areas"} title="Edit service areas" fields={areaFields} initialValues={settings} onClose={() => setSection(null)} onSubmit={saveSection} loading={saving} />
      <FormModal visible={section === "promo"} title="Edit promo banner" fields={promoFields} initialValues={settings} onClose={() => setSection(null)} onSubmit={saveSection} loading={saving} />
      <FormModal visible={addingAdmin} title="Invite admin" fields={teamFields} initialValues={{}} onClose={() => setAddingAdmin(false)} onSubmit={inviteAdmin} loading={saving} submitLabel="Send invite" />
    </div>
  );
};

const SettingsCard: React.FC<{ title: string; onEdit: () => void; children: React.ReactNode }> = ({ title, onEdit, children }) => (
  <div className="card" style={{ marginBottom: 6 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <p style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</p>
      <button onClick={onEdit} className="link-text" style={{ background: "none", border: "none", fontSize: 12 }}>
        Edit
      </button>
    </div>
    {children}
  </div>
);

const Kv: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="kv-row">
    <span className="k">{label}</span>
    <span className="v">{value}</span>
  </div>
);

const SwitchRow: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
    <span className="k" style={{ fontSize: 12.5 }}>{label}</span>
    <button className={`switch ${value ? "on" : ""}`} onClick={() => onChange(!value)}>
      <span className="knob" />
    </button>
  </div>
);
