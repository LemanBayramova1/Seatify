import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { subscribeToNotifications } from "../../services/notificationHub";
import { useNotificationsStore } from "../../store/useNotificationsStore";

const POLL_INTERVAL_MS = 30_000;

const TYPE_ICON = {
  NewVenue: "🏠",
  TableAvailable: "🪑",
  NewReview: "⭐",
  NewBooking: "📅",
};

export function NotificationBell() {
  const { t } = useTranslation();
  const notifications = useNotificationsStore((s) => s.notifications);
  const isLoading = useNotificationsStore((s) => s.isLoading);
  const isOpen = useNotificationsStore((s) => s.isOpen);
  const toggleOpen = useNotificationsStore((s) => s.toggleOpen);
  const close = useNotificationsStore((s) => s.close);
  const fetchNotifications = useNotificationsStore((s) => s.fetch);
  const markRead = useNotificationsStore((s) => s.markRead);
  const receive = useNotificationsStore((s) => s.receive);
  const ref = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Live push on top of the poll above — a new review/booking notification appears (and bumps
  // the unread badge) the instant NotificationHub broadcasts it, no refresh needed.
  useEffect(() => {
    return subscribeToNotifications(receive);
  }, [receive]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleOpen}
        aria-label={t("notifications.title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg text-slate-300 transition hover:bg-white/[0.06] hover:text-slate-100"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="glass-panel absolute right-0 top-11 z-50 max-h-[420px] w-80 overflow-y-auto rounded-2xl p-2"
          >
            <div className="border-b border-white/10 px-3 py-2">
              <p className="text-sm font-semibold text-slate-100">{t("notifications.title")}</p>
            </div>

            {isLoading && notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">{t("notifications.loading")}</p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">{t("notifications.empty")}</p>
            ) : (
              <ul className="py-1">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex gap-2.5 rounded-lg px-3 py-2.5 transition ${
                      n.isRead ? "opacity-60" : "bg-white/[0.03]"
                    }`}
                  >
                    <span className="text-base leading-none">{TYPE_ICON[n.type] ?? "🔔"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-100">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{n.message}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
                        {!n.isRead && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-[11px] font-semibold text-brand-400 hover:text-brand-300"
                          >
                            {t("notifications.markRead")}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
