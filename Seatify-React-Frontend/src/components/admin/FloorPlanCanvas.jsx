import { useEffect, useRef } from "react";
import { Layer, Stage } from "react-konva";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../store/useEditorStore";
import { TableElement } from "./TableElement";

const STAGE_WIDTH = 860;
const STAGE_HEIGHT = 560;

export function FloorPlanCanvas() {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const floorPlans = useEditorStore((s) => s.floorPlans);
  const activeFloorPlanId = useEditorStore((s) => s.activeFloorPlanId);
  const selectedId = useEditorStore((s) => s.selectedId);
  const isLoading = useEditorStore((s) => s.isLoading);
  const initialize = useEditorStore((s) => s.initialize);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const addElement = useEditorStore((s) => s.addElement);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const activeFloorPlan = floorPlans.find((fp) => fp.id === activeFloorPlanId);
  const elements = activeFloorPlan?.elements ?? [];
  // Each zone can have its own logical canvas size; render it into the fixed-size Stage below by
  // scaling — Konva keeps shape-local coordinates (drag/transform math in TableElement) in
  // canvas-space regardless of this render-only scale, so nothing else needs to know about it.
  const scaleX = STAGE_WIDTH / (activeFloorPlan?.canvasWidth ?? STAGE_WIDTH);
  const scaleY = STAGE_HEIGHT / (activeFloorPlan?.canvasHeight ?? STAGE_HEIGHT);

  function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/seatify-element");
    if (!type || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    addElement(type, { x: (e.clientX - rect.left) / scaleX, y: (e.clientY - rect.top) / scaleY });
  }

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative overflow-hidden rounded-2xl border border-white/10 shadow-glass"
      style={{
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        backgroundColor: "#0e1220",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-950/60 text-sm text-slate-300">
          {t("common.loading")}
        </div>
      )}
      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        scaleX={scaleX}
        scaleY={scaleY}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) selectElement(null);
        }}
      >
        <Layer>
          {elements.map((element) => (
            <TableElement
              key={element.id}
              element={element}
              mode="editor"
              isSelected={element.id === selectedId}
              onSelect={() => selectElement(element.id)}
              onChange={(patch) => updateElement(element.id, patch)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
