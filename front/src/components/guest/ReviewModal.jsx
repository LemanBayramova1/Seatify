import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { getVenueReviews, submitReview } from "../../services/apiService";
import { useAuthStore } from "../../store/useAuthStore";
import { GlassCard } from "../shared/GlassCard";

export function ReviewModal({ venueId, restaurantName, onClose, onSubmitted }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null); // 'success' | 'failure'
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getVenueReviews(venueId)
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingReviews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating < 1) {
      setError(t("reviewModal.ratingRequired"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const saved = await submitReview(venueId, { rating, comment });
      setReviews((prev) => [saved, ...prev.filter((r) => r.userId !== saved.userId)]);
      setOutcome("success");
      onSubmitted?.();
      setTimeout(onClose, 1400);
    } catch {
      setOutcome("failure");
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="max-h-[90vh] overflow-y-auto"
      >
        <GlassCard className="w-[min(440px,92vw)] p-6">
          <div className="mb-5 flex items-start justify-between">
            <h2 className="text-lg font-bold text-slate-100">{t("reviewModal.title", { name: restaurantName })}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              ✕
            </button>
          </div>

          {outcome === "success" ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-status-free/20 text-3xl text-status-free">
                ✓
              </div>
              <p className="font-semibold text-slate-100">{t("reviewModal.success")}</p>
            </div>
          ) : !user ? (
            <div className="py-4 text-center">
              <p className="mb-4 text-sm text-slate-400">{t("reviewModal.signInPrompt")}</p>
              <button onClick={() => openAuthModal("login")} className="btn-primary w-full">
                {t("auth.loginCta")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">{t("reviewModal.yourRating")}</label>
                <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      className={`text-3xl transition ${star <= displayRating ? "text-amber-300" : "text-slate-600"}`}
                      aria-label={`${star} star`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {outcome === "failure" && <p className="mt-1 text-xs text-red-400">{t("reviewModal.failure")}</p>}
                {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
              </div>

              <div>
                <label className="label-text">{t("reviewModal.commentLabel")}</label>
                <textarea
                  className="glass-input w-full resize-none"
                  rows={3}
                  maxLength={1000}
                  placeholder={t("reviewModal.commentPlaceholder")}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? t("reviewModal.submitting") : t("reviewModal.submit")}
              </button>
            </form>
          )}

          {outcome !== "success" && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="label-text mb-2">{t("reviewModal.recentReviews")}</p>
              {loadingReviews ? (
                <p className="text-xs text-slate-500">{t("common.loading")}</p>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-slate-500">{t("reviewModal.noReviews")}</p>
              ) : (
                <ul className="max-h-40 space-y-3 overflow-y-auto pr-1">
                  {reviews.slice(0, 5).map((r) => (
                    <li key={r.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{r.userName}</span>
                        <span className="text-amber-300">{"★".repeat(r.rating)}</span>
                      </div>
                      {r.comment && <p className="mt-0.5 text-slate-400">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
