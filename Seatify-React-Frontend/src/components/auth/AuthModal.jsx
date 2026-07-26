import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ROLES, USE_MOCKS, useAuthStore } from "../../store/useAuthStore";
import { AZ_PHONE_PATTERN, formatAzPhone } from "../../lib/phone";
import { GlassCard } from "../shared/GlassCard";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  role: ROLES.CUSTOMER,
  agreedToTerms: false,
  restaurantName: "",
  restaurantAddress: "",
  city: "",
  businessEmail: "",
  businessPhone: "",
};

export function AuthModal() {
  const { t } = useTranslation();
  const isModalOpen = useAuthStore((s) => s.isModalOpen);
  const modalMode = useAuthStore((s) => s.modalMode);
  const modalPresetRole = useAuthStore((s) => s.modalPresetRole);
  const setModalMode = useAuthStore((s) => s.setModalMode);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function reset() {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  useEffect(() => {
    if (isModalOpen && modalPresetRole) {
      setForm((prev) => ({ ...prev, role: modalPresetRole }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, modalPresetRole]);

  function switchMode(next) {
    setModalMode(next);
    setErrors({});
  }

  function patch(fields) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function validateRegister() {
    const next = {};
    if (form.password !== form.confirmPassword) next.confirmPassword = t("auth.errors.passwordMismatch");
    if (form.phone && !AZ_PHONE_PATTERN.test(form.phone)) next.phone = t("auth.errors.phoneInvalid");
    if (!form.agreedToTerms) next.agreedToTerms = t("auth.errors.termsRequired");
    if (form.role === ROLES.RESTAURANT_OWNER) {
      if (!form.restaurantName.trim()) next.restaurantName = t("auth.errors.restaurantNameRequired");
      if (!form.city.trim()) next.city = t("auth.errors.cityRequired");
      if (form.businessPhone && !AZ_PHONE_PATTERN.test(form.businessPhone)) next.businessPhone = t("auth.errors.phoneInvalid");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    try {
      if (modalMode === "login") {
        await login(form.email, form.password);
      } else {
        if (!validateRegister()) return;
        await register(form.name, form.email, form.password, form.role, {
          phone: form.phone,
          restaurantName: form.restaurantName,
          restaurantAddress: form.restaurantAddress,
          city: form.city,
          businessEmail: form.businessEmail,
          businessPhone: form.businessPhone,
        });
      }
      reset();
      closeAuthModal();
    } catch (err) {
      setErrors({ form: t(err.message) });
    }
  }

  const isRestaurantOwner = form.role === ROLES.RESTAURANT_OWNER;

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
            className="max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="w-[min(460px,92vw)] p-6">
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
                      onChange={(e) => patch({ name: e.target.value })}
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
                        onClick={() => patch({ role: ROLES.CUSTOMER })}
                        title={t("auth.roleCustomer")}
                        subtitle={t("auth.roleCustomerHint")}
                      />
                      <RoleOption
                        active={form.role === ROLES.RESTAURANT_OWNER}
                        onClick={() => patch({ role: ROLES.RESTAURANT_OWNER })}
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
                    onChange={(e) => patch({ email: e.target.value })}
                    placeholder="you@example.com"
                  />
                </div>

                {modalMode === "register" && (
                  <div>
                    <label className="label-text">{t("auth.phone")}</label>
                    <input
                      className="glass-input w-full"
                      value={form.phone}
                      onChange={(e) => patch({ phone: formatAzPhone(e.target.value) })}
                      placeholder="+994 50 123 45 67"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
                  </div>
                )}

                <PasswordField
                  label={t("auth.password")}
                  value={form.password}
                  onChange={(value) => patch({ password: value })}
                  visible={showPassword}
                  onToggleVisible={() => setShowPassword((v) => !v)}
                />

                {modalMode === "register" && (
                  <>
                    <PasswordField
                      label={t("auth.confirmPassword")}
                      value={form.confirmPassword}
                      onChange={(value) => patch({ confirmPassword: value })}
                      visible={showConfirmPassword}
                      onToggleVisible={() => setShowConfirmPassword((v) => !v)}
                      error={errors.confirmPassword}
                    />

                    {isRestaurantOwner && (
                      <div className="space-y-4 border-t border-white/10 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("auth.businessSectionTitle")}</p>
                        <div>
                          <label className="label-text">{t("auth.restaurantName")}</label>
                          <input
                            className="glass-input w-full"
                            value={form.restaurantName}
                            onChange={(e) => patch({ restaurantName: e.target.value })}
                          />
                          {errors.restaurantName && <p className="mt-1 text-xs text-red-400">{errors.restaurantName}</p>}
                        </div>
                        <div>
                          <label className="label-text">{t("auth.restaurantAddress")}</label>
                          <input
                            className="glass-input w-full"
                            value={form.restaurantAddress}
                            onChange={(e) => patch({ restaurantAddress: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label-text">{t("auth.city")}</label>
                          <input className="glass-input w-full" value={form.city} onChange={(e) => patch({ city: e.target.value })} placeholder="Bakı" />
                          {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city}</p>}
                        </div>
                        <div>
                          <label className="label-text">{t("auth.businessEmail")}</label>
                          <input
                            type="email"
                            className="glass-input w-full"
                            value={form.businessEmail}
                            onChange={(e) => patch({ businessEmail: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label-text">{t("auth.businessPhone")}</label>
                          <input
                            className="glass-input w-full"
                            value={form.businessPhone}
                            onChange={(e) => patch({ businessPhone: formatAzPhone(e.target.value) })}
                            placeholder="+994 50 123 45 67"
                          />
                          {errors.businessPhone && <p className="mt-1 text-xs text-red-400">{errors.businessPhone}</p>}
                        </div>
                      </div>
                    )}

                    <label className="flex items-start gap-2 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/[0.06] accent-brand-500"
                        checked={form.agreedToTerms}
                        onChange={(e) => patch({ agreedToTerms: e.target.checked })}
                      />
                      <span>{t("auth.termsLabel")}</span>
                    </label>
                    {errors.agreedToTerms && <p className="-mt-2 text-xs text-red-400">{errors.agreedToTerms}</p>}
                  </>
                )}

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

function PasswordField({ label, value, onChange, visible, onToggleVisible, error }) {
  return (
    <div>
      <label className="label-text">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className="glass-input w-full pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
        >
          {visible ? "🙈" : "👁"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
