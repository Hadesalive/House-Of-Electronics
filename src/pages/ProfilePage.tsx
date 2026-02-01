import React, { useMemo, useState } from "react";
import { Button, Toast, Badge } from "@/components/ui/core";
import { Input, FormSection } from "@/components/ui/forms";
import { KPICard } from "@/components/ui/dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleDisplayName } from "@/lib/types/auth";
import { useNavigate } from "react-router-dom";
import { ArrowRightOnRectangleIcon, KeyIcon, UserCircleIcon } from "@heroicons/react/24/outline";

type ToastState = { message: string; type: "success" | "error" } | null;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [toast, setToast] = useState<ToastState>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const initials = useMemo(() => {
    if (!user?.fullName) return "U";
    return user.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  }, [user?.fullName]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChangePassword = async () => {
    if (!window.electron?.ipcRenderer) {
      setToast({ message: "Electron IPC not available", type: "error" });
      return;
    }
    if (newPassword.trim().length < 6) {
      setToast({ message: "New password must be at least 6 characters.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ message: "New password and confirm password do not match.", type: "error" });
      return;
    }
    try {
      setSaving(true);
      const res = await window.electron.ipcRenderer.invoke("change-password", {
        userId: user.id,
        currentPassword,
        newPassword,
      }) as { success: boolean; error?: string };

      if (res.success) {
        setToast({ message: "Password changed successfully.", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setToast({ message: res.error || "Failed to change password", type: "error" });
      }
    } catch (e) {
      setToast({ message: "Failed to change password", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Profile
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Your account details and security settings.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Summary */}
      <div className="rounded-xl p-6 border flex items-center gap-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ background: "linear-gradient(135deg, var(--accent), #8b5cf6)" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-lg font-semibold truncate" style={{ color: "var(--foreground)" }}>
              {user.fullName}
            </div>
            <Badge variant="secondary" size="sm">{getRoleDisplayName(user.role)}</Badge>
          </div>
          <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            @{user.username} • {user.employeeId}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Role" value={getRoleDisplayName(user.role)} icon={<UserCircleIcon className="h-6 w-6" style={{ color: "var(--accent)" }} />} accentColor="#8b5cf6" />
        <KPICard title="Employee ID" value={user.employeeId} icon={<UserCircleIcon className="h-6 w-6" style={{ color: "var(--accent)" }} />} accentColor="#3b82f6" />
        <KPICard title="Last Login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"} icon={<UserCircleIcon className="h-6 w-6" style={{ color: "var(--accent)" }} />} accentColor="#06b6d4" />
      </div>

      {/* Security */}
      <div className="rounded-xl border p-6 space-y-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <KeyIcon className="h-5 w-5" style={{ color: "var(--accent)" }} />
          <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Security</h2>
        </div>

        <FormSection title="Change Password">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <div />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Minimum 6 characters."
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={handleChangePassword} disabled={saving} className="gap-2">
              <KeyIcon className="h-4 w-4" />
              {saving ? "Saving..." : "Update Password"}
            </Button>
          </div>
        </FormSection>
      </div>

      {toast && (
        <Toast title={toast.message} variant={toast.type} onClose={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}
    </div>
  );
}


