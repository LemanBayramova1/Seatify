import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ELEMENT_TYPES } from "../../lib/zones";
import { useEditorStore } from "../../store/useEditorStore";
import { GlassCard } from "../shared/GlassCard";

const ITEMS = [
  { type: ELEMENT_TYPES.ROUND_TABLE, labelKey: "builder.roundTable", swatch: "rounded-full w-7 h-7" },
  { type: ELEMENT_TYPES.SQUARE_TABLE, labelKey: "builder.squareTable", swatch: "rounded-md w-7 h-7" },
  { type: ELEMENT_TYPES.RECT_TABLE, labelKey: "builder.rectTable", swatch: "rounded-md w-9 h-5" },
  { type: ELEMENT_TYPES.STAGE, labelKey: "builder.stage", swatch: "rounded-md w-9 h-5", tone: "bg-fuchsia-300" },
  { type: ELEMENT_TYPES.WINDOW, labelKey: "builder.window", swatch: "rounded-full w-9 h-1.5", tone: "bg-sky-400" },
  { type: ELEMENT_TYPES.DOOR, labelKey: "builder.door", swatch: "rounded-full w-9 h-1.5", tone: "bg-amber-500" },
];

export function Toolbox() {
  const { t } = useTranslation();
  const addElement = useEditorStore((s) => s.addElement);

  return (
    <GlassCard className="p-4">
      <h3 className="mb-1 text-sm font-semibold text-slate-200">{t("builder.toolbox")}</h3>
      <p className="mb-4 text-xs text-slate-400">{t("builder.dropHint")}</p>
      <div className="grid grid-cols-2 gap-2">
        {ITEMS.map((item) => (
          <motion.button
            key={item.type}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("application/seatify-element", item.type)}
            onClick={() => addElement(item.type)}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center transition hover:border-brand-400/40 hover:bg-white/[0.07]"
          >
            <span className={`${item.swatch} ${item.tone ?? "bg-slate-300"} shadow-inner`} />
            <span className="text-[11px] font-medium text-slate-300">{t(item.labelKey)}</span>
          </motion.button>
        ))}
      </div>
    </GlassCard>
  );
}
