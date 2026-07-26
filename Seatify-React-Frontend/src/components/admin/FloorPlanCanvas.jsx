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
  const { elements, selectedId, isLoading, initialize, selectElement, updateElement, addElement } = useEditorStore((s) => ({
    elements: s.elements,
    selectedId: s.selectedId,
    isLoading: s.isLoading,
    initialize: s.initialize,
    selectElement: s.selectElement,
    updateElement: s.updateElement,
    addElement: s.addElement,
  }));

  useEffect(() => {
    initialize();
  }, [initialize]);

  function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/seatify-element");
    if (!type || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    addElement(type, { x: e.clientX - rect.left, y: e.clientY - rect.top });
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
