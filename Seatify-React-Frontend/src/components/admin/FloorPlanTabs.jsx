import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../store/useEditorStore";
import { GlassCard } from "../shared/GlassCard";

export function FloorPlanTabs() {
  const { t } = useTranslation();
  const floorPlans = useEditorStore((s) => s.floorPlans);
  const activeFloorPlanId = useEditorStore((s) => s.activeFloorPlanId);
  const addFloorPlan = useEditorStore((s) => s.addFloorPlan);
  const renameFloorPlan = useEditorStore((s) => s.renameFloorPlan);
  const switchFloorPlan = useEditorStore((s) => s.switchFloorPlan);
  const deleteFloorPlan = useEditorStore((s) => s.deleteFloorPlan);

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function startRename(fp) {
    setEditingId(fp.id);
    setEditingName(fp.name);
  }

  function commitRename() {
    if (editingId && editingName.trim()) renameFloorPlan(editingId, editingName.trim());
    setEditingId(null);
  }

  return (
    <>
      <GlassCard className="flex flex-wrap items-center gap-2 px-3 py-2">
        {floorPlans.map((fp) => {
          const active = fp.id === activeFloorPlanId;
          return (
            <div
              key={fp.id}
              className={`group flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 transition ${
                active ? "bg-brand-500 text-white shadow-glow" : "bg-white/[0.03] text-slate-400 hover:text-slate-200"
              }`}
            >
              {editingId === fp.id ? (
                <input
                  autoFocus
                  className="w-28 rounded-full bg-black/20 px-2 py-0.5 text-sm text-inherit outline-none"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => switchFloorPlan(fp.id)}
                  onDoubleClick={() => startRename(fp)}
                  className="text-sm font-semibold"
                >
                  {fp.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => startRename(fp)}
                title={t("builder.renameZone")}
                className="rounded-full px-1 text-xs opacity-0 transition group-hover:opacity-100"
              >
                ✎
              </button>
              {floorPlans.length > 1 && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(fp.id)}
                  className="rounded-full px-1.5 py-0.5 text-xs opacity-0 transition hover:bg-black/20 group-hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => addFloorPlan(t("builder.newZoneDefaultName"))}
          title={t("builder.newZoneDefaultName")}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-brand-400/40 hover:bg-white/[0.07]"
        >
          +
        </button>
      </GlassCard>

      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}>
              <GlassCard className="w-96 p-6">
                <h3 className="mb-2 text-base font-semibold text-slate-100">{t("builder.deleteZoneConfirmTitle")}</h3>
                <p className="mb-6 text-sm text-slate-400">{t("builder.deleteZoneConfirmBody")}</p>
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => setConfirmDeleteId(null)}>
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      deleteFloorPlan(confirmDeleteId);
                      setConfirmDeleteId(null);
                    }}
                  >
                    {t("common.delete")}
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
