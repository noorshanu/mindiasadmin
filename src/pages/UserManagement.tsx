import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import {
  fetchUsers,
  updateUser,
  deleteUser,
  type AdminUser,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"user" | "admin">("user");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
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
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

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
    if (!window.confirm(`Delete user ${email || id}? This cannot be undone.`)) return;
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
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by email, username, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="min-w-[200px]"
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="overflow-hidden bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading users...
            </div>
          ) : users.length === 0 ? (
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
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-3">{user.email || "—"}</td>
                      <td className="px-4 py-3">{user.username || "—"}</td>
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
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
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
    </>
  );
}
