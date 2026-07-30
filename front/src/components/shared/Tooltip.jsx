import { AnimatePresence, motion } from "framer-motion";

/**
 * Floating tooltip positioned in screen-space. Konva renders to a single
 * <canvas> element, so per-shape native tooltips aren't possible — instead
 * the canvas reports hover state + coordinates, and this renders as a
 * regular HTML overlay on top of the stage.
 */
export function Tooltip({ visible, x, y, children }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute z-30 glass-panel rounded-xl px-3 py-2 text-xs text-slate-100 shadow-glow"
          style={{ left: x, top: y, transform: "translate(-50%, -110%)" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
