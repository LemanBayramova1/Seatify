import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../shared/GlassCard";

const VISIBLE_CUISINES = 3;

export function RestaurantCard({ restaurant }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cuisines = restaurant.cuisines ?? [];
  const extraCuisines = cuisines.length - VISIBLE_CUISINES;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25 }}
      className="group cursor-pointer"
      onClick={() => navigate(`/restaurants/${restaurant.id}`)}
    >
      <GlassCard className="overflow-hidden transition-shadow hover:shadow-glow">
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={restaurant.cover}
            alt={restaurant.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/10 to-transparent" />

          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur">
            {restaurant.reviewCount ? (
              <>
                ★ {restaurant.rating?.toFixed(1) ?? "0.0"} <span className="text-slate-400">({restaurant.reviewCount})</span>
              </>
            ) : (
              <span className="text-brand-300">{t("restaurants.newBadge")}</span>
            )}
          </span>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">{restaurant.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-300">
              <span aria-hidden>📍</span> {restaurant.address}
            </p>
          </div>
        </div>

        <div className="p-4">
          {cuisines.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {cuisines.slice(0, VISIBLE_CUISINES).map((cuisine) => (
                <span key={cuisine} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                  {cuisine}
                </span>
              ))}
              {extraCuisines > 0 && (
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  +{extraCuisines}
                </span>
              )}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/restaurants/${restaurant.id}`);
            }}
            className="btn-primary w-full"
          >
            {t("restaurants.viewFloorPlan")} <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
