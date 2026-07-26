import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/useAuthStore";
import { useBookingsStore } from "../store/useBookingsStore";
import { BookingCard } from "../components/bookings/BookingCard";
import { GlassCard } from "../components/shared/GlassCard";

export default function MyBookingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const { bookings, isLoading, hasLoaded, load, cancel } = useBookingsStore();

  useEffect(() => {
    if (user && !hasLoaded) load();
  }, [user, hasLoaded, load]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-5xl px-4 py-8"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-50">{t("myBookings.title")}</h1>
        <p className="text-sm text-slate-400">{t("myBookings.subtitle")}</p>
      </div>

      {!user ? (
        <GlassCard className="mx-auto max-w-md p-8 text-center">
          <p className="mb-4 text-sm text-slate-400">{t("myBookings.signInPrompt")}</p>
          <button onClick={() => openAuthModal("login")} className="btn-primary">
            {t("header.signIn")}
          </button>
        </GlassCard>
      ) : isLoading ? (
        <p className="text-center text-sm text-slate-400">{t("common.loading")}</p>
      ) : bookings.length === 0 ? (
        <GlassCard className="mx-auto max-w-md p-8 text-center">
          <p className="text-sm text-slate-400">{t("myBookings.empty")}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onCancel={cancel} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
