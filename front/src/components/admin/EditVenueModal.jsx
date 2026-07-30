import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { getVenueDetails, updateVenue } from "../../services/apiService";
import { GlassCard } from "../shared/GlassCard";

/**
 * Fetches the venue's full record before rendering the form — the admin venues list (AdminVenueDto)
 * only carries name/owner/city/tableCount/isActive, and this modal PUTs the venue's *entire*
 * record (UpdateVenueRequestDto has no PATCH semantics), so fields the admin doesn't touch
 * (description, cover image, cuisine, gallery) must be loaded first or they'd be wiped on save.
 */
export function EditVenueModal({ venueId, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVenueDetails(venueId)
      .then((details) => {
        if (cancelled) return;
        setForm({
          name: details.name ?? "",
          address: details.address ?? "",
          city: details.city ?? "",
          businessEmail: details.businessEmail ?? "",
          businessPhone: details.businessPhone ?? "",
          description: details.description ?? "",
          imageUrl: details.imageUrl ?? "",
          cuisineTypes: details.cuisineTypes ?? [],
          galleryImageUrls: details.galleryImageUrls ?? [],
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const saved = await updateVenue(venueId, form);
      onSaved(saved);
    } catch (err) {
      setSaveError(err.response?.data?.error ?? t("platformAdmin.actionFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] overflow-y-auto"
      >
        <GlassCard className="w-[min(460px,92vw)] p-6">
          <div className="mb-5 flex items-start justify-between">
            <h2 className="text-lg font-bold text-slate-100">{t("platformAdmin.editVenueTitle")}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              ✕
            </button>
          </div>

          {loadError ? (
            <p className="py-6 text-center text-sm text-red-400">{t("admin.loadFailed")}</p>
          ) : !form ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("common.loading")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">{t("admin.fieldName")}</label>
                <input
                  className="glass-input w-full"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text">{t("admin.fieldAddress")}</label>
                <input
                  className="glass-input w-full"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text">{t("admin.fieldCity")}</label>
                <input className="glass-input w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-text">{t("admin.fieldBusinessPhone")}</label>
                  <input
                    className="glass-input w-full"
                    value={form.businessPhone}
                    onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-text">{t("admin.fieldBusinessEmail")}</label>
                  <input
                    type="email"
                    className="glass-input w-full"
                    value={form.businessEmail}
                    onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                  />
                </div>
              </div>

              {saveError && <p className="text-xs text-red-400">{saveError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost">
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? t("admin.saving") : t("common.save")}
                </button>
              </div>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
