import React, { useEffect, useState } from "react";
import { StatusBadge, BadgeTone } from "@/components/Primitives";
import { DataTable, Column, AddButton, IconAction } from "@/components/AdminWidgets";
import { FormModal, FormField } from "@/components/FormModal";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";
import { AdminDeliveryRow } from "@/services/mockApi";
import { formatCedis } from "@/utils/formatters";

const statusOptions = ["Pending", "Arriving", "In transit", "Delivered", "Cancelled"];
const tones: Record<string, BadgeTone> = { "In transit": "blue", Arriving: "purple", Pending: "gray", Delivered: "green", Cancelled: "red" };

const fields: FormField[] = [
  { key: "route", label: "Route (e.g. Osu → East Legon)", type: "text" },
  { key: "rider", label: "Assigned rider", type: "text" },
  { key: "status", label: "Status", type: "select", options: statusOptions },
  { key: "amount", label: "Amount (GH₵)", type: "number" },
];

export const AdminDeliveriesPage: React.FC = () => {
  const { toast, confirm } = useUI();
  const [rows, setRows] = useState<AdminDeliveryRow[] | null>(null);
  const [modal, setModal] = useState<{ mode: "add" | "edit"; row?: AdminDeliveryRow } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.fetchAdminDeliveries().then(setRows);
  useEffect(() => {
    load();
  }, []);

  const save = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await api.createAdminDelivery({ route: values.route, rider: values.rider || "—", status: values.status ?? "Pending", amount: values.amount ?? 0 });
        toast("Delivery created.");
      } else if (modal?.row) {
        await api.updateAdminDeliveryStatus(modal.row.id, values.status);
        await api.reassignAdminDelivery(modal.row.id, values.rider);
        toast("Delivery updated.");
      }
      await load();
      setModal(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: AdminDeliveryRow) => {
    const ok = await confirm({ title: "Delete delivery", message: `Remove ${row.id}?`, confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    await api.deleteAdminDelivery(row.id);
    toast("Delivery deleted.");
    load();
  };

  if (!rows) return <div className="loading-center"><div className="spinner" /></div>;

  const columns: Column<AdminDeliveryRow>[] = [
    { key: "id", header: "ID", render: (r) => r.id },
    { key: "route", header: "Route", render: (r) => r.route },
    { key: "rider", header: "Rider", render: (r) => r.rider },
    { key: "status", header: "Status", render: (r) => <StatusBadge label={r.status} tone={tones[r.status]} /> },
    { key: "amount", header: "Amount", render: (r) => formatCedis(r.amount) },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="table-actions">
          <IconAction icon="✎" title="Edit" onClick={() => setModal({ mode: "edit", row: r })} />
          <IconAction icon="🗑" color="var(--danger)" title="Delete" onClick={() => remove(r)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2>Deliveries</h2>
          <div className="sub">{rows.length} records</div>
        </div>
        <AddButton label="New delivery" onClick={() => setModal({ mode: "add" })} />
      </div>

      <DataTable columns={columns} rows={rows} />

      <FormModal
        visible={!!modal}
        title={modal?.mode === "add" ? "New delivery" : "Edit delivery"}
        fields={fields}
        initialValues={modal?.row ?? { status: "Pending" }}
        onClose={() => setModal(null)}
        onSubmit={save}
        loading={saving}
      />
    </div>
  );
};
