import React, { useEffect, useState } from "react";
import { StatusBadge } from "@/components/Primitives";
import { DataTable, Column, AddButton, IconAction } from "@/components/AdminWidgets";
import { FormModal, FormField } from "@/components/FormModal";
import { useUI } from "@/context/UIContext";
import * as api from "@/services/mockApi";
import { AdminUserRow } from "@/services/mockApi";

const fields: FormField[] = [
  { key: "name", label: "Full name", type: "text" },
  { key: "phone", label: "Phone number", type: "text" },
  { key: "email", label: "Email", type: "text", inputType: "email" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Suspended"] },
];

export const AdminUsersPage: React.FC = () => {
  const { toast, confirm } = useUI();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [modal, setModal] = useState<{ mode: "add" | "edit"; row?: AdminUserRow } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.fetchAdminUsers().then(setUsers);
  useEffect(() => {
    load();
  }, []);

  const save = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await api.createAdminUser({ name: values.name, phone: values.phone, email: values.email, status: values.status ?? "Active" });
        toast("User added.");
      } else if (modal?.row) {
        await api.updateAdminUser(modal.row.id, values);
        toast("User updated.");
      }
      await load();
      setModal(null);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row: AdminUserRow) => {
    await api.toggleAdminUserStatus(row.id);
    load();
  };

  const remove = async (row: AdminUserRow) => {
    const ok = await confirm({ title: "Delete user", message: `Remove ${row.name}? This can't be undone.`, confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    await api.deleteAdminUser(row.id);
    toast("User deleted.");
    load();
  };

  if (!users) return <div className="loading-center"><div className="spinner" /></div>;

  const columns: Column<AdminUserRow>[] = [
    { key: "name", header: "User", render: (r) => r.name },
    { key: "phone", header: "Phone", render: (r) => r.phone },
    { key: "deliveries", header: "Deliveries", render: (r) => String(r.deliveries) },
    { key: "joined", header: "Joined", render: (r) => r.joined },
    { key: "status", header: "Status", render: (r) => <StatusBadge label={r.status} tone={r.status === "Active" ? "green" : "red"} /> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="table-actions">
          <IconAction icon="✎" title="Edit" onClick={() => setModal({ mode: "edit", row: r })} />
          <IconAction icon={r.status === "Active" ? "⏸" : "▶"} color="var(--warning)" title="Toggle status" onClick={() => toggleStatus(r)} />
          <IconAction icon="🗑" color="var(--danger)" title="Delete" onClick={() => remove(r)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2>Users</h2>
          <div className="sub">{users.length} registered customers</div>
        </div>
        <AddButton label="Add user" onClick={() => setModal({ mode: "add" })} />
      </div>

      <DataTable columns={columns} rows={users} />

      <FormModal
        visible={!!modal}
        title={modal?.mode === "add" ? "Add user" : "Edit user"}
        fields={fields}
        initialValues={modal?.row ?? { status: "Active" }}
        onClose={() => setModal(null)}
        onSubmit={save}
        loading={saving}
      />
    </div>
  );
};
