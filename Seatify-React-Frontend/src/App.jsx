import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Header } from "./components/layout/Header";
import { AuthModal } from "./components/auth/AuthModal";
import { RequireRole } from "./components/auth/RequireRole";
import { ROLES, useAuthStore } from "./store/useAuthStore";
import AdminBuilderPage from "./pages/AdminBuilderPage";
import CustomerBookingPage from "./pages/CustomerBookingPage";
import RestaurantsPage from "./pages/RestaurantsPage";
import MyBookingsPage from "./pages/MyBookingsPage";

export default function App() {
  const location = useLocation();
  const isRestaurantOwner = useAuthStore((s) => s.user?.role === ROLES.RESTAURANT_OWNER);
  const homePath = isRestaurantOwner ? "/builder" : "/restaurants";

  return (
    <div className="min-h-full">
      <Header />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to={homePath} replace />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/restaurants/:venueId" element={<CustomerBookingPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route
            path="/builder"
            element={
              <RequireRole role={ROLES.RESTAURANT_OWNER}>
                <AdminBuilderPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
      </AnimatePresence>

      <AuthModal />
    </div>
  );
}
