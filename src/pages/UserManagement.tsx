import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  unrestrictUserChat,
  type AdminUser,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { AdminDialog } from "../components/ui/modal/AdminDialog";

const emptyCreateForm = {
  email: "",
  password: "",
  username: "",
  fullName: "",
  phone: "",
  occupation: "",
  gender: "" as "" | "male" | "female" | "other",
};

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [softDeletingId, setSoftDeletingId] = useState<string | null>(null);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [chatFilter, setChatFilter] = useState<"all" | "restricted" | "ok">("all");
  const [unrestrictingId, setUnrestrictingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        chatRestricted: chatFilter === "restricted" ? true : chatFilter === "ok" ? false : undefined,
      });
      setUsers(res.data);
      setPagination((prev) => ({
        ...prev,
        total: res.pagination.total,
        totalPages: res.pagination.totalPages,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, chatFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      const isActive = u.isActive !== false;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;
      if (chatFilter === "restricted" && !u.chatRestricted) return false;
      if (chatFilter === "ok" && u.chatRestricted) return false;
      return true;
    });
  }, [users, roleFilter, statusFilter, chatFilter]);

  const handleUpdateRole = async (id: string) => {
    if (!editRoleId || editRoleId !== id) return;
    setUpdatingId(id);
    try {
      const res = await updateUser(id, { role: editRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? res.data : u))
      );
      setEditRoleId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, email?: string) => {
    if (!window.confirm(`Delete user ${email || id}? This will permanently wipe all their data and cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSoftDelete = async (id: string, currentIsActive: boolean, email?: string) => {
    const action = currentIsActive ? "Deactivate" : "Activate";
    if (!window.confirm(`${action} user ${email || id}?`)) return;
    setSoftDeletingId(id);
    try {
      const res = await updateUser(id, { isActive: !currentIsActive });
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isActive: res.data.isActive } : u))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setSoftDeletingId(null);
    }
  };

  const handleUnrestrict = async (id: string, email?: string) => {
    if (!window.confirm(`Unrestrict chat for ${email || id}?`)) return;
    setUnrestrictingId(id);
    try {
      const res = await unrestrictUserChat(id);
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, ...res.data, chatRestricted: false } : u)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unrestrict failed");
    } finally {
      setUnrestrictingId(null);
    }
  };

  const openAddModal = () => {
    setCreateForm(emptyCreateForm);
    setError(null);
    setSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = createForm.email.trim();
    const phone = createForm.phone.trim();
    if (!email && !phone) {
      setError("Email or phone is required");
      return;
    }
    if (createForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createUser({
        email: email || undefined,
        password: createForm.password,
        username: createForm.username.trim() || undefined,
        fullName: createForm.fullName.trim() || undefined,
        phone: phone || undefined,
        occupation: createForm.occupation.trim() || undefined,
        gender: createForm.gender || undefined,
      });
      setUsers((prev) => [res.data, ...prev]);
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1,
        totalPages: Math.max(1, Math.ceil((prev.total + 1) / prev.limit)),
      }));
      setSuccess(res.message || "User created successfully");
      setIsAddModalOpen(false);
      setCreateForm(emptyCreateForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageMeta
        title="User Management | Admin"
        description="Manage app users"
      />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            User Management
          </h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="button" size="sm" onClick={openAddModal}>
              + Add User
            </Button>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by email, username, phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="min-w-[220px]"
              />
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "all" | "user" | "admin")}
                className="h-9 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">All roles</option>
                <option value="user">Users only</option>
                <option value="admin">Admins only</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "active" | "inactive")
                }
                className="h-9 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">All status</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
              <select
                value={chatFilter}
                onChange={(e) => {
                  setChatFilter(e.target.value as "all" | "restricted" | "ok");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="h-9 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">All chat</option>
                <option value="restricted">Chat restricted</option>
                <option value="ok">Chat allowed</option>
              </select>
              <Link
                to="/users/restricted"
                className="inline-flex h-9 items-center rounded border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              >
                Restricted users
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 text-sm text-emerald-700 bg-emerald-50 rounded-lg dark:bg-emerald-900/20 dark:text-emerald-300">
            {success}
          </div>
        )}

        <div className="overflow-hidden bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
                <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Chat</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-3">{user.email || "—"}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/users/${user._id}`}
                          className="text-brand-500 hover:text-brand-600 font-medium hover:underline"
                        >
                          {user.username || user.email || user.phone || user._id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{user.phone || "—"}</td>
                      <td className="px-4 py-3">
                        {editRoleId === user._id ? (
                          <span className="flex items-center gap-2">
                            <select
                              value={editRole}
                              onChange={(e) =>
                                setEditRole(e.target.value as "user" | "admin")
                              }
                              className="h-9 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 text-sm"
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleUpdateRole(user._id)}
                              disabled={updatingId === user._id}
                              className="text-brand-500 hover:text-brand-600 text-sm"
                            >
                              {updatingId === user._id ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditRoleId(null)}
                              className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                user.role === "admin"
                                  ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                              }`}
                            >
                              {user.role}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditRoleId(user._id);
                                setEditRole(user.role);
                              }}
                              className="text-brand-500 hover:text-brand-600 text-sm"
                            >
                              Edit
                            </button>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.chatRestricted ? (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            Restricted
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Allowed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 space-x-3">
                        {user.chatRestricted ? (
                          <button
                            type="button"
                            onClick={() => handleUnrestrict(user._id, user.email)}
                            disabled={unrestrictingId === user._id}
                            className="text-green-600 hover:text-green-700 text-sm disabled:opacity-50 dark:text-green-400"
                          >
                            {unrestrictingId === user._id ? "Unrestricting..." : "Unrestrict"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleSoftDelete(user._id, user.isActive !== false, user.email)}
                          disabled={softDeletingId === user._id}
                          className="text-amber-600 hover:text-amber-700 text-sm disabled:opacity-50 dark:text-amber-500 dark:hover:text-amber-400"
                        >
                          {softDeletingId === user._id ? "Processing..." : (user.isActive !== false ? "Deactivate" : "Activate")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user._id, user.email)}
                          disabled={deletingId === user._id}
                          className="text-red-500 hover:text-red-600 text-sm disabled:opacity-50"
                        >
                          {deletingId === user._id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminDialog
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add custom user"
        description="Create an app user account without the normal signup OTP flow. Email is verified automatically."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-user-form" disabled={creating}>
              {creating ? "Creating..." : "Create User"}
            </Button>
          </>
        }
      >
        <form id="add-user-form" onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={createForm.fullName}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <Label>Username (optional)</Label>
            <Input
              value={createForm.username}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="jane_doe"
            />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input
              value={createForm.phone}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <Label>Occupation (optional)</Label>
            <Input
              value={createForm.occupation}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, occupation: e.target.value }))}
              placeholder="e.g. Student"
            />
          </div>
          <div>
            <Label>Gender (optional)</Label>
            <select
              value={createForm.gender}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  gender: e.target.value as "" | "male" | "female" | "other",
                }))
              }
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Provide at least an email or phone. Password is required so the user can sign in.
          </p>
        </form>
      </AdminDialog>
    </>
  );
}
