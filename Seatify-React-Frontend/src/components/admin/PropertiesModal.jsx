import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ELEMENT_TYPES, ZONES } from "../../lib/zones";
import { useEditorStore } from "../../store/useEditorStore";
import { GlassCard } from "../shared/GlassCard";

const TABLE_TYPES = new Set([ELEMENT_TYPES.ROUND_TABLE, ELEMENT_TYPES.SQUARE_TABLE, ELEMENT_TYPES.RECT_TABLE]);
const CAPACITY_PRESETS = [2, 4, 6, 8];
const ROTATION_PRESETS = [0, 90, 180, 270];

export function PropertiesModal() {
  const { t } = useTranslation();
  const floorPlans = useEditorStore((s) => s.floorPlans);
  const activeFloorPlanId = useEditorStore((s) => s.activeFloorPlanId);
  const selectedId = useEditorStore((s) => s.selectedId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const removeElement = useEditorStore((s) => s.removeElement);
  const selectElement = useEditorStore((s) => s.selectElement);

  const elements = floorPlans.find((fp) => fp.id === activeFloorPlanId)?.elements ?? [];
  const element = elements.find((el) => el.id === selectedId);
  const isTable = element && TABLE_TYPES.has(element.type);

  return (
    <AnimatePresence>
      {element && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          <GlassCard className="w-72 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">{t("builder.properties")}</h3>
              <button onClick={() => selectElement(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-text">{t("builder.label")}</label>
                <input
                  className="glass-input w-full"
                  value={element.label}
                  onChange={(e) => updateElement(element.id, { label: e.target.value }, { silent: true })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">{t("builder.positionX")}</label>
                  <input
                    type="number"
                    className="glass-input w-full"
                    value={Math.round(element.x)}
                    onChange={(e) => updateElement(element.id, { x: Number(e.target.value) }, { silent: true })}
                  />
                </div>
                <div>
                  <label className="label-text">{t("builder.positionY")}</label>
                  <input
                    type="number"
                    className="glass-input w-full"
                    value={Math.round(element.y)}
                    onChange={(e) => updateElement(element.id, { y: Number(e.target.value) }, { silent: true })}
                  />
                </div>
              </div>

              <div>
                <label className="label-text">{t("builder.rotation")}</label>
                <div className="flex gap-1.5">
                  {ROTATION_PRESETS.map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => updateElement(element.id, { rotation: deg })}
                      className={`flex-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                        element.rotation === deg
                          ? "border-brand-400/60 bg-brand-500 text-white shadow-glow"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {isTable && (
                <>
                  <div>
                    <label className="label-text">{t("builder.capacity")}</label>
                    <div className="mb-2 flex gap-1.5">
                      {CAPACITY_PRESETS.map((n, i) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateElement(element.id, { capacity: n }, { silent: true })}
                          className={`flex-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                            element.capacity === n
                              ? "border-brand-400/60 bg-brand-500 text-white shadow-glow"
                              : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                          }`}
                        >
                          {i === CAPACITY_PRESETS.length - 1 ? `${n}+` : n}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={1}
                      className="glass-input w-full"
                      value={element.capacity}
                      onChange={(e) => updateElement(element.id, { capacity: Number(e.target.value) }, { silent: true })}
                    />
                  </div>
                  <div>
                    <label className="label-text">{t("builder.minDeposit")}</label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      className="glass-input w-full"
                      value={element.minDeposit}
                      onChange={(e) => updateElement(element.id, { minDeposit: Number(e.target.value) }, { silent: true })}
                    />
                  </div>
                  <div>
                    <label className="label-text">{t("builder.zone")}</label>
                    <select
                      className="glass-input w-full"
                      value={element.zone}
                      onChange={(e) => updateElement(element.id, { zone: e.target.value })}
                    >
                      {ZONES.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {t(`builder.zones.${zone.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button onClick={() => removeElement(element.id)} className="btn-danger w-full">
                {t("builder.deleteElement")}
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
