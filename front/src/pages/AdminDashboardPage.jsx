import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { getVenueDashboard, getVenueReservations, resolveMyVenueId } from "../services/apiService";
import { GlassCard } from "../components/shared/GlassCard";

const STATUS_OPTIONS = ["Confirmed", "Held", "Cancelled"];

const STATUS_STYLE = {
  Confirmed: "border-status-free/30 bg-status-free/10 text-status-free",
  Held: "border-status-held/30 bg-status-held/10 text-amber-300",
  Cancelled: "border-red-400/30 bg-red-500/10 text-red-300",
  Expired: "border-white/10 bg-white/[0.03] text-slate-400",
};

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [venueId, setVenueId] = useState(null);
  const [venueName, setVenueName] = useState(null);
  const [venueIsFallback, setVenueIsFallback] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [filters, setFilters] = useState({ date: "", status: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = await resolveMyVenueId();
        if (cancelled) return;
        setVenueId(resolved.venueId);
        setVenueName(resolved.venueName);
        setVenueIsFallback(resolved.isFallback);
        if (resolved.venueId) {
          setDashboard(await getVenueDashboard(resolved.venueId));
        }
      } catch {
        if (!cancelled) setLoadError("admin.loadFailed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    setReservationsLoading(true);
    getVenueReservations(venueId, filters)
      .then((data) => {
        if (!cancelled) setReservations(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("admin.loadFailed");
      })
      .finally(() => {
        if (!cancelled) setReservationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId, filters]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-[1200px] px-4 py-8"
    >
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-50">{t("admin.dashboardTitle")}</h1>
      <p className="mb-6 text-sm text-slate-400">{venueName ?? t("admin.dashboardSubtitle")}</p>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {t(loadError)}
        </div>
      )}
      {!loadError && venueIsFallback && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          {t("builder.fallbackVenueNotice")}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <NavLink to="/admin" end className={({ isActive }) => navTabClass(isActive)}>
          {t("admin.tabOverview")}
        </NavLink>
        <NavLink to="/builder" className={({ isActive }) => navTabClass(isActive)}>
          {t("admin.tabFloorPlan")}
        </NavLink>
        <NavLink to="/admin/reviews" className={({ isActive }) => navTabClass(isActive)}>
          {t("admin.tabReviews")}
        </NavLink>
        <NavLink to="/admin/settings" className={({ isActive }) => navTabClass(isActive)}>
          {t("admin.tabSettings")}
        </NavLink>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricTile label={t("admin.metricTodayReservations")} value={dashboard?.todayReservations ?? "–"} />
        <MetricTile label={t("admin.metricActiveHolds")} value={dashboard?.activeHolds ?? "–"} />
        <MetricTile label={t("admin.metricTotalTables")} value={dashboard?.totalTables ?? "–"} />
        <MetricTile
          label={t("admin.metricRevenue")}
          value={dashboard ? `${dashboard.totalDepositRevenue} ${t("common.azn")}` : "–"}
        />
      </div>

      <GlassCard className="p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-200">{t("admin.reservationsTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              className="glass-input"
              value={filters.date}
              onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            />
            <select
              className="glass-input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">{t("admin.filterAnyStatus")}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t(`admin.reservationStatus.${s}`)}
                </option>
              ))}
            </select>
            {(filters.date || filters.status) && (
              <button className="btn-ghost" onClick={() => setFilters({ date: "", status: "" })}>
                {t("admin.clearFilters")}
              </button>
            )}
          </div>
        </div>

        {reservationsLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("common.loading")}</p>
        ) : reservations.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("admin.noReservations")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">{t("admin.colTable")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("admin.colDate")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("admin.colTime")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("admin.colGuests")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("admin.colDeposit")}</th>
                  <th className="pb-2 font-medium">{t("admin.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 text-slate-200 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold">{r.tableLabel}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{r.reservationDate}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{r.timeSlot}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{r.partySize}</td>
                    <td className="py-2.5 pr-4 text-slate-400">
                      {r.depositFee} {t("common.azn")}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[r.status] ?? STATUS_STYLE.Expired}`}
                      >
                        {t(`admin.reservationStatus.${r.status}`, r.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

function navTabClass(isActive) {
  return `rounded-full px-4 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-brand-500 text-white shadow-glow" : "bg-white/[0.03] text-slate-400 hover:text-slate-200"
  }`;
}

function MetricTile({ label, value }) {
  return (
    <GlassCard className="p-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-extrabold text-slate-50">{value}</p>
    </GlassCard>
  );
}
