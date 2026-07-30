import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { getVenueReviews, resolveMyVenueId } from "../services/apiService";
import { GlassCard } from "../components/shared/GlassCard";

function navTabClass(isActive) {
  return `rounded-full px-4 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-brand-500 text-white shadow-glow" : "bg-white/[0.03] text-slate-400 hover:text-slate-200"
  }`;
}

export default function AdminReviewsPage() {
  const { t } = useTranslation();
  const [venueId, setVenueId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { venueId: id } = await resolveMyVenueId();
        if (cancelled) return;
        if (!id) {
          setIsLoading(false);
          return;
        }
        setVenueId(id);
        const data = await getVenueReviews(id);
        if (!cancelled) setReviews(data);
      } catch {
        if (!cancelled) setLoadError("admin.loadFailed");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reviewCount = reviews.length;
  const average = reviewCount ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-[900px] px-4 py-8"
    >
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-50">{t("admin.reviewsTitle")}</h1>
      <p className="mb-6 text-sm text-slate-400">
        {reviewCount > 0
          ? `${t("admin.reviewsAvgLabel")}: ${average.toFixed(1)} ★ (${reviewCount} ${t("admin.reviewsCountLabel")})`
          : t("admin.dashboardSubtitle")}
      </p>

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

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-400">{t("common.loading")}</p>
      ) : loadError ? (
        <GlassCard className="p-8 text-center text-sm text-red-300">{t(loadError)}</GlassCard>
      ) : !venueId || reviews.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-slate-400">{t("admin.noReviewsYet")}</GlassCard>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <GlassCard key={r.id} className="p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-200">{r.userName}</span>
                <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mb-1.5 text-amber-300">{"★".repeat(r.rating)}<span className="text-slate-600">{"★".repeat(5 - r.rating)}</span></div>
              {r.comment && <p className="text-sm text-slate-400">{r.comment}</p>}
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
