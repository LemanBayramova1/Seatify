import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { deleteReview, deleteReviewReply, getVenueReviews, replyToReview, resolveMyVenueId } from "../services/apiService";
import { GlassCard } from "../components/shared/GlassCard";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";

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

  const [replyingId, setReplyingId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyBusyId, setReplyBusyId] = useState(null);
  const [replyError, setReplyError] = useState(null);
  const [confirmDeleteReview, setConfirmDeleteReview] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

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

  function startReply(review) {
    setReplyError(null);
    setReplyingId(review.id);
    setReplyDraft(review.ownerReply ?? "");
  }

  function cancelReply() {
    setReplyingId(null);
    setReplyDraft("");
  }

  async function submitReply(review) {
    const reply = replyDraft.trim();
    if (!reply) return;
    setReplyBusyId(review.id);
    setReplyError(null);
    try {
      const updated = await replyToReview(venueId, review.id, reply);
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ...updated } : r)));
      setReplyingId(null);
      setReplyDraft("");
    } catch {
      setReplyError("admin.replyFailed");
    } finally {
      setReplyBusyId(null);
    }
  }

  async function deleteReply(review) {
    setReplyBusyId(review.id);
    setReplyError(null);
    try {
      const updated = await deleteReviewReply(venueId, review.id);
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ...updated } : r)));
    } catch {
      setReplyError("admin.replyFailed");
    } finally {
      setReplyBusyId(null);
    }
  }

  async function confirmDelete() {
    const review = confirmDeleteReview;
    setConfirmDeleteReview(null);
    setDeleteError(null);
    try {
      await deleteReview(venueId, review.id);
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
    } catch {
      setDeleteError("admin.deleteReviewFailed");
    }
  }

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

      {deleteError && <p className="mb-4 text-sm text-red-400">{t(deleteError)}</p>}

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

              {r.ownerReply && replyingId !== r.id && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="mb-1 text-xs font-semibold text-brand-400">{t("admin.ownerReplyLabel")}</p>
                  <p className="text-sm text-slate-300">{r.ownerReply}</p>
                  {r.ownerReplyDate && (
                    <p className="mt-1 text-[11px] text-slate-500">{new Date(r.ownerReplyDate).toLocaleDateString()}</p>
                  )}
                </div>
              )}

              {replyingId === r.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder={t("admin.replyPlaceholder")}
                    className="input-field w-full resize-none"
                  />
                  {replyError && <p className="text-xs text-red-400">{t(replyError)}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitReply(r)}
                      disabled={replyBusyId === r.id || !replyDraft.trim()}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {replyBusyId === r.id ? t("admin.replySubmitting") : t("admin.saveReply")}
                    </button>
                    <button onClick={cancelReply} className="btn-ghost text-sm">
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => startReply(r)} className="text-xs font-semibold text-brand-400 hover:text-brand-300">
                    {r.ownerReply ? t("admin.editReply") : t("admin.replyButton")}
                  </button>
                  {r.ownerReply && (
                    <button
                      onClick={() => deleteReply(r)}
                      disabled={replyBusyId === r.id}
                      className="text-xs font-semibold text-slate-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {t("admin.deleteReply")}
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteReview(r)}
                    className="ml-auto text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    {t("admin.deleteReviewButton")}
                  </button>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {confirmDeleteReview && (
        <ConfirmDialog
          title={t("admin.deleteReviewConfirmTitle")}
          body={t("admin.deleteReviewConfirmBody")}
          confirmLabel={t("common.delete")}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteReview(null)}
        />
      )}
    </motion.div>
  );
}
