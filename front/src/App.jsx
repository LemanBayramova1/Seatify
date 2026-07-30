import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Header } from "./components/layout/Header";
import { AuthModal } from "./components/auth/AuthModal";
import { OtpVerificationModal } from "./components/auth/OtpVerificationModal";
import { RequireRole } from "./components/auth/RequireRole";
import { Toast } from "./components/shared/Toast";
import { ChatbotWidget } from "./components/chatbot/ChatbotWidget";
import { ROLES, useAuthStore } from "./store/useAuthStore";
import AdminBuilderPage from "./pages/AdminBuilderPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminReviewsPage from "./pages/AdminReviewsPage";
import VenueSettingsPage from "./pages/VenueSettingsPage";
import PlatformAdminPage from "./pages/PlatformAdminPage";
import CustomerBookingPage from "./pages/CustomerBookingPage";
import LandingPage from "./pages/LandingPage";
import RestaurantsPage from "./pages/RestaurantsPage";
import MyBookingsPage from "./pages/MyBookingsPage";

export default function App() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isRestaurantOwner = user?.role === ROLES.RESTAURANT_OWNER;
  const isAdmin = user?.role === ROLES.ADMIN;
  const homePath = isRestaurantOwner ? "/admin" : isAdmin ? "/platform-admin" : "/restaurants";

  return (
    <div className="min-h-full">
      <Header />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={user ? <Navigate to={homePath} replace /> : <LandingPage />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/restaurants/:venueId" element={<CustomerBookingPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route
            path="/admin"
            element={
              <RequireRole role={ROLES.RESTAURANT_OWNER}>
                <AdminDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireRole role={ROLES.RESTAURANT_OWNER}>
                <VenueSettingsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <RequireRole role={ROLES.RESTAURANT_OWNER}>
                <AdminReviewsPage />
              </RequireRole>
            }
          />
          <Route
            path="/builder"
            element={
              <RequireRole role={ROLES.RESTAURANT_OWNER}>
                <AdminBuilderPage />
              </RequireRole>
            }
          />
          <Route
            path="/platform-admin"
            element={
              <RequireRole role={ROLES.ADMIN}>
                <PlatformAdminPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
      </AnimatePresence>

      <AuthModal />
      <OtpVerificationModal />
      <Toast />
      <ChatbotWidget />
    </div>
  );
}
