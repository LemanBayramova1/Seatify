import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVenueReviews } from "../../services/apiService";
import { GlassCard } from "../shared/GlassCard";

/** Persistent, publicly-visible reviews section for a venue's booking page — unlike
 * ReviewModal's write-first modal (capped at 5 recent reviews, no owner replies shown), this
 * renders every review with its owner reply, if any. */
export function VenueReviews({ venueId, refreshKey }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getVenueReviews(venueId)
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId, refreshKey]);

  if (isLoading) {
    return null;
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto mt-10 max-w-5xl">
      <h2 className="mb-4 text-lg font-bold text-slate-100">
        {t("reviewModal.recentReviews")} ({reviews.length})
      </h2>
      <div className="space-y-3">
        {reviews.map((r) => (
          <GlassCard key={r.id} className="p-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-200">{r.userName}</span>
              <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mb-1.5 text-amber-300">
              {"★".repeat(r.rating)}
              <span className="text-slate-600">{"★".repeat(5 - r.rating)}</span>
            </div>
            {r.comment && <p className="text-sm text-slate-400">{r.comment}</p>}

            {r.ownerReply && (
              <div className="mt-3 rounded-xl border border-brand-400/20 bg-brand-500/[0.06] p-3">
                <p className="mb-1 text-xs font-semibold text-brand-400">{t("reviewModal.ownerReplyBadge")}</p>
                <p className="text-sm text-slate-300">{r.ownerReply}</p>
                {r.ownerReplyDate && (
                  <p className="mt-1 text-[11px] text-slate-500">{new Date(r.ownerReplyDate).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
