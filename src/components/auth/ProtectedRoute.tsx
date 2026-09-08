import { Navigate, useLocation, Link } from "react-router";
import { useAuth } from "../../context/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
  permission?: string;
};

export default function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { token, user, loading, checked } = useAuth();
  const location = useLocation();

  if (!checked || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white dark:bg-gray-900">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading admin session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (permission && user) {
    const isSuper = !user.adminRole || user.adminRole === "super_admin";
    if (!isSuper) {
      const userPerms = Array.isArray(user.permissions) ? [...user.permissions] : [];
      if (user.adminRole === "content_manager" && !userPerms.includes("manage_content")) {
        userPerms.push("manage_content");
      }
      if (user.adminRole === "user_manager" && !userPerms.includes("manage_users")) {
        userPerms.push("manage_users");
      }
      if (user.adminRole === "webinar_manager" && !userPerms.includes("manage_webinar")) {
        userPerms.push("manage_webinar");
      }
      if (user.adminRole === "support_manager" && !userPerms.includes("manage_support")) {
        userPerms.push("manage_support");
      }
      if (user.canAddUsers && !userPerms.includes("manage_admins")) {
        userPerms.push("manage_admins");
      }

      if (!userPerms.includes(permission)) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
              🚫
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6 text-sm">
              Your admin account role does not have permission to view or manage this section.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition"
            >
              Back to Dashboard
            </Link>
          </div>
        );
      }
    }
  }

  return <>{children}</>;
}
