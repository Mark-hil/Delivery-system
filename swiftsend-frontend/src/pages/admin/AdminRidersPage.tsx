import React, { useEffect, useState } from "react";
import { StatusBadge, BadgeTone } from "@/components/Primitives";
import { DataTable, Column, IconAction } from "@/components/AdminWidgets";
import { FormModal, FormField } from "@/components/FormModal";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";
import { AdminRiderRow } from "@/services/mockApi";

const fields: FormField[] = [
  { key: "name", label: "Full name", type: "text" },
  { key: "phone", label: "Phone number", type: "text" },
  { key: "email", label: "Email", type: "text", inputType: "email" },
  { key: "plateNumber", label: "Plate number", type: "text" },
  { key: "vehicleType", label: "Vehicle type", type: "select", options: ["bike", "car", "van", "truck"] },
];

const docTones: Record<string, BadgeTone> = { Verified: "green", Expired: "red", Submitted: "gray" };
const approvalTones: Record<string, BadgeTone> = { Approved: "green", Suspended: "red", Pending: "orange" };

export const AdminRidersPage: React.FC = () => {
  const { toast, confirm } = useUI();
  const [riders, setRiders] = useState<AdminRiderRow[] | null>(null);
  const [editRow, setEditRow] = useState<AdminRiderRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.fetchAdminRiders().then(setRiders);
  useEffect(() => {
    load();
  }, []);

  const approve = async (row: AdminRiderRow) => {
    await api.setRiderApproval(row.id, "Approved");
    load();
  };
  const suspend = async (row: AdminRiderRow) => {
    await api.setRiderApproval(row.id, "Suspended");
    load();
  };
  const verifyDocs = async (row: AdminRiderRow) => {
    await api.adminVerifyRiderDocuments(row.id);
    load();
    toast(`${row.name}'s documents are now valid for another year.`);
  };
  const remove = async (row: AdminRiderRow) => {
    const ok = await confirm({ title: "Remove rider", message: `Remove ${row.name} from the platform?`, confirmLabel: "Remove", destructive: true });
    if (!ok) return;
    await api.deleteAdminRider(row.id);
    toast("Rider removed.");
    load();
  };
  const save = async (values: Record<string, any>) => {
    if (!editRow) return;
    setSaving(true);
    try {
      await api.updateAdminRider(editRow.id, values);
      await load();
      setEditRow(null);
      toast("Rider updated.");
    } finally {
      setSaving(false);
    }
  };

  if (!riders) return <div className="loading-center"><div className="spinner" /></div>;

  const columns: Column<AdminRiderRow>[] = [
    {
      key: "face",
      header: "Face",
      render: (r) =>
        r.facePhotoUri && !r.facePhotoUri.startsWith("mock://") ? (
          <img src={r.facePhotoUri} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--green-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
            🙂
          </div>
        ),
    },
    { key: "name", header: "Rider", render: (r) => r.name },
    { key: "vehicle", header: "Vehicle", render: (r) => r.vehicle },
    { key: "docsStatus", header: "Documents", render: (r) => <StatusBadge label={r.docsStatus} tone={docTones[r.docsStatus]} /> },
    { key: "approvalStatus", header: "Approval", render: (r) => <StatusBadge label={r.approvalStatus} tone={approvalTones[r.approvalStatus]} /> },
    { key: "rating", header: "Rating", render: (r) => String(r.rating) },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="table-actions">
          <IconAction icon="✎" title="Edit" onClick={() => setEditRow(r)} />
          <IconAction icon="✓" color="var(--green-dark)" title="Approve" onClick={() => approve(r)} />
          <IconAction icon="⛔" color="var(--warning)" title="Suspend" onClick={() => suspend(r)} />
          <IconAction icon="🛡" color="var(--blue)" title="Re-verify documents" onClick={() => verifyDocs(r)} />
          <IconAction icon="🗑" color="var(--danger)" title="Remove" onClick={() => remove(r)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2>Riders</h2>
          <div className="sub">{riders.length} riders on the platform</div>
        </div>
      </div>

      <DataTable columns={columns} rows={riders} />

      <FormModal visible={!!editRow} title="Edit rider" fields={fields} initialValues={editRow ?? {}} onClose={() => setEditRow(null)} onSubmit={save} loading={saving} />
    </div>
  );
};
