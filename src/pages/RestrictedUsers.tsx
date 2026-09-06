import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchRestrictedUsers,
  fetchModerationEvents,
  unrestrictUserChat,
  updateModerationEvent,
  type AdminUser,
  type ModerationEvent,
  type ModerationEventStatus,
} from "../lib/api";
import Button from "../components/ui/button/Button";

function userIdFromEvent(event: ModerationEvent): string {
  if (typeof event.userId === "string") return event.userId;
  return event.userId?._id || "";
}

function userLabelFromEvent(event: ModerationEvent): string {
  if (typeof event.userId === "object" && event.userId) {
    return event.userId.email || event.userId.username || event.userId.phone || event.userId._id;
  }
  return event.userId || "—";
}

export default function RestrictedUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unrestrictingId, setUnrestrictingId] = useState<string | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [restrictedRes, eventsRes] = await Promise.all([
        fetchRestrictedUsers(),
        fetchModerationEvents({ page: 1, limit: 30, status: "open" }),
      ]);
      setUsers(restrictedRes.data);
      setEvents(eventsRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load restricted users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleModerationStatus = async (eventId: string, status: ModerationEventStatus) => {
    setUpdatingEventId(eventId);
    setError(null);
    try {
      await updateModerationEvent(eventId, { status });
      setEvents((prev) => prev.filter((ev) => ev._id !== eventId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update moderation event");
    } finally {
      setUpdatingEventId(null);
    }
  };

  const handleUnrestrict = async (id: string, email?: string) => {
    if (
      !window.confirm(
        `Unrestrict chat for ${email || id}? They will be able to send messages again.`,
      )
    ) {
      return;
    }
    setUnrestrictingId(id);
    setError(null);
    try {
      await unrestrictUserChat(id, "Unrestricted from admin Restricted Users page");
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setEvents((prev) =>
        prev.filter((ev) => userIdFromEvent(ev) !== id),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unrestrict user");
    } finally {
      setUnrestrictingId(null);
    }
  };

  return (
    <>
      <PageMeta
        title="Restricted Users | Admin"
        description="Users blocked from chat by safety moderation"
      />
      <PageBreadcrumb pageTitle="Restricted Users" />
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Restricted Users
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Chat-blocked accounts from safety flags. Unrestrict here — no need to search by email.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Currently blocked ({users.length})
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No users are currently restricted from chat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 text-xs uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Restricted at</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/users/${user._id}`}
                          className="font-medium text-brand-500 hover:underline"
                        >
                          {user.email || user.username || user.phone || user._id}
                        </Link>
                        {user.username && user.email ? (
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{user.phone || "—"}</td>
                      <td className="max-w-xs px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {user.chatRestrictedReason || "Safety policy"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.chatRestrictedAt
                          ? new Date(user.chatRestrictedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{user.moderationFlagCount ?? 0}</td>
                      <td className="space-x-3 px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleUnrestrict(user._id, user.email)}
                          disabled={unrestrictingId === user._id}
                          className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50 dark:text-green-400"
                        >
                          {unrestrictingId === user._id ? "Unrestricting…" : "Unrestrict chat"}
                        </button>
                        <Link
                          to={`/users/${user._id}`}
                          className="text-sm text-brand-500 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Open safety flags
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Recent messages that triggered a restriction. Unrestrict from the table above.
            </p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No open moderation events.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 text-xs uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Excerpt</th>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const uid = userIdFromEvent(event);
                    return (
                      <tr
                        key={event._id}
                        className="border-b border-gray-200 align-top hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-3">
                          {uid ? (
                            <Link
                              to={`/users/${uid}`}
                              className="font-medium text-brand-500 hover:underline"
                            >
                              {userLabelFromEvent(event)}
                            </Link>
                          ) : (
                            userLabelFromEvent(event)
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{event.category}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              event.severity === "critical"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            }`}
                          >
                            {event.severity}
                          </span>
                        </td>
                        <td className="max-w-md px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {event.messageExcerpt}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {event.createdAt
                            ? new Date(event.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {uid ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUnrestrict(uid, userLabelFromEvent(event))
                                }
                                disabled={unrestrictingId === uid}
                                className="text-left text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50 dark:text-green-400"
                              >
                                {unrestrictingId === uid
                                  ? "Unrestricting…"
                                  : "Unrestrict"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void handleModerationStatus(event._id, "reviewed")}
                              disabled={updatingEventId === event._id}
                              className="text-left text-sm text-brand-500 hover:underline disabled:opacity-50"
                            >
                              {updatingEventId === event._id ? "Updating…" : "Mark reviewed"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleModerationStatus(event._id, "dismissed")}
                              disabled={updatingEventId === event._id}
                              className="text-left text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400"
                            >
                              Dismiss
                            </button>
                          </div>
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
    </>
  );
}
