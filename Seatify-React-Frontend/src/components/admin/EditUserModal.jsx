import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GlassCard } from "../shared/GlassCard";

const ROLE_OPTIONS = ["Customer", "RestaurantOwner", "Admin"];

export function EditUserModal({ user, onClose, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone ?? "", role: user.role });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.response?.data?.error ?? t("platformAdmin.actionFailed"));
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
      >
        <GlassCard className="w-[min(420px,92vw)] p-6">
          <div className="mb-5 flex items-start justify-between">
            <h2 className="text-lg font-bold text-slate-100">{t("platformAdmin.editUserTitle")}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-text">{t("auth.name")}</label>
              <input className="glass-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label-text">{t("auth.email")}</label>
              <input
                type="email"
                className="glass-input w-full"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text">{t("auth.phone")}</label>
              <input className="glass-input w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label-text">{t("platformAdmin.colRole")}</label>
              <select className="glass-input w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {t(`platformAdmin.role.${role}`, role)}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost">
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? t("admin.saving") : t("common.save")}
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
