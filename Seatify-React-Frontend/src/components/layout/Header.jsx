import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROLES, useAuthStore } from "../../store/useAuthStore";
import { LanguageSwitcher } from "../shared/LanguageSwitcher";
import { UserMenu } from "./UserMenu";

export function Header() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const isRestaurantOwner = user?.role === ROLES.RESTAURANT_OWNER;
  const isAdmin = user?.role === ROLES.ADMIN;

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-lg font-extrabold text-transparent">
            {t("common.appName")}
          </span>
          <div className="hidden gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 sm:flex">
            {!isRestaurantOwner && !isAdmin && <NavTab to="/restaurants" label={t("nav.restaurants")} />}
            {!isRestaurantOwner && !isAdmin && <NavTab to="/my-bookings" label={t("nav.myBookings")} />}
            {isRestaurantOwner && <NavTab to="/admin" end label={t("nav.dashboard")} />}
            {isRestaurantOwner && <NavTab to="/builder" label={t("nav.builder")} />}
            {isAdmin && <NavTab to="/platform-admin" label={t("nav.platformAdmin")} />}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <button onClick={() => openAuthModal("login")} className="btn-primary">
              {t("header.signIn")}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavTab({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-full px-4 py-1.5 text-sm font-medium transition ${
          isActive ? "bg-brand-500 text-white shadow-glow" : "text-slate-400 hover:text-slate-200"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
