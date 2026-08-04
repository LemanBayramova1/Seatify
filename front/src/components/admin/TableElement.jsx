import { useEffect, useRef } from "react";
import Konva from "konva";
import { Circle, Group, Line, Rect, Text, Transformer } from "react-konva";
import { useTranslation } from "react-i18next";
import { ELEMENT_TYPES, SELECTION_COLOR, SELECTION_GLOW, STATUS, STATUS_COLOR, STATUS_GLOW, zoneColor } from "../../lib/zones";
import { getChairPositions } from "../../lib/chairLayout";
import { getLocalizedElementLabel } from "../../lib/elementLabels";

const TABLE_TYPES = new Set([ELEMENT_TYPES.ROUND_TABLE, ELEMENT_TYPES.SQUARE_TABLE, ELEMENT_TYPES.RECT_TABLE]);
const GRID_SNAP = 10;

function snap(value, step = GRID_SNAP) {
  return Math.round(value / step) * step;
}

/**
 * Renders one floor-plan element on the Konva canvas. Shared between the
 * admin builder (`mode="editor"`: draggable, resizable, colored by zone) and
 * the customer map (`mode="viewer"`: read-only, colored by live status).
 */
export function TableElement({
  element,
  mode = "editor",
  isSelected = false,
  status,
  onSelect,
  onChange,
  onClick,
  onHover,
  onHoverEnd,
}) {
  const { i18n } = useTranslation();
  const shapeRef = useRef(null);
  const transformerRef = useRef(null);
  const pulseTweenRef = useRef(null);
  const hoverTweenRef = useRef(null);
  const isTable = TABLE_TYPES.has(element.type);
  const isEditor = mode === "editor";
  const displayLabel = getLocalizedElementLabel(element, i18n.language);

  useEffect(() => {
    if (isEditor && isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isEditor, isSelected]);

  // Live "busy" indicator — a looping yoyo tween breathing the shape's glow, amber for HELD
  // and red for BOOKED, so guests can spot occupied tables on the map at a glance.
  useEffect(() => {
    pulseTweenRef.current?.destroy();
    pulseTweenRef.current = null;
    const node = shapeRef.current;
    const isBusy = status === STATUS.HELD || status === STATUS.BOOKED;
    if (!isEditor && isTable && isBusy && node) {
      node.shadowBlur(16);
      node.shadowOpacity(0.55);
      const tween = new Konva.Tween({
        node,
        duration: 0.7,
        shadowBlur: 26,
        shadowOpacity: 0.95,
        yoyo: true,
        repeat: -1,
        easing: Konva.Easings.EaseInOut,
      });
      tween.play();
      pulseTweenRef.current = tween;
    }
    return () => {
      pulseTweenRef.current?.destroy();
      pulseTweenRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isEditor, isTable]);

  const fill = isTable
    ? isEditor
      ? zoneColor(element.zone)
      : STATUS_COLOR[status] ?? STATUS_COLOR.FREE
    : decorFill(element.type);

  const glow = !isEditor && isTable ? STATUS_GLOW[status] ?? STATUS_GLOW.FREE : null;
  const dimmed = !isEditor && isTable && status === STATUS.BOOKED;
  const canInteract = !isEditor && isTable && status === STATUS.FREE;

  function runHoverTween(node, toShadowBlur, toScale) {
    if (!node) return;
    hoverTweenRef.current?.destroy();
    const tween = new Konva.Tween({
      node,
      duration: 0.18,
      shadowBlur: toShadowBlur,
      scaleX: toScale,
      scaleY: toScale,
      easing: Konva.Easings.EaseOut,
    });
    tween.play();
    hoverTweenRef.current = tween;
  }

  const interactionProps = isEditor
    ? {
        draggable: true,
        onClick: onSelect,
        onTap: onSelect,
        onDragEnd: (e) => onChange?.({ x: snap(e.target.x()), y: snap(e.target.y()) }),
        onTransformEnd: () => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange?.({
            x: snap(node.x()),
            y: snap(node.y()),
            rotation: node.rotation(),
            width: snap(Math.max(20, element.width * scaleX)),
            height: snap(Math.max(20, element.height * scaleY)),
          });
        },
      }
    : isTable
      ? {
          onClick: canInteract ? onClick : undefined,
          onTap: canInteract ? onClick : undefined,
          onMouseEnter: (e) => {
            const stage = e.target.getStage();
            stage.container().style.cursor = canInteract ? "pointer" : "default";
            onHover?.(e);
            if (canInteract) runHoverTween(shapeRef.current, 18, 1.06);
          },
          onMouseLeave: (e) => {
            const stage = e.target.getStage();
            stage.container().style.cursor = "default";
            onHoverEnd?.();
            if (canInteract) runHoverTween(shapeRef.current, 10, 1);
          },
        }
      : {};

  const chairs = isTable
    ? getChairPositions({
        type: element.type,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        capacity: element.capacity,
      })
    : [];

  const chairBackFill = isEditor ? "#94a3b8" : glow ?? "#94a3b8";
  const selectionRingSize = Math.max(element.width, element.height) / 2 + 14;

  return (
    <Group>
      {element.type === ELEMENT_TYPES.ZONE_LABEL && (
        <>
          <Text
            x={element.x - element.width / 2}
            y={element.y - 8}
            width={element.width}
            align="center"
            text={String(element.label).toUpperCase()}
            fontSize={13}
            fontStyle="700"
            letterSpacing={2}
            fill="rgba(226,232,240,0.6)"
            listening={false}
          />
          <Line
            points={[element.x - element.width / 2 + 18, element.y + 12, element.x + element.width / 2 - 18, element.y + 12]}
            stroke="rgba(226,232,240,0.16)"
            strokeWidth={1}
            listening={false}
          />
        </>
      )}

      {element.type === ELEMENT_TYPES.WINDOW && (
        <Rect
          ref={shapeRef}
          x={element.x}
          y={element.y}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          width={element.width}
          height={element.height}
          rotation={element.rotation}
          fill="#0c4a6e"
          stroke={isEditor && isSelected ? "#ffffff" : "#38bdf8"}
          strokeWidth={isEditor && isSelected ? 3 : 2}
          dash={[8, 5]}
          cornerRadius={2}
          {...interactionProps}
        />
      )}
      {element.type === ELEMENT_TYPES.DOOR && (
        <Rect
          ref={shapeRef}
          x={element.x}
          y={element.y}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          width={element.width}
          height={element.height}
          rotation={element.rotation}
          fill="#92400e"
          stroke={isEditor && isSelected ? "#ffffff" : "#d97706"}
          strokeWidth={isEditor && isSelected ? 3 : 2}
          cornerRadius={2}
          {...interactionProps}
        />
      )}
      {element.type === ELEMENT_TYPES.WALL && (
        <Rect
          ref={shapeRef}
          x={element.x}
          y={element.y}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          width={element.width}
          height={element.height}
          rotation={element.rotation}
          fill="#64748b"
          stroke={isEditor && isSelected ? "#ffffff" : "rgba(15,23,42,0.55)"}
          strokeWidth={isEditor && isSelected ? 2 : 1}
          {...interactionProps}
        />
      )}
      {element.type === ELEMENT_TYPES.STAGE && (
        <Rect
          ref={shapeRef}
          x={element.x}
          y={element.y}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          width={element.width}
          height={element.height}
          rotation={element.rotation}
          fill={fill}
          opacity={0.85}
          cornerRadius={10}
          stroke="#e9d5ff"
          strokeWidth={1}
          {...interactionProps}
        />
      )}
      {element.type === ELEMENT_TYPES.BAR_KITCHEN && (
        <Rect
          ref={shapeRef}
          x={element.x}
          y={element.y}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          width={element.width}
          height={element.height}
          rotation={element.rotation}
          fill="#34d399"
          opacity={0.8}
          cornerRadius={8}
          stroke="#a7f3d0"
          strokeWidth={isEditor && isSelected ? 3 : 1}
          {...interactionProps}
        />
      )}

      {isTable &&
        chairs.map((chair, i) => (
          <Group key={`${element.id}-chair-${i}`} x={chair.x} y={chair.y} rotation={chair.rotation} opacity={dimmed ? 0.4 : 1} listening={false}>
            <Rect width={14} height={16} offsetX={2} offsetY={8} cornerRadius={[3, 7, 7, 3]} fill="#e2e8f0" stroke="rgba(15,23,42,0.45)" strokeWidth={1} />
            <Rect x={5} y={0} width={4} height={12} offsetY={6} cornerRadius={1.5} fill={chairBackFill} />
          </Group>
        ))}

      {isTable && element.type === ELEMENT_TYPES.ROUND_TABLE && (
        <Circle
          ref={shapeRef}
          x={element.x}
          y={element.y}
          radius={element.width / 2}
          rotation={element.rotation}
          fill={fill}
          opacity={dimmed ? 0.55 : 1}
          stroke={isEditor && isSelected ? "#ffffff" : (glow ?? "rgba(15,23,42,0.55)")}
          strokeWidth={isEditor && isSelected ? 3 : glow ? 2.5 : 1.5}
          shadowColor={glow ?? "black"}
          shadowOpacity={glow ? 0.5 : 0.35}
          shadowBlur={glow ? 14 : 10}
          shadowOffsetY={glow ? 0 : 4}
          {...interactionProps}
        />
      )}
      {isTable && element.type !== ELEMENT_TYPES.ROUND_TABLE && (
        <Rect
          ref={shapeRef}
          x={element.x}
          y={element.y}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          width={element.width}
          height={element.height}
          rotation={element.rotation}
          fill={fill}
          opacity={dimmed ? 0.55 : 1}
          cornerRadius={element.type === ELEMENT_TYPES.SQUARE_TABLE ? 10 : 16}
          stroke={isEditor && isSelected ? "#ffffff" : (glow ?? "rgba(15,23,42,0.55)")}
          strokeWidth={isEditor && isSelected ? 3 : glow ? 2.5 : 1.5}
          shadowColor={glow ?? "black"}
          shadowOpacity={glow ? 0.5 : 0.35}
          shadowBlur={glow ? 14 : 10}
          shadowOffsetY={glow ? 0 : 4}
          {...interactionProps}
        />
      )}

      {!isEditor && isTable && isSelected && element.type === ELEMENT_TYPES.ROUND_TABLE && (
        <Circle
          x={element.x}
          y={element.y}
          radius={selectionRingSize}
          stroke={SELECTION_COLOR}
          strokeWidth={3}
          shadowColor={SELECTION_GLOW}
          shadowOpacity={0.9}
          shadowBlur={20}
          listening={false}
        />
      )}
      {!isEditor && isTable && isSelected && element.type !== ELEMENT_TYPES.ROUND_TABLE && (
        <Rect
          x={element.x}
          y={element.y}
          offsetX={element.width / 2 + 10}
          offsetY={element.height / 2 + 10}
          width={element.width + 20}
          height={element.height + 20}
          rotation={element.rotation}
          cornerRadius={element.type === ELEMENT_TYPES.SQUARE_TABLE ? 14 : 20}
          stroke={SELECTION_COLOR}
          strokeWidth={3}
          shadowColor={SELECTION_GLOW}
          shadowOpacity={0.9}
          shadowBlur={20}
          listening={false}
        />
      )}

      {(() => {
        const decorTypes = new Set([ELEMENT_TYPES.STAGE, ELEMENT_TYPES.BAR_KITCHEN, ELEMENT_TYPES.WALL, ELEMENT_TYPES.WINDOW, ELEMENT_TYPES.DOOR]);
        if (!isTable && !decorTypes.has(element.type)) return null;
        const isLightDecor = element.type === ELEMENT_TYPES.STAGE || element.type === ELEMENT_TYPES.BAR_KITCHEN;
        return (
          <Text
            x={element.x - element.width / 2}
            y={element.y - 7}
            width={element.width}
            align="center"
            text={displayLabel}
            fontSize={12}
            fontStyle="700"
            fill={isTable && !isEditor ? "#f8fafc" : isLightDecor ? "#0b0e16" : "#e2e8f0"}
            shadowColor={isTable && !isEditor ? "rgba(0,0,0,0.6)" : undefined}
            shadowBlur={isTable && !isEditor ? 3 : 0}
            listening={false}
          />
        );
      })()}
      {isEditor && isSelected && <Transformer ref={transformerRef} rotateEnabled keepRatio={false} anchorCornerRadius={4} />}
    </Group>
  );
}

function decorFill(type) {
  if (type === ELEMENT_TYPES.STAGE) return "#f0abfc";
  return "#94a3b8";
}
