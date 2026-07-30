import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/useAuthStore";
import { useToastStore } from "../../store/useToastStore";
import { GlassCard } from "../shared/GlassCard";

export function OtpVerificationModal() {
  const { t } = useTranslation();
  const otpModalOpen = useAuthStore((s) => s.otpModalOpen);
  const pendingOtpEmail = useAuthStore((s) => s.pendingOtpEmail);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const resendOtp = useAuthStore((s) => s.resendOtp);
  const closeOtpModal = useAuthStore((s) => s.closeOtpModal);
  const showToast = useToastStore((s) => s.showToast);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!otpModalOpen) {
      setCode("");
      setError("");
      setResent(false);
    }
  }, [otpModalOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const user = await verifyOtp(pendingOtpEmail, code);
      showToast(t("otp.welcome", { name: user.name }));
    } catch (err) {
      setError(t(err.message));
    }
  }

  async function handleResend() {
    setError("");
    try {
      await resendOtp(pendingOtpEmail);
      setResent(true);
    } catch (err) {
      setError(t(err.message));
    }
  }

  return (
    <AnimatePresence>
      {otpModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeOtpModal}
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
                <h2 className="text-lg font-bold text-slate-100">{t("otp.title")}</h2>
                <button onClick={closeOtpModal} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <p className="mb-5 text-sm text-slate-400">{t("otp.subtitle", { email: pendingOtpEmail })}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-text">{t("otp.code")}</label>
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    className="glass-input w-full text-center text-lg tracking-[0.4em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button type="submit" disabled={isSubmitting || code.length !== 6} className="btn-primary w-full">
                  {isSubmitting ? t("auth.submitting") : t("otp.verifyCta")}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isSubmitting}
                  className="w-full text-center text-xs font-medium text-brand-300 hover:text-brand-200 disabled:opacity-50"
                >
                  {resent ? t("otp.resent") : t("otp.resendCta")}
                </button>
              </form>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
