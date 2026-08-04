import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getVenues } from "../services/apiService";
import { todayIso } from "../lib/timeSlots";
import { DateField } from "../components/shared/DateField";
import { GlassCard } from "../components/shared/GlassCard";
import { RestaurantCard } from "../components/restaurants/RestaurantCard";
import { ROLES, useAuthStore } from "../store/useAuthStore";

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const [restaurants, setRestaurants] = useState([]);
  const [cuisine, setCuisine] = useState("");
  const [date, setDate] = useState(todayIso());

  useEffect(() => {
    let cancelled = false;
    getVenues().then((data) => {
      if (!cancelled) setRestaurants(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cuisines = useMemo(() => Array.from(new Set(restaurants.flatMap((r) => r.cuisines))).sort(), [restaurants]);

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (cuisine) params.set("cuisine", cuisine);
    navigate(params.toString() ? `/restaurants?${params}` : "/restaurants");
  }

  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-500/10 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl">{t("landing.heroTitle")}</h1>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">{t("landing.heroSubtitle")}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => navigate("/restaurants")} className="btn-primary">
              {t("landing.heroCtaBook")}
            </button>
            <button onClick={() => openAuthModal("register", ROLES.RESTAURANT_OWNER)} className="btn-ghost">
              {t("landing.heroCtaOwner")}
            </button>
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <GlassCard className="mx-auto mt-10 flex max-w-3xl flex-wrap items-end gap-4 p-5">
            <div className="min-w-[140px] flex-1">
              <label className="label-text">{t("landing.searchLocation")}</label>
              <select className="glass-input w-full" value="Bakı" disabled>
                <option>Bakı</option>
              </select>
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="label-text">{t("landing.searchCuisine")}</label>
              <select className="glass-input w-full" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                <option value="">{t("landing.searchAnyCuisine")}</option>
                {cuisines.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="label-text">{t("landing.searchDate")}</label>
              <DateField min={todayIso()} className="w-full" value={date} onChange={setDate} />
            </div>
            <button type="submit" className="btn-primary">
              {t("landing.searchCta")}
            </button>
          </GlassCard>
        </motion.form>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-extrabold text-slate-50">{t("landing.featuresTitle")}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <FeatureCard icon="🗺️" title={t("landing.feature1Title")} body={t("landing.feature1Body")} />
          <FeatureCard icon="⚡" title={t("landing.feature2Title")} body={t("landing.feature2Body")} />
          <FeatureCard icon="🌿" title={t("landing.feature3Title")} body={t("landing.feature3Body")} />
        </div>
      </section>

      {restaurants.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-extrabold text-slate-50">{t("landing.galleryTitle")}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.slice(0, 6).map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-extrabold text-slate-50">{t("landing.howItWorksTitle")}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StepCard n={1} title={t("landing.step1Title")} body={t("landing.step1Body")} />
          <StepCard n={2} title={t("landing.step2Title")} body={t("landing.step2Body")} />
          <StepCard n={3} title={t("landing.step3Title")} body={t("landing.step3Body")} />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 text-center">
        <GlassCard className="p-10">
          <h2 className="mb-5 text-xl font-bold text-slate-50">{t("landing.bottomCtaTitle")}</h2>
          <button onClick={() => navigate("/restaurants")} className="btn-primary">
            {t("landing.bottomCtaButton")}
          </button>
        </GlassCard>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, body }) {
  return (
    <GlassCard className="p-6 text-center">
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="mb-1.5 text-sm font-bold text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400">{body}</p>
    </GlassCard>
  );
}

function StepCard({ n, title, body }) {
  return (
    <GlassCard className="p-6">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-glow">{n}</div>
      <h3 className="mb-1.5 text-sm font-bold text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400">{body}</p>
    </GlassCard>
  );
}
