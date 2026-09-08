import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchAdminStaff,
  createAdminStaff,
  updateAdminStaff,
  deleteAdminStaff,
  type AdminUser,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { AdminDialog } from "../components/ui/modal/AdminDialog";

type RolePreset = "super_admin" | "content_manager" | "user_manager" | "webinar_manager" | "custom";

const MODULE_LIST = [
  { key: "manage_users", label: "User Management", desc: "View users, mood logs, journal entries, and chat history" },
  { key: "manage_content", label: "Content Management", desc: "Vision & Mission, Hero slides, Store, FAQ, Notifications, Team" },
  { key: "manage_webinar", label: "Webinar Management", desc: "Webinar registrations, events, coupons, and packages" },
  { key: "manage_support", label: "Support Messages", desc: "View and resolve user support inquiries" },
  { key: "manage_admins", label: "Admin Staff & Roles", desc: "View staff list, manage roles and permissions" },
];

export default function AdminStaffManagement() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null);

  // Form states for Add / Edit
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formPreset, setFormPreset] = useState<RolePreset>("content_manager");
  const [formPermissions, setFormPermissions] = useState<string[]>(["manage_content"]);
  const [formCanAddUsers, setFormCanAddUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminStaff();
      setStaff(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin staff list");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const isCurrentUserSuper = useMemo(() => {
    return !currentUser?.adminRole || currentUser.adminRole === "super_admin";
  }, [currentUser]);

  const canCurrentUserAddUsers = useMemo(() => {
    return isCurrentUserSuper || Boolean(currentUser?.canAddUsers);
  }, [isCurrentUserSuper, currentUser]);

  // Handle Preset Change
  const handlePresetSelect = (preset: RolePreset) => {
    setFormPreset(preset);
    if (preset === "super_admin") {
      setFormPermissions(MODULE_LIST.map((m) => m.key));
      setFormCanAddUsers(true);
    } else if (preset === "content_manager") {
      setFormPermissions(["manage_content"]);
      setFormCanAddUsers(false);
    } else if (preset === "user_manager") {
      setFormPermissions(["manage_users"]);
      setFormCanAddUsers(false);
    } else if (preset === "webinar_manager") {
      setFormPermissions(["manage_webinar"]);
      setFormCanAddUsers(false);
    }
  };

  const handlePermissionToggle = (key: string) => {
    setFormPreset("custom");
    setFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const openAddModal = () => {
    setFormEmail("");
    setFormPassword("");
    setFormName("");
    handlePresetSelect("content_manager");
    setIsAddModalOpen(true);
    setError(null);
  };

  const openEditModal = (member: AdminUser) => {
    setEditingStaff(member);
    setFormName(member.fullName || member.username || "");
    const preset = (member.adminRole as RolePreset) || "custom";
    setFormPreset(preset);
    const perms = member.permissions || [];
    setFormPermissions(perms);
    setFormCanAddUsers(Boolean(member.canAddUsers));
    setError(null);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createAdminStaff({
        email: formEmail,
        password: formPassword,
        name: formName,
        adminRole: formPreset,
        permissions: formPermissions,
        canAddUsers: formCanAddUsers,
      });
      setSuccess("Admin account created successfully");
      setIsAddModalOpen(false);
      loadStaff();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create admin account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await updateAdminStaff(editingStaff._id, {
        name: formName,
        adminRole: formPreset,
        permissions: formPermissions,
        canAddUsers: formCanAddUsers,
      });
      setSuccess("Admin role and permissions updated");
      setEditingStaff(null);
      loadStaff();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update admin account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member: AdminUser) => {
    const nextActive = member.isActive === false;
    try {
      await updateAdminStaff(member._id, { isActive: nextActive });
      setStaff((prev) =>
        prev.map((s) => (s._id === member._id ? { ...s, isActive: nextActive } : s))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change status");
    }
  };

  const handleDeleteStaff = async (member: AdminUser) => {
    if (!window.confirm(`Are you sure you want to delete admin account ${member.email}?`)) return;
    try {
      await deleteAdminStaff(member._id);
      setStaff((prev) => prev.filter((s) => s._id !== member._id));
      setSuccess("Admin account deleted successfully");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete admin account");
    }
  };

  // Helper to format role badge
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "super_admin":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Super Admin (Full)</span>;
      case "content_manager":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Content Manager</span>;
      case "user_manager":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">User Manager</span>;
      case "webinar_manager":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Webinar Manager</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Custom Role</span>;
    }
  };

  return (
    <>
      <PageMeta title="Admin Staff & Roles Management" description="Manage role-based access, permissions, and user creation privileges." />
      <PageBreadcrumb pageTitle="Admin Staff & Roles Management" />

      <div className="space-y-6">
        {/* Header Alert Notifications */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm border border-emerald-200 dark:border-emerald-800">
            {success}
          </div>
        )}

        {/* Top Summary Bar & Create Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Accounts & Permissions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Control level of access, enabled/restricted modules, and account creation rights.
            </p>
          </div>
          {canCurrentUserAddUsers && (
            <Button onClick={openAddModal} className="whitespace-nowrap bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl">
              + Add Admin User
            </Button>
          )}
        </div>

        {/* Staff Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading admin staff list...</div>
          ) : staff.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No admin users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Role & Access Level</th>
                    <th className="px-6 py-4">What They Can Access</th>
                    <th className="px-6 py-4">What They Cannot Access</th>
                    <th className="px-6 py-4">Can Add Users?</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {staff.map((member) => {
                    const isSuper = member.adminRole === "super_admin";
                    const memberPerms = Array.isArray(member.permissions) ? member.permissions : [];

                    const allowed = isSuper
                      ? MODULE_LIST
                      : MODULE_LIST.filter((m) => memberPerms.includes(m.key));
                    const restricted = isSuper
                      ? []
                      : MODULE_LIST.filter((m) => !memberPerms.includes(m.key));

                    return (
                      <tr key={member._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {member.fullName || member.username || "Admin"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
                          <div className="mt-1">
                            {member.isActive !== false ? (
                              <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded">
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 px-2 py-0.5 rounded">
                                Deactivated
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {getRoleBadge(member.adminRole)}
                        </td>

                        {/* What they CAN access */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {allowed.length > 0 ? (
                              allowed.map((m) => (
                                <span key={m.key} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                  ✓ {m.label}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </div>
                        </td>

                        {/* What they CANNOT access */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {restricted.length > 0 ? (
                              restricted.map((m) => (
                                <span key={m.key} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                  ✕ {m.label}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">None (Full Access)</span>
                            )}
                          </div>
                        </td>

                        {/* Can Add Users */}
                        <td className="px-6 py-4">
                          {member.canAddUsers || isSuper ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                              ✓ Yes (Allowed)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                              ✕ No (Restricted)
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 underline"
                          >
                            Edit Access
                          </button>
                          <button
                            onClick={() => handleToggleActive(member)}
                            className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 underline"
                          >
                            {member.isActive !== false ? "Deactivate" : "Activate"}
                          </button>
                          {isCurrentUserSuper && (
                            <button
                              onClick={() => handleDeleteStaff(member)}
                              className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 underline"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AdminDialog
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create new admin account"
        description="Choose a role preset or customize module access."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-admin-form"
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              {submitting ? "Creating..." : "Create Admin Account"}
            </Button>
          </>
        }
      >
        <form id="add-admin-form" onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Sarah Connor" />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="sarah@mindsai.live" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <Label>Select Role Preset</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { key: "super_admin", label: "Super Admin", desc: "Full access to all sections" },
                { key: "content_manager", label: "Content Manager", desc: "App content & products" },
                { key: "user_manager", label: "User Manager", desc: "Users & chat history" },
                { key: "webinar_manager", label: "Webinar Manager", desc: "Webinars & coupons" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePresetSelect(p.key as RolePreset)}
                  className={`rounded-xl border p-3 text-left text-xs transition ${
                    formPreset === p.key
                      ? "border-brand-500 bg-brand-50/50 font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-bold">{p.label}</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Module Access Rights</Label>
            <div className="mt-1 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
              {MODULE_LIST.map((m) => (
                <label key={m.key} className="flex cursor-pointer items-start gap-2.5 text-xs">
                  <input
                    type="checkbox"
                    checked={formPreset === "super_admin" || formPermissions.includes(m.key)}
                    disabled={formPreset === "super_admin"}
                    onChange={() => handlePermissionToggle(m.key)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{m.label}</span>
                    <p className="text-[10px] text-gray-500">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">Can add other admin users?</span>
              <p className="text-[10px] text-gray-500">Allow this user to create new admin staff accounts</p>
            </div>
            <input
              type="checkbox"
              checked={formPreset === "super_admin" || formCanAddUsers}
              disabled={formPreset === "super_admin"}
              onChange={(e) => {
                setFormPreset("custom");
                setFormCanAddUsers(e.target.checked);
              }}
              className="h-4 w-4 rounded text-brand-600"
            />
          </label>
        </form>
      </AdminDialog>

      <AdminDialog
        open={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        title="Edit admin role & permissions"
        description={editingStaff?.email}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setEditingStaff(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-admin-form"
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id="edit-admin-form" onSubmit={handleUpdateStaff} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div>
            <Label>Select Role Preset</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { key: "super_admin", label: "Super Admin", desc: "Full access to all sections" },
                { key: "content_manager", label: "Content Manager", desc: "App content & products" },
                { key: "user_manager", label: "User Manager", desc: "Users & chat history" },
                { key: "webinar_manager", label: "Webinar Manager", desc: "Webinars & coupons" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePresetSelect(p.key as RolePreset)}
                  className={`rounded-xl border p-3 text-left text-xs transition ${
                    formPreset === p.key
                      ? "border-brand-500 bg-brand-50/50 font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-bold">{p.label}</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Module Access Rights</Label>
            <div className="mt-1 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
              {MODULE_LIST.map((m) => (
                <label key={m.key} className="flex cursor-pointer items-start gap-2.5 text-xs">
                  <input
                    type="checkbox"
                    checked={formPreset === "super_admin" || formPermissions.includes(m.key)}
                    disabled={formPreset === "super_admin"}
                    onChange={() => handlePermissionToggle(m.key)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{m.label}</span>
                    <p className="text-[10px] text-gray-500">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">Can add other admin users?</span>
              <p className="text-[10px] text-gray-500">Allow this user to create new admin staff accounts</p>
            </div>
            <input
              type="checkbox"
              checked={formPreset === "super_admin" || formCanAddUsers}
              disabled={formPreset === "super_admin"}
              onChange={(e) => {
                setFormPreset("custom");
                setFormCanAddUsers(e.target.checked);
              }}
              className="h-4 w-4 rounded text-brand-600"
            />
          </label>
        </form>
      </AdminDialog>

    </>
  );
}
