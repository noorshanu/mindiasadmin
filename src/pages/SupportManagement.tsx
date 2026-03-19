import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchSupportMessages,
  updateSupportMessageStatus,
  type SupportMessage,
} from "../lib/api";
import Button from "../components/ui/button/Button";

export default function SupportManagement() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSupportMessages({
        status: filter === "all" ? undefined : filter,
        page: pagination.page,
        limit: pagination.limit,
      });
      setMessages(res.data);
      setPagination(res.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [filter, pagination.page, pagination.limit]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleMarkResolved = async (id: string) => {
    setUpdatingId(id);
    setError(null);
    try {
      const res = await updateSupportMessageStatus(id, "resolved");
      setMessages((prev) => prev.map((m) => (m._id === id ? res.data : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkPending = async (id: string) => {
    setUpdatingId(id);
    setError(null);
    try {
      const res = await updateSupportMessageStatus(id, "pending");
      setMessages((prev) => prev.map((m) => (m._id === id ? res.data : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <PageMeta title="Support Messages | Admin" description="View and manage support messages" />
      <PageBreadcrumb pageTitle="Support Messages" />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Support Messages
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View messages from the contact form and mark them as resolved.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {(["all", "pending", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800">
            No support messages yet.
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m._id}
                className={`rounded-xl border p-4 dark:bg-gray-800 ${
                  m.status === "resolved"
                    ? "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                    : "border-gray-200 bg-white dark:border-gray-700"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium uppercase bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {m.subject}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.status === "resolved"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <p className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
                  From: {m.email}
                </p>
                <p className="mb-3 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                  {m.message}
                </p>
                <div className="flex gap-2">
                  {m.status === "pending" ? (
                    <Button
                      size="sm"
                      disabled={updatingId === m._id}
                      onClick={() => handleMarkResolved(m._id)}
                    >
                      {updatingId === m._id ? "Updating..." : "Mark as Resolved"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === m._id}
                      onClick={() => handleMarkPending(m._id)}
                    >
                      {updatingId === m._id ? "Updating..." : "Mark as Pending"}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
