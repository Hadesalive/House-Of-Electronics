import React, { useEffect, useMemo, useState } from "react";
import { Button, Toast, Badge, StatusBadge, Modal, ConfirmModal } from "@/components/ui/core";
import { Input, Select, FormSection } from "@/components/ui/forms";
import { KPICard, PaginatedTableCard } from "@/components/ui/dashboard";
import { useAuth, PERMISSIONS } from "@/contexts/AuthContext";
import { User, UserRole, getRoleDisplayName } from "@/lib/types/auth";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  UsersIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

type ToastState = { message: string; type: "success" | "error" } | null;

type StatusFilter = "all" | "active" | "inactive";
type RoleFilter = "all" | UserRole;

interface UserFormData {
  fullName: string;
  username: string;
  role: UserRole;
  email: string;
  phone: string;
  password: string;
}

const emptyForm: UserFormData = {
  fullName: "",
  username: "",
  role: "cashier",
  email: "",
  phone: "",
  password: "",
};

function roleBadge(role: UserRole) {
  if (role === "admin") return <Badge variant="error" size="sm">Admin</Badge>;
  if (role === "manager") return <Badge variant="info" size="sm">Manager</Badge>;
  return <Badge variant="success" size="sm">Cashier</Badge>;
}

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canManageUsers = hasPermission(PERMISSIONS.MANAGE_USERS);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Create/Edit modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!window.electron?.ipcRenderer) return;
        const res = await window.electron.ipcRenderer.invoke("get-users") as {
          success: boolean;
          data?: User[];
          error?: string;
        };
        if (res.success && res.data) setUsers(res.data);
        else setToast({ message: res.error || "Failed to load users", type: "error" });
      } catch (e) {
        setToast({ message: "Failed to load users", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (users || []).filter((u) => {
      // Managers should not see admin accounts
      if (currentUser?.role === "manager" && u.role === "admin") {
        return false;
      }

      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.employeeId.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q);

      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const visibleUsers = currentUser?.role === "manager" ? users.filter(u => u.role !== "admin") : users;
    const total = visibleUsers.length;
    const active = visibleUsers.filter((u) => u.isActive).length;
    const admins = currentUser?.role === "manager" ? 0 : users.filter((u) => u.role === "admin" && u.isActive).length;
    const managers = visibleUsers.filter((u) => u.role === "manager" && u.isActive).length;
    const cashiers = visibleUsers.filter((u) => u.role === "cashier" && u.isActive).length;
    return { total, active, admins, managers, cashiers };
  }, [users, currentUser?.role]);

  const openCreate = () => {
    setEditingUser(null);
    // Managers can only create manager/cashier
    const defaultRole = currentUser?.role === "manager" ? "cashier" : "cashier";
    setFormData({ ...emptyForm, role: defaultRole });
    setIsFormOpen(true);
  };

  const openEdit = (u: User) => {
    // Managers cannot edit admin accounts
    if (currentUser?.role === "manager" && u.role === "admin") {
      setToast({ message: "Managers cannot edit admin accounts.", type: "error" });
      return;
    }
    setEditingUser(u);
    setFormData({
      fullName: u.fullName,
      username: u.username,
      role: u.role,
      email: u.email || "",
      phone: u.phone || "",
      password: "",
    });
    setIsFormOpen(true);
  };

  const saveUser = async () => {
    if (!window.electron?.ipcRenderer) return;

    if (!formData.fullName.trim() || !formData.username.trim() || !formData.role) {
      setToast({ message: "Full name, username and role are required.", type: "error" });
      return;
    }
    if (!editingUser && formData.password.trim().length < 6) {
      setToast({ message: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    // Managers cannot create or promote to admin
    if (currentUser?.role === "manager" && formData.role === "admin") {
      setToast({ message: "Managers can only create Manager or Cashier roles.", type: "error" });
      return;
    }
    // Managers cannot demote/promote admin accounts
    if (currentUser?.role === "manager" && editingUser?.role === "admin") {
      setToast({ message: "Managers cannot modify admin accounts.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      if (!editingUser) {
        const res = await window.electron.ipcRenderer.invoke("create-user", {
          username: formData.username.trim(),
          password: formData.password.trim(),
          fullName: formData.fullName.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: formData.role,
        }) as { success: boolean; data?: User; error?: string };

        if (res.success && res.data) {
          setUsers((prev) => [res.data!, ...prev]);
          setToast({ message: "User created successfully", type: "success" });
          setIsFormOpen(false);
        } else {
          setToast({ message: res.error || "Failed to create user", type: "error" });
        }
      } else {
        const res = await window.electron.ipcRenderer.invoke("update-user", {
          id: editingUser.id,
          username: formData.username.trim(),
          fullName: formData.fullName.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: formData.role,
        }) as { success: boolean; data?: User; error?: string };

        if (res.success && res.data) {
          setUsers((prev) => prev.map((u) => (u.id === res.data!.id ? res.data! : u)));
          setToast({ message: "User updated successfully", type: "success" });
          setIsFormOpen(false);
        } else {
          setToast({ message: res.error || "Failed to update user", type: "error" });
        }
      }
    } catch (e) {
      setToast({ message: "Operation failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = (u: User) => {
    if (currentUser?.role === "manager" && u.role === "admin") {
      setToast({ message: "Managers cannot deactivate admin accounts.", type: "error" });
      return;
    }
    setDeactivateTarget(u);
  };

  const deactivateUser = async () => {
    if (!deactivateTarget || !window.electron?.ipcRenderer) return;
    try {
      setSaving(true);
      const res = await window.electron.ipcRenderer.invoke("delete-user", deactivateTarget.id) as {
        success: boolean;
        error?: string;
      };
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.id === deactivateTarget.id ? { ...u, isActive: false } : u)));
        setToast({ message: "User deactivated", type: "success" });
      } else {
        setToast({ message: res.error || "Failed to deactivate user", type: "error" });
      }
    } catch {
      setToast({ message: "Failed to deactivate user", type: "error" });
    } finally {
      setSaving(false);
      setDeactivateTarget(null);
    }
  };

  const toggleActive = async (u: User) => {
    if (!window.electron?.ipcRenderer) return;
    if (u.id === currentUser?.id) return;
    try {
      const res = await window.electron.ipcRenderer.invoke("update-user", {
        id: u.id,
        isActive: !u.isActive,
      }) as { success: boolean; data?: User; error?: string };
      if (res.success && res.data) {
        setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data! : x)));
        setToast({ message: `User ${res.data.isActive ? "activated" : "deactivated"}`, type: "success" });
      } else {
        setToast({ message: res.error || "Failed to update user", type: "error" });
      }
    } catch {
      setToast({ message: "Failed to update user", type: "error" });
    }
  };

  const openResetPassword = (u: User) => {
    setResetTarget(u);
    setResetPassword("");
  };

  const doResetPassword = async () => {
    if (!resetTarget || !window.electron?.ipcRenderer) return;
    if (resetPassword.trim().length < 6) {
      setToast({ message: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    try {
      setResetSaving(true);
      const res = await window.electron.ipcRenderer.invoke("reset-password", {
        userId: resetTarget.id,
        newPassword: resetPassword.trim(),
      }) as { success: boolean; error?: string };

      if (res.success) {
        setToast({ message: "Password reset successfully", type: "success" });
        setResetTarget(null);
        setResetPassword("");
      } else {
        setToast({ message: res.error || "Failed to reset password", type: "error" });
      }
    } catch {
      setToast({ message: "Failed to reset password", type: "error" });
    } finally {
      setResetSaving(false);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <div className="rounded-xl p-10 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--muted-foreground)" }} />
          <div className="text-lg font-semibold mb-1" style={{ color: "var(--foreground)" }}>
            Access denied
          </div>
          <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            You don’t have permission to manage users.
          </div>
        </div>
      </div>
    );
  }

  const tableColumns = [
    { key: "user", label: "User", sortable: true },
    { key: "employeeId", label: "Employee ID", sortable: true, className: "whitespace-nowrap" },
    { key: "role", label: "Role", sortable: true, className: "whitespace-nowrap" },
    { key: "status", label: "Status", sortable: false, className: "whitespace-nowrap" },
    { key: "lastLogin", label: "Last Login", sortable: true, className: "whitespace-nowrap" },
    { key: "actions", label: "Actions", sortable: false, className: "whitespace-nowrap text-right" },
  ];

  const tableData = filteredUsers.map((u) => ({
    user: (
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ background: "linear-gradient(135deg, var(--accent), #8b5cf6)" }}
        >
          {u.fullName?.slice(0, 1)?.toUpperCase() || "U"}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate" style={{ color: "var(--foreground)" }}>
            {u.fullName}
          </div>
          <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
            @{u.username}{u.email ? ` • ${u.email}` : ""}
          </div>
        </div>
      </div>
    ),
    employeeId: <span className="font-mono text-xs" style={{ color: "var(--foreground)" }}>{u.employeeId}</span>,
    role: roleBadge(u.role),
    status: (
      <button
        className="inline-flex"
        onClick={() => toggleActive(u)}
        title={u.id === currentUser?.id ? "You cannot disable your own account" : "Toggle active"}
        style={{ cursor: u.id === currentUser?.id ? "not-allowed" : "pointer", opacity: u.id === currentUser?.id ? 0.6 : 1 }}
      >
        <StatusBadge status={u.isActive ? "active" : "inactive"} size="sm" />
      </button>
    ),
    lastLogin: (
      <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "—"}
      </span>
    ),
    actions: (
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => openEdit(u)} className="h-8 px-2">
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => openResetPassword(u)} className="h-8 px-2">
          <KeyIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => confirmDeactivate(u)}
          className="h-8 px-2"
          disabled={u.id === currentUser?.id}
          title={u.id === currentUser?.id ? "You cannot deactivate your own account" : "Deactivate user"}
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Users</h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Manage cashiers, managers and admins.
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={openCreate} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* KPI */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Total Users" value={stats.total} icon={<UsersIcon className="h-6 w-6" style={{ color: "var(--accent)" }} />} accentColor="#3b82f6" />
        <KPICard title="Active" value={stats.active} icon={<UsersIcon className="h-6 w-6" style={{ color: "var(--accent)" }} />} accentColor="#22c55e" />
        <KPICard title="Admins" value={stats.admins} icon={<ShieldCheckIcon className="h-6 w-6" style={{ color: "var(--accent)" }} />} accentColor="#8b5cf6" />
        <KPICard title="Managers" value={stats.managers} icon={<UsersIcon className="h-6 w-6" style={{ color: "var(--accent)" }} />} accentColor="#6366f1" />
        <KPICard title="Cashiers" value={stats.cashiers} icon={<UsersIcon className="h-6 w-6" style={{ color: "var(--accent)" }} />} accentColor="#06b6d4" />
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 flex flex-wrap gap-3 items-end" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex-1 min-w-[240px]">
          <Input
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Name, username, employee ID, email..."
            leftIcon={<MagnifyingGlassIcon className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />}
          />
        </div>
        <div className="min-w-[180px]">
          <Select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            options={[
              { value: "all", label: "All roles" },
              { value: "admin", label: "Admin" },
              { value: "manager", label: "Manager" },
              { value: "cashier", label: "Cashier" },
            ]}
          />
        </div>
        <div className="min-w-[180px]">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: "all", label: "All status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <PaginatedTableCard
        title="All Users"
        columns={tableColumns}
        data={tableData}
        loading={loading}
        empty={!loading && filteredUsers.length === 0}
        emptyTitle="No users found"
        emptyDescription="Try adjusting your search or filters."
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? "Edit User" : "Add User"}
        size="lg"
      >
        <div className="space-y-6">
          <FormSection title="User Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full name"
                required
                value={formData.fullName}
                onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="e.g. Aminata Kamara"
              />
              <Input
                label="Username"
                required
                value={formData.username}
                onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                placeholder="e.g. aminata"
              />
              <Select
                label="Role"
                value={formData.role}
                onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as UserRole }))}
                options={
                  currentUser?.role === "manager"
                    ? [
                        { value: "cashier", label: "Cashier" },
                        { value: "manager", label: "Manager" },
                      ]
                    : [
                        { value: "cashier", label: "Cashier" },
                        { value: "manager", label: "Manager" },
                        { value: "admin", label: "Admin" },
                      ]
                }
              />
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Optional"
              />
              <div className="md:col-span-2">
                <Input
                  label="Email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              {!editingUser && (
                <div className="md:col-span-2">
                  <Input
                    label="Password"
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    helperText="Minimum 6 characters."
                  />
                </div>
              )}
            </div>
          </FormSection>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveUser} disabled={saving} className="gap-2">
              {saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={deactivateUser}
        title="Deactivate User"
        message={
          deactivateTarget
            ? `Deactivate ${deactivateTarget.fullName}? They won’t be able to log in.`
            : ""
        }
        confirmText="Deactivate"
        variant="danger"
      />

      {/* Reset password */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={resetTarget ? `Reset Password • ${resetTarget.fullName}` : "Reset Password"}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Set a new password for this user.
          </p>
          <Input
            label="New password"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            helperText="Minimum 6 characters."
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={doResetPassword} disabled={resetSaving} className="gap-2">
              {resetSaving ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast title={toast.message} variant={toast.type} onClose={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}
    </div>
  );
}


