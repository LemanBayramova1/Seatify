import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GlassCard } from "../shared/GlassCard";

const STATUS_STYLE = {
  CONFIRMED: "border-status-free/30 bg-status-free/10 text-status-free",
  PENDING: "border-status-held/30 bg-status-held/10 text-amber-300",
};

export function BookingCard({ booking, onCancel }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleConfirmCancel() {
    setIsCancelling(true);
    await onCancel(booking.id);
    setIsCancelling(false);
    setConfirming(false);
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }}>
        <GlassCard className="p-5">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">{booking.restaurantName}</h3>
              <p className="text-xs text-slate-400">
                {t("myBookings.table")} {booking.tableLabel} · {t(`builder.zones.${booking.zone}`)}
              </p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[booking.status] ?? STATUS_STYLE.CONFIRMED}`}>
              {t(`myBookings.status.${booking.status}`)}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <Stat label={t("myBookings.date")} value={booking.date} />
            <Stat label={t("myBookings.time")} value={booking.timeSlot} />
            <Stat label={t("myBookings.guests")} value={booking.guests} />
          </div>

          {booking.specialRequests && (
            <p className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
              “{booking.specialRequests}”
            </p>
          )}

          <button onClick={() => setConfirming(true)} className="btn-danger w-full">
            {t("myBookings.cancel")}
          </button>
        </GlassCard>
      </motion.div>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}>
              <GlassCard className="w-96 p-6">
                <h3 className="mb-2 text-base font-semibold text-slate-100">{t("myBookings.cancelConfirmTitle")}</h3>
                <p className="mb-6 text-sm text-slate-400">{t("myBookings.cancelConfirmBody", { restaurant: booking.restaurantName })}</p>
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => setConfirming(false)} disabled={isCancelling}>
                    {t("common.back")}
                  </button>
                  <button className="btn-danger" onClick={handleConfirmCancel} disabled={isCancelling}>
                    {isCancelling ? t("common.loading") : t("myBookings.cancel")}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
