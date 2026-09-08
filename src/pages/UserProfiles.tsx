import { useEffect, useState } from "react"
import { Shield, Mail, User as UserIcon, Phone, Calendar } from "lucide-react"
import PageBreadcrumb from "../components/common/PageBreadCrumb"
import PageMeta from "../components/common/PageMeta"
import AdminPageHeader from "../components/admin/AdminPageHeader"
import { useAuth } from "../context/AuthContext"
import { adminMe } from "../lib/api"
import type { AdminUser } from "../lib/api"

const roleLabel = (user: AdminUser) => {
  if (user.adminRole === "super_admin" || (!user.adminRole && user.role === "admin")) return "Super Admin"
  if (user.adminRole === "content_manager") return "Content Manager"
  if (user.adminRole === "user_manager") return "User Manager"
  if (user.adminRole === "webinar_manager") return "Webinar Manager"
  if (user.adminRole === "support_manager") return "Support Manager"
  return user.adminRole || user.role
}

export default function UserProfiles() {
  const { user: contextUser } = useAuth()
  const [user, setUser] = useState<AdminUser | null>(contextUser ?? null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    adminMe()
      .then((res) => {
        if (!cancelled) setUser(res.user)
      })
      .catch(() => {
        if (!cancelled) setUser(contextUser ?? null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contextUser])

  const displayName = user?.fullName || user?.username || user?.email || "Admin"

  return (
    <>
      <PageMeta title="My Profile | Mind's AI Admin" description="Your admin account" />
      <PageBreadcrumb pageTitle="My Profile" />

      <div className="space-y-6">
        <AdminPageHeader
          title="My Profile"
          description="Your signed-in admin account. Contact a super admin to change role or permissions."
        />

        {loading ? (
          <div className="flex justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : user ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/80 to-indigo-50/50 px-6 py-8 dark:border-gray-800 dark:from-brand-950/30 dark:to-indigo-950/20">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-xl font-bold text-white shadow-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200 dark:bg-gray-900/80 dark:text-brand-300 dark:ring-brand-800">
                    <Shield className="h-3 w-3" />
                    {roleLabel(user)}
                  </span>
                </div>
              </div>
            </div>

            <dl className="grid gap-6 p-6 sm:grid-cols-2">
              {[
                { icon: Mail, label: "Email", value: user.email || "—" },
                { icon: UserIcon, label: "Username", value: user.username || "—" },
                { icon: Phone, label: "Phone", value: user.phone || "—" },
                {
                  icon: Calendar,
                  label: "Member since",
                  value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {Array.isArray(user.permissions) && user.permissions.length > 0 ? (
              <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {user.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {perm.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-gray-700">
            Not signed in.
          </div>
        )}
      </div>
    </>
  )
}
