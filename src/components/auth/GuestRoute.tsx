import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { token, loading, checked } = useAuth();

  if (!checked || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white dark:bg-gray-900">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
