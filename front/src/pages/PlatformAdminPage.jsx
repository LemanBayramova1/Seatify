import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  approveReservation,
  deleteAdminUser,
  deleteAdminVenue,
  deleteReview,
  getAdminAnalytics,
  getAdminReservations,
  getAdminReviews,
  getAdminUsers,
  getAdminVenues,
  rejectReservation,
  toggleUserActive,
  toggleVenueActive,
  updateAdminUser,
} from "../services/apiService";
import { GlassCard } from "../components/shared/GlassCard";
import { DateField } from "../components/shared/DateField";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { EditUserModal } from "../components/admin/EditUserModal";
import { EditVenueModal } from "../components/admin/EditVenueModal";

const TABS = ["overview", "venues", "users", "reservations", "reviews"];
const STATUS_OPTIONS = ["Confirmed", "Held", "Cancelled", "Expired"];
const ROLE_OPTIONS = ["Customer", "RestaurantOwner", "Admin"];
const CHART_COLORS = { brand: "#5b7cfa", confirmed: "#22c55e", held: "#f5b23a", cancelled: "#ef4444", expired: "#64748b" };

const STATUS_STYLE = {
  Confirmed: "border-status-free/30 bg-status-free/10 text-status-free",
  Held: "border-status-held/30 bg-status-held/10 text-amber-300",
  Cancelled: "border-red-400/30 bg-red-500/10 text-red-300",
  Expired: "border-white/10 bg-white/[0.03] text-slate-400",
};

const TOOLTIP_STYLE = { background: "#0b0e16", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 };
const AXIS_TICK = { fill: "#94a3b8", fontSize: 11 };

/**
 * Platform Admin control panel.
 * Tabbed dashboard (overview/venues/users/reservations/reviews) that loads
 * platform-wide data per tab and lets an admin moderate venues, users,
 * reservations, and reviews across the whole platform.
 */
export default function PlatformAdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [venues, setVenues] = useState([]);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [reservationFilters, setReservationFilters] = useState({ date: "", status: "" });
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [reviews, setReviews] = useState(null);
  const [reviewVenueFilter, setReviewVenueFilter] = useState("");
  const [reviewRatingFilter, setReviewRatingFilter] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'user'|'venue', id, name }

  useEffect(() => {
    let cancelled = false;
    getAdminAnalytics()
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("platformAdmin.loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "venues") return;
    let cancelled = false;
    getAdminVenues()
      .then((data) => {
        if (!cancelled) setVenues(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("platformAdmin.loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "users") return;
    let cancelled = false;
    getAdminUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("platformAdmin.loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "reservations") return;
    let cancelled = false;
    getAdminReservations(reservationFilters)
      .then((data) => {
        if (!cancelled) setReservations(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("platformAdmin.loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [tab, reservationFilters]);

  useEffect(() => {
    if (tab !== "reviews") return;
    let cancelled = false;
    getAdminReviews()
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("platformAdmin.loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const filteredReviews = useMemo(() => {
    if (!reviews) return reviews;
    return reviews.filter((r) => {
      const matchesVenue = !reviewVenueFilter || r.venueName === reviewVenueFilter;
      const matchesRating = !reviewRatingFilter || r.rating === Number(reviewRatingFilter);
      return matchesVenue && matchesRating;
    });
  }, [reviews, reviewVenueFilter, reviewRatingFilter]);

  const reviewVenueOptions = useMemo(() => {
    if (!reviews) return [];
    return [...new Set(reviews.map((r) => r.venueName))].sort();
  }, [reviews]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !query ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query);
      const matchesRole = !userRoleFilter || u.role === userRoleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  /** Shows a transient success message that auto-clears after 3 seconds. */
  function flashMessage(message) {
    setActionMessage(message);
    setTimeout(() => setActionMessage(null), 3000);
  }

  /** Optimistically toggles a venue's active flag, rolling back on failure. */
  async function handleToggleActive(venueId, isActive) {
    setActionError(null);
    const previous = venues;
    setVenues((prev) => prev.map((v) => (v.id === venueId ? { ...v, isActive } : v)));
    try {
      await toggleVenueActive(venueId, isActive);
    } catch {
      setVenues(previous);
      setActionError(t("platformAdmin.actionFailed"));
    }
  }

  /** Persists edits from the user-edit modal and updates the user in local state. */
  async function handleSaveUser(form) {
    const updated = await updateAdminUser(editingUser.id, form);
    setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u)));
    setEditingUser(null);
    flashMessage(t("platformAdmin.userUpdated"));
  }

  /** Optimistically toggles a user's active flag, rolling back on failure. */
  async function handleToggleUserActive(userId, isActive) {
    setActionError(null);
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)));
    try {
      await toggleUserActive(userId, isActive);
    } catch (err) {
      setUsers(previous);
      setActionError(err.response?.data?.error ?? t("platformAdmin.actionFailed"));
    }
  }

  /** Applies edits from the venue-edit modal to local state after a successful save. */
  function handleSaveVenue(updated) {
    setVenues((prev) => prev.map((v) => (v.id === editingVenueId ? { ...v, name: updated.name, city: updated.city } : v)));
    setEditingVenueId(null);
    flashMessage(t("platformAdmin.venueUpdated"));
  }

  /**
   * Executes the pending deletion (`confirmDelete.type`: user/venue/review),
   * removes the deleted record from local state, and shows a flash message.
   */
  async function handleConfirmDelete() {
    setActionError(null);
    const { type, id, venueId } = confirmDelete;
    try {
      if (type === "user") {
        await deleteAdminUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        flashMessage(t("platformAdmin.userDeleted"));
      } else if (type === "review") {
        await deleteReview(venueId, id);
        setReviews((prev) => prev.filter((r) => r.id !== id));
        flashMessage(t("platformAdmin.reviewDeleted"));
      } else {
        await deleteAdminVenue(id);
        setVenues((prev) => prev.filter((v) => v.id !== id));
        flashMessage(t("platformAdmin.venueDeleted"));
      }
    } catch (err) {
      setActionError(err.response?.data?.error ?? t("platformAdmin.actionFailed"));
    } finally {
      setConfirmDelete(null);
    }
  }

  /** Approves a held reservation and reflects the new status in local state. */
  async function handleApprove(reservationId) {
    setActionError(null);
    try {
      await approveReservation(reservationId);
      setReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: "Confirmed" } : r)));
    } catch {
      setActionError(t("platformAdmin.actionFailed"));
    }
  }

  /** Rejects (cancels) a reservation and reflects the new status in local state. */
  async function handleReject(reservationId) {
    setActionError(null);
    try {
      await rejectReservation(reservationId);
      setReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: "Cancelled" } : r)));
    } catch {
      setActionError(t("platformAdmin.actionFailed"));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-[1200px] px-4 py-8"
    >
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-50">{t("platformAdmin.title")}</h1>
      <p className="mb-6 text-sm text-slate-400">{t("platformAdmin.subtitle")}</p>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{t(loadError)}</div>
      )}
      {actionError && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{actionError}</div>
      )}
      {actionMessage && (
        <div className="mb-4 rounded-xl border border-status-free/30 bg-status-free/10 px-4 py-2.5 text-sm text-status-free">
          {actionMessage}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === key ? "bg-brand-500 text-white shadow-glow" : "bg-white/[0.03] text-slate-400 hover:text-slate-200"
            }`}
          >
            {t(`platformAdmin.tab.${key}`)}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab t={t} analytics={analytics} />}
      {tab === "venues" && (
        <VenuesTab
          t={t}
          venues={venues}
          onToggleActive={handleToggleActive}
          onEdit={(v) => setEditingVenueId(v.id)}
          onDelete={(v) => setConfirmDelete({ type: "venue", id: v.id, name: v.name })}
        />
      )}
      {tab === "users" && (
        <UsersTab
          t={t}
          users={filteredUsers}
          search={userSearch}
          onSearchChange={setUserSearch}
          roleFilter={userRoleFilter}
          onRoleFilterChange={setUserRoleFilter}
          onToggleActive={handleToggleUserActive}
          onEdit={setEditingUser}
          onDelete={(u) => setConfirmDelete({ type: "user", id: u.id, name: u.name })}
        />
      )}
      {tab === "reservations" && (
        <ReservationsTab
          t={t}
          reservations={reservations}
          filters={reservationFilters}
          onFiltersChange={setReservationFilters}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
      {tab === "reviews" && (
        <ReviewsTab
          t={t}
          reviews={filteredReviews}
          venueFilter={reviewVenueFilter}
          onVenueFilterChange={setReviewVenueFilter}
          ratingFilter={reviewRatingFilter}
          onRatingFilterChange={setReviewRatingFilter}
          venueOptions={reviewVenueOptions}
          onDelete={(r) => setConfirmDelete({ type: "review", id: r.id, venueId: r.venueId, name: r.venueName })}
        />
      )}

      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
      {editingVenueId && (
        <EditVenueModal venueId={editingVenueId} onClose={() => setEditingVenueId(null)} onSaved={handleSaveVenue} />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t(
            confirmDelete.type === "user"
              ? "platformAdmin.deleteUserConfirmTitle"
              : confirmDelete.type === "review"
                ? "platformAdmin.deleteReviewConfirmTitle"
                : "platformAdmin.deleteVenueConfirmTitle",
          )}
          body={t(
            confirmDelete.type === "user"
              ? "platformAdmin.deleteUserConfirmBody"
              : confirmDelete.type === "review"
                ? "platformAdmin.deleteReviewConfirmBody"
                : "platformAdmin.deleteVenueConfirmBody",
            { name: confirmDelete.name, venue: confirmDelete.name },
          )}
          confirmLabel={t("common.delete")}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </motion.div>
  );
}

/** Overview tab: platform-wide metric tiles plus reservation/revenue/status charts. */
function OverviewTab({ t, analytics }) {
  const statusData = analytics
    ? [
        { key: "Confirmed", value: analytics.statusBreakdown.confirmed, color: CHART_COLORS.confirmed },
        { key: "Held", value: analytics.statusBreakdown.held, color: CHART_COLORS.held },
        { key: "Cancelled", value: analytics.statusBreakdown.cancelled, color: CHART_COLORS.cancelled },
        { key: "Expired", value: analytics.statusBreakdown.expired, color: CHART_COLORS.expired },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricTile label={t("platformAdmin.metricTotalUsers")} value={analytics?.registeredUsersCount ?? "–"} />
        <MetricTile label={t("platformAdmin.metricTotalVenues")} value={analytics?.totalVenuesCount ?? "–"} />
        <MetricTile label={t("platformAdmin.metricActiveBookings")} value={analytics?.activeBookingsCount ?? "–"} />
        <MetricTile
          label={t("platformAdmin.metricTotalDeposits")}
          value={analytics ? `${analytics.totalDepositsAzn} ${t("common.azn")}` : "–"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">{t("platformAdmin.chartReservationTrend")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.reservationTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#e2e8f0" }} />
                <Bar dataKey="count" name={t("platformAdmin.chartReservationTrend")} fill={CHART_COLORS.brand} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">{t("platformAdmin.chartRevenueTrend")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.revenueTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={AXIS_TICK} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#e2e8f0" }} />
                <Line type="monotone" dataKey="amount" name={t("common.azn")} stroke={CHART_COLORS.confirmed} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">{t("platformAdmin.chartStatusBreakdown")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="key" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} stroke="#0b0e16" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            {statusData.map((entry) => (
              <span key={entry.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {t(`admin.reservationStatus.${entry.key}`)} · {entry.value}
              </span>
            ))}
            {statusData.length === 0 && <span>{t("platformAdmin.noData")}</span>}
          </div>
        </GlassCard>
      </div>
    </>
  );
}

/** Venues tab: table of all venues with active-toggle, edit, and delete actions. */
function VenuesTab({ t, venues, onToggleActive, onEdit, onDelete }) {
  if (venues.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{t("common.loading")}</p>;
  }

  return (
    <GlassCard className="overflow-x-auto p-5">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colVenue")}</th>
            <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colOwner")}</th>
            <th className="pb-2 pr-4 font-medium">{t("admin.fieldCity")}</th>
            <th className="pb-2 pr-4 font-medium">{t("admin.metricTotalTables")}</th>
            <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colActive")}</th>
            <th className="pb-2 font-medium">{t("platformAdmin.colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {venues.map((v) => (
            <tr key={v.id} className="border-b border-white/5 text-slate-200 last:border-0">
              <td className="py-2.5 pr-4 font-semibold">{v.name}</td>
              <td className="py-2.5 pr-4 text-slate-400">{v.ownerName}</td>
              <td className="py-2.5 pr-4 text-slate-400">{v.city ?? "—"}</td>
              <td className="py-2.5 pr-4 text-slate-400">{v.tableCount}</td>
              <td className="py-2.5 pr-4">
                <button
                  type="button"
                  onClick={() => onToggleActive(v.id, !v.isActive)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                    v.isActive
                      ? "border-status-free/30 bg-status-free/10 text-status-free"
                      : "border-white/10 bg-white/[0.03] text-slate-400"
                  }`}
                >
                  {v.isActive ? t("platformAdmin.active") : t("platformAdmin.inactive")}
                </button>
              </td>
              <td className="py-2.5">
                <div className="flex gap-1.5">
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => onEdit(v)}>
                    {t("platformAdmin.edit")}
                  </button>
                  <button className="btn-danger px-3 py-1 text-xs" onClick={() => onDelete(v)}>
                    {t("platformAdmin.delete")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}

/** Users tab: searchable/filterable table of all users with edit/active-toggle/delete actions. */
function UsersTab({ t, users, search, onSearchChange, roleFilter, onRoleFilterChange, onToggleActive, onEdit, onDelete }) {
  return (
    <GlassCard className="overflow-x-auto p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="glass-input flex-1 min-w-[220px]"
          placeholder={t("platformAdmin.searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select className="glass-input" value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)}>
          <option value="">{t("platformAdmin.filterAnyRole")}</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {t(`platformAdmin.role.${role}`, role)}
            </option>
          ))}
        </select>
      </div>

      {users.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t("platformAdmin.noUsersMatch")}</p>
      ) : (
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-4 font-medium">{t("auth.name")}</th>
            <th className="pb-2 pr-4 font-medium">{t("auth.email")}</th>
            <th className="pb-2 pr-4 font-medium">{t("auth.phone")}</th>
            <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colRole")}</th>
            <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colActive")}</th>
            <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colJoined")}</th>
            <th className="pb-2 font-medium">{t("platformAdmin.colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-white/5 text-slate-200 last:border-0">
              <td className="py-2.5 pr-4 font-semibold">{u.name}</td>
              <td className="py-2.5 pr-4 text-slate-400">{u.email}</td>
              <td className="py-2.5 pr-4 text-slate-400">{u.phone ?? "—"}</td>
              <td className="py-2.5 pr-4 text-slate-400">{t(`platformAdmin.role.${u.role}`, u.role)}</td>
              <td className="py-2.5 pr-4">
                {u.role === "Admin" ? (
                  <span className="rounded-full border border-status-free/30 bg-status-free/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-status-free">
                    {t("platformAdmin.active")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleActive(u.id, !u.isActive)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                      u.isActive
                        ? "border-status-free/30 bg-status-free/10 text-status-free"
                        : "border-white/10 bg-white/[0.03] text-slate-400"
                    }`}
                  >
                    {u.isActive ? t("platformAdmin.active") : t("platformAdmin.inactive")}
                  </button>
                )}
              </td>
              <td className="py-2.5 pr-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="py-2.5">
                <div className="flex gap-1.5">
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => onEdit(u)}>
                    {t("platformAdmin.edit")}
                  </button>
                  {u.role !== "Admin" && (
                    <button className="btn-danger px-3 py-1 text-xs" onClick={() => onDelete(u)}>
                      {t("platformAdmin.delete")}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </GlassCard>
  );
}

/** Reservations tab: filterable table of platform-wide reservations with approve/reject actions. */
function ReservationsTab({ t, reservations, filters, onFiltersChange, onApprove, onReject }) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-200">{t("admin.reservationsTitle")}</h2>
        <div className="flex flex-wrap gap-2">
          <DateField value={filters.date} onChange={(date) => onFiltersChange((f) => ({ ...f, date }))} />
          <select className="glass-input" value={filters.status} onChange={(e) => onFiltersChange((f) => ({ ...f, status: e.target.value }))}>
            <option value="">{t("admin.filterAnyStatus")}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`admin.reservationStatus.${s}`)}
              </option>
            ))}
          </select>
          {(filters.date || filters.status) && (
            <button className="btn-ghost" onClick={() => onFiltersChange({ date: "", status: "" })}>
              {t("admin.clearFilters")}
            </button>
          )}
        </div>
      </div>

      {reservations.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t("admin.noReservations")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colVenue")}</th>
                <th className="pb-2 pr-4 font-medium">{t("admin.colTable")}</th>
                <th className="pb-2 pr-4 font-medium">{t("admin.colDate")}</th>
                <th className="pb-2 pr-4 font-medium">{t("admin.colTime")}</th>
                <th className="pb-2 pr-4 font-medium">{t("admin.colStatus")}</th>
                <th className="pb-2 font-medium">{t("platformAdmin.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-white/5 text-slate-200 last:border-0">
                  <td className="py-2.5 pr-4 text-slate-400">{r.venueName}</td>
                  <td className="py-2.5 pr-4 font-semibold">{r.tableLabel}</td>
                  <td className="py-2.5 pr-4 text-slate-400">{r.reservationDate}</td>
                  <td className="py-2.5 pr-4 text-slate-400">{r.timeSlot}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[r.status] ?? STATUS_STYLE.Expired}`}
                    >
                      {t(`admin.reservationStatus.${r.status}`, r.status)}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-1.5">
                      {r.status === "Held" && (
                        <button className="btn-primary px-3 py-1 text-xs" onClick={() => onApprove(r.id)}>
                          {t("platformAdmin.approve")}
                        </button>
                      )}
                      {(r.status === "Held" || r.status === "Confirmed") && (
                        <button className="btn-danger px-3 py-1 text-xs" onClick={() => onReject(r.id)}>
                          {t("platformAdmin.reject")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}

/** Reviews tab: filterable table of platform-wide reviews with a delete action. */
function ReviewsTab({ t, reviews, venueFilter, onVenueFilterChange, ratingFilter, onRatingFilterChange, venueOptions, onDelete }) {
  if (reviews === null) {
    return <p className="py-8 text-center text-sm text-slate-400">{t("common.loading")}</p>;
  }

  return (
    <GlassCard className="overflow-x-auto p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="glass-input" value={venueFilter} onChange={(e) => onVenueFilterChange(e.target.value)}>
          <option value="">{t("platformAdmin.filterAnyVenue")}</option>
          {venueOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select className="glass-input" value={ratingFilter} onChange={(e) => onRatingFilterChange(e.target.value)}>
          <option value="">{t("platformAdmin.filterAnyRating")}</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </select>
      </div>

      {reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t("platformAdmin.noReviewsMatch")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colVenue")}</th>
              <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colCustomer")}</th>
              <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colRating")}</th>
              <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colComment")}</th>
              <th className="pb-2 pr-4 font-medium">{t("admin.colDate")}</th>
              <th className="pb-2 pr-4 font-medium">{t("platformAdmin.colOwnerReply")}</th>
              <th className="pb-2 font-medium">{t("platformAdmin.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-b border-white/5 align-top text-slate-200 last:border-0">
                <td className="py-2.5 pr-4 font-semibold">{r.venueName}</td>
                <td className="py-2.5 pr-4 text-slate-400">{r.userName}</td>
                <td className="py-2.5 pr-4 text-amber-300">
                  {"★".repeat(r.rating)}
                  <span className="text-slate-600">{"★".repeat(5 - r.rating)}</span>
                </td>
                <td className="max-w-[240px] py-2.5 pr-4 text-slate-400">{r.comment ?? "—"}</td>
                <td className="py-2.5 pr-4 text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="max-w-[220px] py-2.5 pr-4 text-slate-400">{r.ownerReply ?? "—"}</td>
                <td className="py-2.5">
                  <button className="btn-danger px-3 py-1 text-xs" onClick={() => onDelete(r)}>
                    {t("platformAdmin.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </GlassCard>
  );
}

/** Small label/value stat card used in the platform admin overview tab. */
function MetricTile({ label, value }) {
  return (
    <GlassCard className="p-5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-extrabold text-slate-50">{value}</p>
    </GlassCard>
  );
}
