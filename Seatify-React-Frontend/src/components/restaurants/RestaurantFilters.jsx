import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GlassCard } from "../shared/GlassCard";

const RATING_OPTIONS = [0, 4.5, 4.7, 4.9];

export function RestaurantFilters({ filters, onChange, cuisines, zones }) {
  const { t } = useTranslation();

  function toggle(key, value) {
    onChange({ ...filters, [key]: filters[key] === value ? "" : value });
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <GlassCard className="space-y-4 p-5">
        <input
          className="glass-input w-full"
          placeholder={t("restaurants.searchPlaceholder")}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />

        <div>
          <p className="label-text">{t("restaurants.filterCuisine")}</p>
          <div className="flex flex-wrap gap-1.5">
            {cuisines.map((cuisine) => (
              <Chip key={cuisine} active={filters.cuisine === cuisine} onClick={() => toggle("cuisine", cuisine)}>
                {cuisine}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="label-text">{t("restaurants.filterZone")}</p>
            <div className="flex flex-wrap gap-1.5">
              {zones.map((zone) => (
                <Chip key={zone} active={filters.zone === zone} onClick={() => toggle("zone", zone)}>
                  {t(`builder.zones.${zone}`)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="label-text">{t("restaurants.filterRating")}</p>
            <select
              className="glass-input"
              value={filters.minRating}
              onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
            >
              {RATING_OPTIONS.map((rating) => (
                <option key={rating} value={rating}>
                  {rating === 0 ? t("restaurants.anyRating") : `${rating}+ ★`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-brand-400/40 bg-brand-500 text-white shadow-glow"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-brand-400/40 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}
