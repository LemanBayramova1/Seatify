import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/useAuthStore";
import { GlassCard } from "../shared/GlassCard";

/** Gates a route to a specific role, prompting sign-in or showing an access-denied card otherwise. */
export function RequireRole({ role, children }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);

  if (!user) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16">
        <GlassCard className="mx-auto max-w-md p-8 text-center">
          <p className="mb-4 text-sm text-slate-400">{t("builder.signInPrompt")}</p>
          <button onClick={() => openAuthModal("login")} className="btn-primary">
            {t("header.signIn")}
          </button>
        </GlassCard>
      </div>
    );
  }

  if (user.role !== role) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16">
        <GlassCard className="mx-auto max-w-md p-8 text-center">
          <p className="text-sm text-slate-400">{t("builder.notAuthorized")}</p>
        </GlassCard>
      </div>
    );
  }

  return children;
}
