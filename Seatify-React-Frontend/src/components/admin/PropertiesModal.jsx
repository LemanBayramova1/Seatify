import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ELEMENT_TYPES, ZONES } from "../../lib/zones";
import { useEditorStore } from "../../store/useEditorStore";
import { GlassCard } from "../shared/GlassCard";

const TABLE_TYPES = new Set([ELEMENT_TYPES.ROUND_TABLE, ELEMENT_TYPES.SQUARE_TABLE, ELEMENT_TYPES.RECT_TABLE]);

export function PropertiesModal() {
  const { t } = useTranslation();
  const elements = useEditorStore((s) => s.elements);
  const selectedId = useEditorStore((s) => s.selectedId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const removeElement = useEditorStore((s) => s.removeElement);
  const selectElement = useEditorStore((s) => s.selectElement);

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

              {isTable && (
                <>
                  <div>
                    <label className="label-text">{t("builder.capacity")}</label>
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
