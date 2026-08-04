import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { getLocalizedElementLabel } from "../../lib/elementLabels";
import { useAuthStore } from "../../store/useAuthStore";
import { GlassCard } from "../shared/GlassCard";

const ZONE_FEATURE_KEYS = {
  VIP: "drawer.zoneFeature.VIP",
  WINDOW: "drawer.zoneFeature.WINDOW",
  STAGE: "drawer.zoneFeature.STAGE",
  QUIET_CORNER: "drawer.zoneFeature.QUIET_CORNER",
  BAR: "drawer.zoneFeature.BAR",
  TERRACE: "drawer.zoneFeature.TERRACE",
  GENERAL: "drawer.zoneFeature.GENERAL",
};

export function TableDetailsDrawer({ table, onClose, onReserve }) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const [specialRequests, setSpecialRequests] = useState("");
  const displayLabel = getLocalizedElementLabel(table, i18n.language);

  const featureKeys = [ZONE_FEATURE_KEYS[table.zone] ?? ZONE_FEATURE_KEYS.GENERAL];
  if (table.zone === "VIP" || table.minDeposit >= 50) featureKeys.push("drawer.zoneFeature.staffPick");

  function handleReserveClick() {
    if (!user) {
      openAuthModal("login");
      return;
    }
    onReserve(specialRequests.trim());
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="fixed right-4 top-24 z-40 w-[min(360px,92vw)]"
    >
      <GlassCard className="max-h-[75vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="label-text mb-0">{t("drawer.title")}</p>
            <h3 className="text-lg font-bold text-slate-100">{displayLabel}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <InfoStat label={t("drawer.tableId")} value={displayLabel} />
          <InfoStat label={t("builder.zone")} value={t(`builder.zones.${table.zone}`)} />
          <InfoStat label={t("drawer.capacity")} value={t("guest.tooltip.capacity", { count: table.capacity })} />
          <InfoStat label={t("drawer.minSpend")} value={`${table.minDeposit} ${t("common.azn")}`} />
        </div>

        <div className="mb-4">
          <p className="label-text">{t("drawer.features")}</p>
          <div className="flex flex-wrap gap-1.5">
            {featureKeys.map((key) => (
              <span key={key} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                {t(key)}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="label-text">{t("drawer.specialRequests")}</label>
          <textarea
            className="glass-input h-20 w-full resize-none"
            placeholder={t("drawer.specialRequestsPlaceholder")}
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
          />
        </div>

        {!user && <p className="mb-3 rounded-lg border border-brand-400/20 bg-brand-500/10 px-3 py-2 text-xs text-slate-300">{t("drawer.authRequiredNotice")}</p>}

        <button onClick={handleReserveClick} className="btn-primary w-full">
          {user ? t("drawer.reserve") : t("drawer.signInToReserve")}
        </button>
      </GlassCard>
    </motion.div>
  );
}

function InfoStat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
