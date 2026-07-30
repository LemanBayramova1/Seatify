import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GlassCard } from "./GlassCard";

export function ConfirmDialog({ title, body, confirmLabel, danger = true, onConfirm, onCancel }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard className="w-[min(420px,92vw)] p-6">
          <h2 className="mb-2 text-lg font-bold text-slate-100">{title}</h2>
          <p className="mb-5 text-sm text-slate-400">{body}</p>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="btn-ghost">
              {t("common.cancel")}
            </button>
            <button onClick={onConfirm} className={danger ? "btn-danger" : "btn-primary"}>
              {confirmLabel ?? t("common.confirm")}
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
