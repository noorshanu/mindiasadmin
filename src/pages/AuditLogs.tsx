import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { fetchAuditLogs, type AuditLogRow } from "../lib/api";
import Input from "../components/form/input/InputField";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLogs({ search: search || undefined });
      setLogs(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <>
      <PageMeta title="System Audit Trail & Security Logs | Admin" description="Track all admin actions, modifications, and system operations" />
      <PageBreadcrumb pageTitle="System Audit Trail" />

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Audit Log History</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Persistent record of all administrative updates, staff additions, and content edits.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, action, or target..."
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No audit log records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Admin Email</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Target Model</th>
                    <th className="px-6 py-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {log.adminEmail}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                        {log.targetModel || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {log.ipAddress || "Internal"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
