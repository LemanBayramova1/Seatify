import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../shared/GlassCard";

export function RestaurantCard({ restaurant }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
      <GlassCard className="overflow-hidden">
        <div className="relative h-44 w-full overflow-hidden">
          <img src={restaurant.cover} alt={restaurant.name} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-transparent" />
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur">
            {restaurant.reviewCount ? (
              <>
                ★ {restaurant.rating.toFixed(1)} <span className="text-slate-400">({restaurant.reviewCount})</span>
              </>
            ) : (
              <span className="text-brand-300">{t("restaurants.newBadge")}</span>
            )}
          </span>
        </div>

        <div className="p-5">
          <h3 className="mb-1 text-lg font-bold text-slate-100">{restaurant.name}</h3>
          <p className="mb-3 text-xs text-slate-400">{restaurant.address}</p>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {restaurant.cuisines.map((cuisine) => (
              <span key={cuisine} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                {cuisine}
              </span>
            ))}
          </div>

          <button onClick={() => navigate(`/restaurants/${restaurant.id}`)} className="btn-primary w-full">
            {t("restaurants.viewFloorPlan")}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
