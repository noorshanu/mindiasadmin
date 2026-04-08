import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import {
  sendAdminPush,
  fetchAdminNotifications,
  type PushBroadcastRow,
} from "../lib/api";

export default function PushNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dataJson, setDataJson] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [history, setHistory] = useState<PushBroadcastRow[]>([]);
  const [histPage, setHistPage] = useState(1);
  const [histPagination, setHistPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetchAdminNotifications({ page: histPage, limit: 20 });
      setHistory(res.broadcasts);
      setHistPagination(res.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [histPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const parseData = (): Record<string, unknown> | undefined => {
    const t = dataJson.trim();
    if (!t) return undefined;
    try {
      const parsed = JSON.parse(t) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(
          "Data must be a JSON object, e.g. {\"type\":\"news\"}, or leave empty. Plain text (no { ) is sent as {\"payload\":\"…\"}.",
        );
      }
      return parsed as Record<string, unknown>;
    } catch (e) {
      const startsAsObject = t.startsWith("{");
      if (!startsAsObject) {
        return { payload: t };
      }
      const msg =
        e instanceof Error && e.message.startsWith("Data must be a JSON object")
          ? e.message
          : "Invalid JSON in data field. Fix the object or clear the field.";
      throw new Error(msg);
    }
  };

  const runSend = async () => {
    setError(null);
    setResult(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required");
      setConfirmOpen(false);
      return;
    }
    let data: Record<string, unknown> | undefined;
    try {
      data = parseData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid data JSON");
      setConfirmOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      const summary = await sendAdminPush({
        title: title.trim(),
        body: body.trim(),
        data,
      });
      setResult(
        `Done: targeted ${summary.targeted}, sent ${summary.sent}, failed ${summary.failed}, skipped ${summary.skipped}`,
      );
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  return (
    <>
      <PageMeta
        title="Push Notifications | Admin"
        description="Send FCM push notifications to all active users"
      />
      <div className="space-y-8">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Push notifications
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 -mt-4">
          Each send goes to <strong>all active users</strong>. History shows one row per send (not per user).
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
              {result}
            </div>
          )}

          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
            />
          </div>
          <div>
            <Label>Body</Label>
            <TextArea
              value={body}
              onChange={(v) => setBody(v)}
              rows={3}
              placeholder="Notification message"
            />
          </div>
          <div>
            <Label>Data (optional JSON object)</Label>
            <TextArea
              value={dataJson}
              onChange={(v) => setDataJson(v)}
              rows={4}
              placeholder='Optional: JSON object like {"type":"chat"} — or a single line of text (sent as payload)'
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send to all active users"}
          </Button>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white">
            Send history
          </h2>
          {historyLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No sends yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2 pr-4">When</th>
                      <th className="pb-2 pr-4">Title</th>
                      <th className="pb-2 pr-4 text-right">Targeted</th>
                      <th className="pb-2 pr-4 text-right">Sent</th>
                      <th className="pb-2 pr-4 text-right">Failed</th>
                      <th className="pb-2 pr-4 text-right">Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((n) => (
                      <tr
                        key={n._id}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-2 pr-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {new Date(n.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 max-w-xs">
                          <span className="font-medium block truncate">{n.title}</span>
                          <span className="text-gray-500 dark:text-gray-400 line-clamp-2 text-xs mt-0.5">
                            {n.body}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">{n.targeted}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-green-600">
                          {n.sent}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-red-600">
                          {n.failed}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-amber-600">
                          {n.skipped}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={histPage <= 1}
                  onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {histPagination.page} / {histPagination.totalPages || 1}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={histPage >= histPagination.totalPages}
                  onClick={() => setHistPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Send to all active users?
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            This notifies every active account, creates an in-app row per user, and attempts FCM for users with device tokens.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void runSend()}
            >
              {submitting ? "Sending…" : "Confirm send"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
