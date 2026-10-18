import React, { useEffect, useState } from "react";
import { StatusBadge, BadgeTone } from "@/components/Primitives";
import { DataTable, Column, AddButton, IconAction } from "@/components/AdminWidgets";
import { FormModal, FormField } from "@/components/FormModal";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";
import { AdminPaymentRow, PaymentStatus } from "@/services/mockApi";
import { formatCedis } from "@/utils/formatters";

const typeFilters = ["All", "Delivery payment", "Rider payout", "Refund"] as const;
const statusOptions: PaymentStatus[] = ["Success", "Processing", "Pending", "Failed"];
const tones: Record<PaymentStatus, BadgeTone> = { Success: "green", Processing: "blue", Pending: "orange", Failed: "red" };

const fields: FormField[] = [
  { key: "user", label: "User / rider", type: "text" },
  { key: "type", label: "Type", type: "select", options: ["Delivery payment", "Rider payout", "Refund"] },
  { key: "amount", label: "Amount (GH₵)", type: "number" },
  { key: "status", label: "Status", type: "select", options: statusOptions },
];

export const AdminPaymentsPage: React.FC = () => {
  const { toast, confirm } = useUI();
  const [rows, setRows] = useState<AdminPaymentRow[] | null>(null);
  const [filter, setFilter] = useState<(typeof typeFilters)[number]>("All");
  const [modal, setModal] = useState<{ mode: "add" | "edit"; row?: AdminPaymentRow } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.fetchAdminPayments().then(setRows);
  useEffect(() => {
    load();
  }, []);

  const save = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await api.createAdminPayment({ user: values.user, type: values.type ?? "Delivery payment", amount: values.amount ?? 0, status: values.status ?? "Pending" });
        toast("Transaction added.");
      } else if (modal?.row) {
        await api.updateAdminPaymentStatus(modal.row.id, values.status);
        toast("Transaction updated.");
      }
      await load();
      setModal(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: AdminPaymentRow) => {
    const ok = await confirm({ title: "Delete transaction", message: `Remove ${row.id}?`, confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    await api.deleteAdminPayment(row.id);
    toast("Transaction deleted.");
    load();
  };

  if (!rows) return <div className="loading-center"><div className="spinner" /></div>;

  const filtered = filter === "All" ? rows : rows.filter((r) => r.type === filter);

  const columns: Column<AdminPaymentRow>[] = [
    { key: "id", header: "Reference", render: (r) => r.id },
    { key: "user", header: "User", render: (r) => r.user },
    { key: "type", header: "Type", render: (r) => r.type },
    { key: "amount", header: "Amount", render: (r) => formatCedis(r.amount) },
    { key: "status", header: "Status", render: (r) => <StatusBadge label={r.status} tone={tones[r.status]} /> },
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
          <h2>Payments</h2>
          <div className="sub">Transactions, refunds &amp; rider payouts</div>
        </div>
        <AddButton label="New entry" onClick={() => setModal({ mode: "add" })} />
      </div>

      <div className="filter-row">
        {typeFilters.map((t) => (
          <button key={t} className={`filter-chip ${filter === t ? "selected" : ""}`} onClick={() => setFilter(t)}>
            {t}
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={filtered} />

      <FormModal
        visible={!!modal}
        title={modal?.mode === "add" ? "New transaction" : "Edit transaction"}
        fields={fields}
        initialValues={modal?.row ?? { type: "Delivery payment", status: "Pending" }}
        onClose={() => setModal(null)}
        onSubmit={save}
        loading={saving}
      />
    </div>
  );
};
