import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { getVenueDetails, resolveMyVenueId, updateVenue } from "../services/apiService";
import { GlassCard } from "../components/shared/GlassCard";

function navTabClass(isActive) {
  return `rounded-full px-4 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-brand-500 text-white shadow-glow" : "bg-white/[0.03] text-slate-400 hover:text-slate-200"
  }`;
}

export default function VenueSettingsPage() {
  const { t } = useTranslation();
  const [venueId, setVenueId] = useState(null);
  const [form, setForm] = useState(null);
  const [cuisineInput, setCuisineInput] = useState("");
  const [galleryInput, setGalleryInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { venueId: id } = await resolveMyVenueId();
        if (!id) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        const details = await getVenueDetails(id);
        if (cancelled) return;
        setVenueId(id);
        setForm({
          name: details.name ?? "",
          address: details.address ?? "",
          city: details.city ?? "",
          businessEmail: details.businessEmail ?? "",
          businessPhone: details.businessPhone ?? "",
          description: details.description ?? "",
          imageUrl: details.imageUrl ?? "",
          operatingHours: details.operatingHours ?? "",
          cuisineTypes: details.cuisineTypes ?? [],
          galleryImageUrls: details.galleryImageUrls ?? [],
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function addCuisine() {
    const value = cuisineInput.trim();
    if (!value || form.cuisineTypes.includes(value)) return;
    update({ cuisineTypes: [...form.cuisineTypes, value] });
    setCuisineInput("");
  }

  function removeCuisine(value) {
    update({ cuisineTypes: form.cuisineTypes.filter((c) => c !== value) });
  }

  function addGalleryUrl() {
    const value = galleryInput.trim();
    if (!value || form.galleryImageUrls.includes(value)) return;
    update({ galleryImageUrls: [...form.galleryImageUrls, value] });
    setGalleryInput("");
  }

  function removeGalleryUrl(value) {
    update({ galleryImageUrls: form.galleryImageUrls.filter((u) => u !== value) });
  }

  async function handleSave(e) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateVenue(venueId, form);
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(err.response?.data?.error ?? t("admin.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-[800px] px-4 py-8"
    >
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-50">{t("admin.settingsTitle")}</h1>
      <p className="mb-6 text-sm text-slate-400">{t("admin.settingsSubtitle")}</p>

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
        <p className="text-sm text-slate-400">{t("common.loading")}</p>
      ) : !form ? (
        <GlassCard className="p-8 text-center text-sm text-slate-400">{t("admin.loadFailed")}</GlassCard>
      ) : (
        <GlassCard as="form" onSubmit={handleSave} className="space-y-5 p-6">
          <Field label={t("admin.fieldName")}>
            <input className="glass-input w-full" required value={form.name} onChange={(e) => update({ name: e.target.value })} />
          </Field>

          <Field label={t("admin.fieldAddress")}>
            <input className="glass-input w-full" required value={form.address} onChange={(e) => update({ address: e.target.value })} />
          </Field>

          <Field label={t("admin.fieldCity")}>
            <input className="glass-input w-full" value={form.city} onChange={(e) => update({ city: e.target.value })} />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("admin.fieldBusinessPhone")}>
              <input
                className="glass-input w-full"
                placeholder="+994 50 123 45 67"
                value={form.businessPhone}
                onChange={(e) => update({ businessPhone: e.target.value })}
              />
            </Field>
            <Field label={t("admin.fieldBusinessEmail")}>
              <input
                type="email"
                className="glass-input w-full"
                value={form.businessEmail}
                onChange={(e) => update({ businessEmail: e.target.value })}
              />
            </Field>
          </div>

          <Field label={t("admin.fieldDescription")}>
            <textarea
              className="glass-input w-full"
              rows={4}
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </Field>

          <Field label={t("admin.fieldCoverImage")}>
            <input
              className="glass-input w-full"
              placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => update({ imageUrl: e.target.value })}
            />
          </Field>

          <Field label={t("admin.fieldOperatingHours")}>
            <input
              className="glass-input w-full"
              placeholder={t("admin.operatingHoursPlaceholder")}
              maxLength={200}
              value={form.operatingHours}
              onChange={(e) => update({ operatingHours: e.target.value })}
            />
          </Field>

          <Field label={t("admin.fieldCuisineTypes")}>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {form.cuisineTypes.map((c) => (
                <span key={c} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                  {c}
                  <button type="button" onClick={() => removeCuisine(c)} className="text-slate-500 hover:text-slate-200">
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="glass-input flex-1"
                placeholder={t("admin.cuisinePlaceholder")}
                value={cuisineInput}
                onChange={(e) => setCuisineInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCuisine();
                  }
                }}
              />
              <button type="button" onClick={addCuisine} className="btn-ghost">
                {t("admin.addItem")}
              </button>
            </div>
          </Field>

          <Field label={t("admin.fieldGallery")}>
            <div className="mb-2 space-y-1.5">
              {form.galleryImageUrls.map((url) => (
                <div key={url} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300">
                  <span className="flex-1 truncate">{url}</span>
                  <button type="button" onClick={() => removeGalleryUrl(url)} className="text-slate-500 hover:text-slate-200">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="glass-input flex-1"
                placeholder="https://…"
                value={galleryInput}
                onChange={(e) => setGalleryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGalleryUrl();
                  }
                }}
              />
              <button type="button" onClick={addGalleryUrl} className="btn-ghost">
                {t("admin.addItem")}
              </button>
            </div>
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? t("admin.saving") : t("admin.saveVenue")}
            </button>
            {savedAt && <span className="text-xs text-status-free">{t("admin.saved")}</span>}
            {saveError && <span className="text-xs text-red-400">{saveError}</span>}
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-text">{label}</label>
      {children}
    </div>
  );
}
