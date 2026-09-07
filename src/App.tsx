import { Routes, Route, Navigate } from "react-router"
import SignIn from "./pages/AuthPages/SignIn"
import SignUp from "./pages/AuthPages/SignUp"
import NotFound from "./pages/OtherPage/NotFound"
import UserProfiles from "./pages/UserProfiles"
import AppLayout from "./layout/AppLayout"
import { ScrollToTop } from "./components/common/ScrollToTop"
import Home from "./pages/Dashboard/Home"
import ProtectedRoute from "./components/auth/ProtectedRoute"
import GuestRoute from "./components/auth/GuestRoute"
import UserManagement from "./pages/UserManagement"
import RestrictedUsers from "./pages/RestrictedUsers"
import UserDetail from "./pages/UserDetail"
import AdminStaffManagement from "./pages/AdminStaffManagement"
import ContentManagement from "./pages/ContentManagement"
import SupportManagement from "./pages/SupportManagement"
import FaqManagement from "./pages/FaqManagement"
import WebinarRegistrations from "./pages/WebinarRegistrations"
import PushNotifications from "./pages/PushNotifications"
import StoreManagement from "./pages/StoreManagement"
import KnowledgeBaseManagement from "./pages/KnowledgeBaseManagement"
import RewardsManagement from "./pages/RewardsManagement"
import AnalyticsDashboard from "./pages/AnalyticsDashboard"
import AuditLogs from "./pages/AuditLogs"
import { ADMIN_SIGNUP_ENABLED } from "./lib/api"

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />

          <Route
            path="/ai/knowledge-base"
            element={
              <ProtectedRoute permission="manage_content">
                <KnowledgeBaseManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/emotional"
            element={
              <ProtectedRoute permission="manage_users">
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/profile" element={<UserProfiles />} />

          <Route
            path="/users"
            element={
              <ProtectedRoute permission="manage_users">
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/restricted"
            element={
              <ProtectedRoute permission="manage_users">
                <RestrictedUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/rewards"
            element={
              <ProtectedRoute permission="manage_users">
                <RewardsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute permission="manage_users">
                <UserDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-users"
            element={
              <ProtectedRoute permission="manage_admins">
                <AdminStaffManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/content"
            element={
              <ProtectedRoute permission="manage_content">
                <ContentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/store-management"
            element={
              <ProtectedRoute permission="manage_content">
                <StoreManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/push-notifications"
            element={
              <ProtectedRoute permission="manage_content">
                <PushNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faq"
            element={
              <ProtectedRoute permission="manage_content">
                <FaqManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/webinar"
            element={
              <ProtectedRoute permission="manage_webinar">
                <WebinarRegistrations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/support"
            element={
              <ProtectedRoute permission="manage_support">
                <SupportManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system/logs"
            element={
              <ProtectedRoute permission="manage_admins">
                <AuditLogs />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="/signin"
          element={
            <GuestRoute>
              <SignIn />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            ADMIN_SIGNUP_ENABLED ? (
              <GuestRoute>
                <SignUp />
              </GuestRoute>
            ) : (
              <Navigate to="/signin" replace />
            )
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
