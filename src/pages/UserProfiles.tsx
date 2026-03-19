import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import { adminMe } from "../lib/api";
import type { AdminUser } from "../lib/api";

export default function UserProfiles() {
  const { user: contextUser } = useAuth();
  const [user, setUser] = useState<AdminUser | null>(contextUser ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminMe()
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch(() => {
        if (!cancelled) setUser(contextUser ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contextUser]);

  return (
    <>
      <PageMeta
        title="Admin Profile | Mind's AI Admin"
        description="Your admin profile"
      />
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Admin Profile
        </h3>
        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : user ? (
          <div className="space-y-6">
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
              <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Account</h4>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {user.role}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</dt>
                  <dd className="mt-0.5 text-gray-800 dark:text-white/90">
                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Not signed in.</div>
        )}
      </div>
    </>
  );
}
