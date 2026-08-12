import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import UserManagement from "./pages/UserManagement";
import RestrictedUsers from "./pages/RestrictedUsers";
import UserDetail from "./pages/UserDetail";
import AdminStaffManagement from "./pages/AdminStaffManagement";
import ContentManagement from "./pages/ContentManagement";
import SupportManagement from "./pages/SupportManagement";
import FaqManagement from "./pages/FaqManagement";
import WebinarRegistrations from "./pages/WebinarRegistrations";
import PushNotifications from "./pages/PushNotifications";
import StoreManagement from "./pages/StoreManagement";
import KnowledgeBaseManagement from "./pages/KnowledgeBaseManagement";
import RewardsManagement from "./pages/RewardsManagement";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout — protected */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/" element={<Home />} />

            {/* AI & Analytics */}
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

            {/* Profile & Utility */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms, Tables, Charts */}
            <Route path="/form-elements" element={<FormElements />} />
            <Route path="/basic-tables" element={<BasicTables />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />

            {/* User & Rewards Management */}
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

            {/* Content Management */}
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

            {/* Webinar Management */}
            <Route
              path="/webinar"
              element={
                <ProtectedRoute permission="manage_webinar">
                  <WebinarRegistrations />
                </ProtectedRoute>
              }
            />

            {/* Support & Audit Trail */}
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

          {/* Auth — guest only */}
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
              <GuestRoute>
                <SignUp />
              </GuestRoute>
            }
          />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
