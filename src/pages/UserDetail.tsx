import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchUser,
  fetchUserSessions,
  fetchUserSupport,
  fetchUserMoodLogs,
  fetchUserJournalEntries,
  fetchUserActivityHistory,
  updateUser,
  type AdminUser,
  type AdminChatSession,
  type SupportMessage,
  type MoodLogRow,
  type UserJournalEntryRow,
  type UserActivityHistoryRow,
} from "../lib/api";

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sessions, setSessions] = useState<AdminChatSession[]>([]);
  const [support, setSupport] = useState<SupportMessage[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLogRow[]>([]);
  const [journalEntries, setJournalEntries] = useState<UserJournalEntryRow[]>([]);
  const [activityHistory, setActivityHistory] = useState<UserActivityHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [userRes, sessionsRes, supportRes, moodRes, journalRes, activityRes] = await Promise.all([
        fetchUser(id),
        fetchUserSessions(id),
        fetchUserSupport(id),
        fetchUserMoodLogs(id, { limit: 200 }),
        fetchUserJournalEntries(id, { limit: 100 }),
        fetchUserActivityHistory(id, { limit: 120 }),
      ]);
      setUser(userRes.data);
      setEditEmail(userRes.data.email || "");
      setEditUsername(userRes.data.username || "");
      setEditRole(userRes.data.role);
      setSessions(sessionsRes.data);
      setSupport(supportRes.data);
      setMoodLogs(moodRes.data);
      setJournalEntries(journalRes.data);
      setActivityHistory(activityRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async () => {
    if (!user || togglingActive) return;
    const nextActive = !(user.isActive !== false);
    setTogglingActive(true);
    setError(null);
    try {
      const res = await updateUser(user._id, { isActive: nextActive });
      setUser(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setTogglingActive(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || savingProfile) return;
    setSavingProfile(true);
    setError(null);
    try {
      const res = await updateUser(user._id, {
        email: editEmail.trim() || undefined,
        username: editUsername.trim() || undefined,
        role: editRole,
      });
      setUser(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user details");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageMeta title="User Detail | Admin" description="View user details" />
        <PageBreadcrumb pageTitle="User Detail" />
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
      </>
    );
  }

  if (error && !user) {
    return (
      <>
        <PageMeta title="User Detail | Admin" description="View user details" />
        <PageBreadcrumb pageTitle="User Detail" />
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
        <Link
          to="/users"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
        >
          Back to Users
        </Link>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageMeta title="User Detail | Admin" description="View user details" />
        <PageBreadcrumb pageTitle="User Detail" />
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">User not found.</div>
        <Link
          to="/users"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
        >
          Back to Users
        </Link>
      </>
    );
  }

  const isActive = user.isActive !== false;

  return (
    <>
      <PageMeta title={`${user.fullName || user.email || user.username || "User"} | Admin`} description="User detail" />
      <PageBreadcrumb pageTitle="User Detail" />
      <div className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Full user info + editable fields */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Profile</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Account: {isActive ? "Active" : "Inactive"}
              </span>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={togglingActive}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                } disabled:opacity-50`}
              >
                {togglingActive ? "Updating..." : isActive ? "Deactivate" : "Activate"}
              </button>
        <Link
          to="/users"
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
        >
          Back to Users
        </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Email (editable)
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Username (editable)
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Role (editable)
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as "user" | "admin")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <div className="mb-6">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Username</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.username || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Full name</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.fullName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === "admin"
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                  }`}
                >
                  {user.role}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Persona</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.persona || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Occupation</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.occupation || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Gender</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.gender || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date of birth</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">
                {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email verified</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.isEmailVerified ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone verified</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">{user.isPhoneVerified ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-white/90">
                {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Chat history */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Chat history</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No chat sessions.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSessionId((prev) => (prev === session._id ? null : session._id))
                    }
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {session.title || "Conversation"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {session.messages?.length ?? 0} messages · {session.updatedAt ? new Date(session.updatedAt).toLocaleString() : ""}
                    </span>
                  </button>
                  {expandedSessionId === session._id && session.messages?.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-4 max-h-80 overflow-y-auto space-y-3">
                      {session.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`text-sm ${msg.role === "user" ? "text-gray-700 dark:text-gray-300" : "text-gray-600 dark:text-gray-400"}`}
                        >
                          <span className="font-medium text-gray-500 dark:text-gray-500">
                            {msg.role === "user" ? "User" : "AI"}:
                          </span>{" "}
                          {msg.content?.substring(0, 500)}
                          {(msg.content?.length ?? 0) > 500 ? "…" : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mood logs (3 slots per day: morning, afternoon, evening) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Mood logs</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Up to three entries per calendar day — morning, afternoon, and evening — as recorded in the app.
          </p>
          {moodLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No mood logs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Period</th>
                    <th className="py-2 pr-4 font-medium">Mood</th>
                    <th className="py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {moodLogs.map((row) => (
                    <tr
                      key={row._id}
                      className="border-b border-gray-100 dark:border-gray-800 text-gray-800 dark:text-white/90"
                    >
                      <td className="py-2 pr-4 whitespace-nowrap">{row.dateKey}</td>
                      <td className="py-2 pr-4 capitalize">{row.period}</td>
                      <td className="py-2 pr-4">{row.mood}</td>
                      <td className="py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Journal entries (free-form text + mood from app) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Journal entries</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Text journal posts the user saved from the app (mood + note).
          </p>
          {journalEntries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No journal entries yet.</p>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {journalEntries.map((row) => (
                <div
                  key={row._id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </span>
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium capitalize text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                      {row.mood}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {row.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Activity history (fast relief / breathing / etc) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Activity history</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            App activity sessions such as guided breathing and other fast-relief tools.
          </p>
          {activityHistory.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No activity history yet.</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {activityHistory.map((row) => (
                <div
                  key={row._id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-800 dark:text-white/90">{row.title}</span>
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                      {row.completed ? "Completed" : "Stopped"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Type: {row.activityType}</span>
                    <span>Duration: {typeof row.durationSec === "number" ? `${row.durationSec}s` : "—"}</span>
                    <span>{row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activities / Support messages */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Support / Activities</h3>
          {support.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No support messages from this user.</p>
          ) : (
            <div className="space-y-3">
              {support.map((msg) => (
                <div
                  key={msg._id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-gray-800 dark:text-white/90">{msg.subject}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        msg.status === "resolved"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      {msg.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{msg.message}</p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
