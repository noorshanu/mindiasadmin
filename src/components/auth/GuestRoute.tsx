import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { token, loading, checked } = useAuth();

  if (!checked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
