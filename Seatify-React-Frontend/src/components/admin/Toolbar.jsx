import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../store/useEditorStore";
import { GlassCard } from "../shared/GlassCard";

export function Toolbar() {
  const { t } = useTranslation();
  const [confirmClear, setConfirmClear] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const save = useEditorStore((s) => s.save);
  const undo = useEditorStore((s) => s.undo);
  const clearBoard = useEditorStore((s) => s.clearBoard);
  const isSaving = useEditorStore((s) => s.isSaving);
  const isDirty = useEditorStore((s) => s.isDirty);
  const history = useEditorStore((s) => s.history);

  async function handleSave() {
    setSaveError(null);
    try {
      await save();
    } catch (err) {
      setSaveError(err.response?.data?.error ?? t("builder.saveFailed"));
    }
  }

  return (
    <>
      <GlassCard className="flex items-center gap-3 px-4 py-3">
        <button onClick={handleSave} disabled={isSaving} className="btn-primary">
          {isSaving ? t("builder.saving") : t("builder.saveLayout")}
        </button>
        <button onClick={undo} disabled={history.length === 0} className="btn-ghost">
          {t("builder.undo")}
        </button>
        <button onClick={() => setConfirmClear(true)} className="btn-danger">
          {t("builder.clearBoard")}
        </button>
        <span className="ml-2 text-xs text-slate-400">
          {isDirty ? `● ${t("builder.unsavedChanges")}` : t("builder.saved")}
        </span>
        {saveError && <span className="text-xs text-red-400">{saveError}</span>}
      </GlassCard>

      <AnimatePresence>
        {confirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
            >
              <GlassCard className="w-96 p-6">
                <h3 className="mb-2 text-base font-semibold text-slate-100">{t("builder.clearConfirmTitle")}</h3>
                <p className="mb-6 text-sm text-slate-400">{t("builder.clearConfirmBody")}</p>
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => setConfirmClear(false)}>
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      clearBoard();
                      setConfirmClear(false);
                    }}
                  >
                    {t("builder.clearBoard")}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
