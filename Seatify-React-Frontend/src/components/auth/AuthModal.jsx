import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ROLES, USE_MOCKS, useAuthStore } from "../../store/useAuthStore";
import { GlassCard } from "../shared/GlassCard";

export function AuthModal() {
  const { t } = useTranslation();
  const isModalOpen = useAuthStore((s) => s.isModalOpen);
  const modalMode = useAuthStore((s) => s.modalMode);
  const setModalMode = useAuthStore((s) => s.setModalMode);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: ROLES.CUSTOMER });
  const [errors, setErrors] = useState({});

  function reset() {
    setForm({ name: "", email: "", password: "", role: ROLES.CUSTOMER });
    setErrors({});
  }

  function switchMode(next) {
    setModalMode(next);
    setErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    try {
      if (modalMode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password, form.role);
      }
      reset();
      closeAuthModal();
    } catch (err) {
      setErrors({ form: t(err.message) });
    }
  }

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeAuthModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="w-[min(400px,92vw)] p-6">
              <div className="mb-5 flex items-start justify-between">
                <h2 className="text-lg font-bold text-slate-100">{modalMode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h2>
                <button onClick={closeAuthModal} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <div className="mb-5 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
                <TabButton active={modalMode === "login"} onClick={() => switchMode("login")}>
                  {t("auth.tabLogin")}
                </TabButton>
                <TabButton active={modalMode === "register"} onClick={() => switchMode("register")}>
                  {t("auth.tabRegister")}
                </TabButton>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {modalMode === "register" && (
                  <div>
                    <label className="label-text">{t("auth.name")}</label>
                    <input
                      className="glass-input w-full"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Əli Məmmədov"
                    />
                  </div>
                )}

                {modalMode === "register" && (
                  <div>
                    <label className="label-text">{t("auth.role")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <RoleOption
                        active={form.role === ROLES.CUSTOMER}
                        onClick={() => setForm({ ...form, role: ROLES.CUSTOMER })}
                        title={t("auth.roleCustomer")}
                        subtitle={t("auth.roleCustomerHint")}
                      />
                      <RoleOption
                        active={form.role === ROLES.RESTAURANT_OWNER}
                        onClick={() => setForm({ ...form, role: ROLES.RESTAURANT_OWNER })}
                        title={t("auth.roleRestaurantOwner")}
                        subtitle={t("auth.roleRestaurantOwnerHint")}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label-text">{t("auth.email")}</label>
                  <input
                    type="email"
                    className="glass-input w-full"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="label-text">{t("auth.password")}</label>
                  <input
                    type="password"
                    className="glass-input w-full"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? t("auth.submitting") : modalMode === "login" ? t("auth.loginCta") : t("auth.registerCta")}
                </button>

                {USE_MOCKS && <p className="text-center text-xs text-slate-500">{t("auth.mockNotice")}</p>}
              </form>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active ? "bg-brand-500 text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function RoleOption({ active, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-brand-400/60 bg-brand-500/10 text-slate-100"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[11px] text-slate-500">{subtitle}</p>
    </button>
  );
}
