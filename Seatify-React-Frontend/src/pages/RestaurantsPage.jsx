import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { getVenues } from "../services/apiService";
import { RestaurantCard } from "../components/restaurants/RestaurantCard";
import { RestaurantFilters } from "../components/restaurants/RestaurantFilters";

export default function RestaurantsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ search: "", cuisine: searchParams.get("cuisine") ?? "", zone: "", minRating: 0 });
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getVenues().then((data) => {
      if (!cancelled) {
        setRestaurants(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cuisines = useMemo(() => Array.from(new Set(restaurants.flatMap((r) => r.cuisines))).sort(), [restaurants]);
  const zones = useMemo(() => Array.from(new Set(restaurants.flatMap((r) => r.zonesOffered))).sort(), [restaurants]);

  const filtered = restaurants.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(filters.search.trim().toLowerCase());
    const matchesCuisine = !filters.cuisine || r.cuisines.includes(filters.cuisine);
    const matchesZone = !filters.zone || r.zonesOffered.includes(filters.zone);
    const matchesRating = r.rating >= filters.minRating;
    return matchesSearch && matchesCuisine && matchesZone && matchesRating;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-[1200px] px-4 py-8"
    >
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">{t("restaurants.heroTitle")}</h1>
        <p className="text-sm text-slate-400">{t("restaurants.heroSubtitle")}</p>
      </div>

      <div className="mb-6">
        <RestaurantFilters filters={filters} onChange={setFilters} cuisines={cuisines} zones={zones} />
      </div>

      {loading ? (
        <p className="text-center text-sm text-slate-400">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-400">{t("restaurants.noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
