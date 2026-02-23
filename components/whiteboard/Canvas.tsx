'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Transformer, RegularPolygon, Arrow, Image as KonvaImage, Ellipse, Shape, Group } from 'react-konva';
import { nanoid } from 'nanoid';
import { WhiteboardElement, db } from '@/lib/db';
import { Tool } from './Toolbar';
import Konva from 'konva';
import useImage from 'use-image';
import { useTheme } from '@/app/contexts/ThemeContext';

const DEFAULT_STROKE_LIGHT = '#000000';
const DEFAULT_STROKE_DARK = '#ffffff';
const LEGACY_STROKE_LIGHT = '#1e1e1e';
const LEGACY_STROKE_DARK = '#e5e5e5';

// Cores que devem inverter com o tema para sempre contrastar com o fundo
const CONTRAST_STROKE_LIGHT = [DEFAULT_STROKE_LIGHT, LEGACY_STROKE_LIGHT, '#1a1a1a', '#111'];
const CONTRAST_STROKE_DARK = [DEFAULT_STROKE_DARK, LEGACY_STROKE_DARK, '#e5e5e5', '#eee', '#f5f5f5', '#fafafa'];

function resolveStrokeForTheme(stroke: string, isDark: boolean): string {
  if (!stroke || stroke === 'transparent') return stroke;
  const s = stroke.toLowerCase().trim();
  if (isDark && CONTRAST_STROKE_LIGHT.some((c) => c === s)) return DEFAULT_STROKE_DARK;
  if (!isDark && CONTRAST_STROKE_DARK.some((c) => c === s)) return DEFAULT_STROKE_LIGHT;
  return stroke;
}

// Deterministic "random" in [-1, 1] from seed (traço estável tipo lápis)
function seededNoise(seed: string, i: number): number {
  let h = 0;
  const s = seed + '-' + i;
  for (let j = 0; j < s.length; j++) {
    h = Math.imul(31, h) + s.charCodeAt(j) | 0;
  }
  return (Math.sin(h * 0.1) * 0.5 + 0.5) * 2 - 1;
}

// Desenha forma com traço tipo lápis: geometria base + jitter nos pontos (hand‑drawn)
function createPencilSceneFunc(
  type: 'rectangle' | 'circle' | 'triangle' | 'diamond',
  w: number,
  h: number,
  stroke: string,
  fill: string,
  strokeWidth: number,
  dash: number[],
  lineJoin: 'miter' | 'round' | 'bevel',
  lineCap: 'butt' | 'round' | 'square',
  sloppiness: number,
  seed: string,
  cornerRadius: number
) {
  // Nivel 1: leve hand-drawn, Nivel 2: bem rough/rabiscado
  const numPasses = sloppiness === 1 ? 2 : 4;
  const baseJitterFactor = sloppiness === 1 ? 0.01 : 0.03; // % do menor lado
  const edgeJitter = Math.min(w, h) * baseJitterFactor;
  const samplesPerEdge = sloppiness === 1 ? 14 : 28;

  return (context: Konva.Context, shape: Konva.Shape) => {
    const ctx = context._context;
    const cx = w / 2;
    const cy = h / 2;
    const rx = w / 2;
    const ry = h / 2;

    // Jitter determinístico ao longo de um segmento (linha reta)
    function jitteredEdge(x1: number, y1: number, x2: number, y2: number, passIndex: number, edgeIndex: number) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 1; i < samplesPerEdge; i++) {
        const t = i / samplesPerEdge;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        const noiseIndex = passIndex * 1000 + edgeIndex * 100 + i;
        const nx = seededNoise(seed, noiseIndex) * edgeJitter;
        const ny = seededNoise(seed, noiseIndex + 1) * edgeJitter;
        ctx.lineTo(px + nx, py + ny);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Forma base para fill (sem jitter pesado para manter interior limpo)
    function addBasePath() {
      ctx.beginPath();
      if (type === 'rectangle') {
        if (cornerRadius > 0) {
          const r = Math.min(cornerRadius, w / 2, h / 2);
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.arcTo(w, 0, w, r, r);
          ctx.lineTo(w, h - r);
          ctx.arcTo(w, h, w - r, h, r);
          ctx.lineTo(r, h);
          ctx.arcTo(0, h, 0, h - r, r);
          ctx.lineTo(0, r);
          ctx.arcTo(0, 0, r, 0, r);
        } else {
          ctx.rect(0, 0, w, h);
        }
      } else if (type === 'circle') {
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else if (type === 'triangle') {
        const r = Math.min(w, h) / 2;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          const x = cx + r * Math.cos(a);
          const y = cy + r * Math.sin(a) * (h / w);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else if (type === 'diamond') {
        ctx.moveTo(cx, 0);
        ctx.lineTo(w, cy);
        ctx.lineTo(cx, h);
        ctx.lineTo(0, cy);
        ctx.closePath();
      }
    }

    ctx.save();
    // Fill
    if (fill && fill !== 'transparent') {
      addBasePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }
    // Pencil stroke: várias passadas com pequeno deslocamento e opacidade = grão de lápis
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = lineJoin;
    ctx.lineCap = lineCap;
    if (dash.length) ctx.setLineDash(dash);

    for (let i = 0; i < numPasses; i++) {
      ctx.save();
      // jitter global leve por passada
      const globalJitter = edgeJitter * 0.25;
      ctx.translate(
        seededNoise(seed, i * 2) * globalJitter,
        seededNoise(seed, i * 2 + 1) * globalJitter
      );
      ctx.globalAlpha = 0.35 + 0.3 * (0.5 + 0.5 * seededNoise(seed, i + 50));

      // Contornos com jitter ao longo das bordas
      if (type === 'rectangle' && cornerRadius === 0) {
        const edges = [
          [0, 0, w, 0],
          [w, 0, w, h],
          [w, h, 0, h],
          [0, h, 0, 0],
        ] as const;
        edges.forEach(([x1, y1, x2, y2], edgeIndex) => {
          jitteredEdge(x1, y1, x2, y2, i, edgeIndex);
        });
      } else if (type === 'circle') {
        const totalSamples = samplesPerEdge * 4;
        ctx.beginPath();
        for (let s = 0; s <= totalSamples; s++) {
          const t = s / totalSamples;
          const angle = t * Math.PI * 2;
          const bx = cx + rx * Math.cos(angle);
          const by = cy + ry * Math.sin(angle);
          const noiseIndex = i * 2000 + s;
          const nx = seededNoise(seed, noiseIndex) * edgeJitter;
          const ny = seededNoise(seed, noiseIndex + 1) * edgeJitter;
          const x = bx + nx;
          const y = by + ny;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (type === 'triangle' || type === 'diamond') {
        // Compute polygon vertices and draw each edge with jitter
        let vertices: [number, number][];
        if (type === 'triangle') {
          const r = Math.min(w, h) / 2;
          vertices = Array.from({ length: 3 }, (_, k) => {
            const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
            return [cx + r * Math.cos(a), cy + r * Math.sin(a) * (h / w)] as [number, number];
          });
        } else {
          // diamond
          vertices = [
            [cx, 0],
            [w, cy],
            [cx, h],
            [0, cy],
          ];
        }
        const nv = vertices.length;
        vertices.forEach(([x1, y1], idx) => {
          const [x2, y2] = vertices[(idx + 1) % nv];
          jitteredEdge(x1, y1, x2, y2, i, idx);
        });
      } else if (type === 'rectangle' && cornerRadius > 0) {
        addBasePath();
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // última passada mais limpa para "ancorar" o traço
    addBasePath();
    ctx.stroke();
    ctx.restore();
  };
}

// Jitter em polyline (line/arrow): insere pontos intermediários com deslocamento
// perpendicular seeded para criar ondulação hand-drawn visível.
function createJitteredPolyline(points: number[], sloppiness: number, seed: string): number[] {
  if (!points || points.length < 4 || sloppiness <= 0) return points;

  // Nível 1: pouca ondulação; Nível 2: bastante rough
  const samplesPerSegment = sloppiness === 1 ? 8 : 16;
  const baseFactor = sloppiness === 1 ? 0.04 : 0.09;

  const segmentCount = points.length / 2 - 1;
  const out: number[] = [];

  for (let seg = 0; seg < segmentCount; seg++) {
    const x1 = points[seg * 2];
    const y1 = points[seg * 2 + 1];
    const x2 = points[seg * 2 + 2];
    const y2 = points[seg * 2 + 3];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    if (!isFinite(segLen) || segLen <= 0) {
      if (seg === 0) out.push(x1, y1);
      continue;
    }
    // Vetor perpendicular unitário
    const perpX = -(y2 - y1) / segLen;
    const perpY = (x2 - x1) / segLen;
    const amp = Math.max(1, segLen * baseFactor);

    // Primeiro ponto do segmento (sem jitter para que a polyline seja contígua)
    if (seg === 0) out.push(x1, y1);

    // Pontos intermediários com jitter perpendicular
    for (let s = 1; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      // Ruído que cai a zero nos extremos para não deslocar endpoints
      const envelope = Math.sin(t * Math.PI); // 0 → 1 → 0
      const noiseIdx = seg * 1000 + s;
      const d = seededNoise(seed, noiseIdx) * amp * envelope;
      out.push(px + perpX * d, py + perpY * d);
    }
  }
  // Último ponto sempre sem jitter
  out.push(points[points.length - 2], points[points.length - 1]);
  return out;
}

interface CanvasProps {
  activeTool: Tool;
  elements: WhiteboardElement[];
  setElements: React.Dispatch<React.SetStateAction<WhiteboardElement[]>>;
  saveHistory: (newElements: WhiteboardElement[], customPastState?: WhiteboardElement[]) => void;
  undo: () => void;
  redo: () => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  defaultProps: Partial<WhiteboardElement>;
  zoom: number;
  stagePosition: { x: number; y: number };
  setStagePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  canvasBackground?: string;
}

const ImageElement = ({ el, activeTool, onDragEnd, onTransformEnd, onClick }: any) => {
  const [img] = useImage(el.src);
  return (
    <KonvaImage
      id={el.id}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity ?? 1}
      cornerRadius={el.edges === 'round' ? 10 : 0}
      draggable={activeTool === 'select'}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onClick={onClick}
    />
  );
};

export const Canvas: React.FC<CanvasProps> = ({
  activeTool,
  elements,
  setElements,
  saveHistory,
  undo,
  redo,
  selectedIds,
  setSelectedIds,
  defaultProps,
  zoom,
  stagePosition,
  setStagePosition,
  canvasBackground = 'bg-gray-50',
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const resolveStroke = useCallback((s: string) => resolveStrokeForTheme(s, isDark), [isDark]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0, visible: false });
  const [newElement, setNewElement] = useState<WhiteboardElement | null>(null);
  const newElementRef = useRef<WhiteboardElement | null>(null);
  const [eraserSnapshot, setEraserSnapshot] = useState<WhiteboardElement[] | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [draggingControlPoint, setDraggingControlPoint] = useState<{ elementId: string; pointIndex: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const elementsRef = useRef(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    const handleAddImage = async (e: any) => {
      const { src } = e.detail;
      const id = nanoid();
      const element: WhiteboardElement = {
        id,
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        src,
        stroke: 'transparent',
        fill: 'transparent',
        strokeWidth: 0,
        rotation: 0,
        strokeStyle: 'solid',
        sloppiness: 0,
        edges: 'sharp',
        opacity: 1,
        arrowType: 'simple',
        arrowheads: true,
        arrowBreakPoints: 3,
        arrowheadTail: false,
        arrowheadStyle: 'triangle',
        fontFamily: 'Sans-serif',
        fontSize: 20,
        textAlign: 'left',
        ...defaultProps
      };
      saveHistory([...elementsRef.current, element]);
      setSelectedIds([id]);
    };
    window.addEventListener('add-image', handleAddImage);
    return () => window.removeEventListener('add-image', handleAddImage);
  }, [saveHistory, setSelectedIds, defaultProps]);

  const getRelativePointerPosition = (stage: Konva.Stage) => {
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    return pos ? transform.point(pos) : { x: 0, y: 0 };
  };

  const handleEraser = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const shape = stage.getIntersection(pos);
    if (shape && shape.id()) {
      const id = shape.id();
      setElements((prev) => prev.filter((el) => el.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    }
  }, [setElements, setSelectedIds]);

  const handleTextInput = useCallback((x: number, y: number, id: string, initialText = '', onEditEnd?: () => void) => {
    const stage = stageRef.current;
    if (!stage) return;

    const isEditingExisting = initialText.length > 0;
    if (isEditingExisting) setEditingTextId(id);
    else setEditingTextId(null);

    const existingTextarea = document.getElementById('whiteboard-textarea');
    if (existingTextarea) {
      try {
        // Check if element still has a parent before removing
        if (existingTextarea.parentNode) {
          existingTextarea.remove();
        }
      } catch (error) {
        // Element may have already been removed, ignore error
      }
    }

    const stageBox = stage.container().getBoundingClientRect();
    const textarea = document.createElement('textarea');
    textarea.id = 'whiteboard-textarea';
    document.body.appendChild(textarea);

    textarea.value = initialText;
    textarea.style.position = 'absolute';

    const absPos = stage.getAbsoluteTransform().point({ x, y });
    const top = stageBox.top + absPos.y;
    const left = stageBox.left + absPos.x;
    const scale = stage.scaleX();

    textarea.style.top = top + 'px';
    textarea.style.left = left + 'px';
    textarea.style.fontSize = `${(defaultProps.fontSize || 20) * scale}px`;
    textarea.style.fontFamily = defaultProps.fontFamily || 'Sans-serif';
    textarea.style.fontWeight = '400';
    textarea.style.color = defaultProps.stroke || (isDark ? DEFAULT_STROKE_DARK : DEFAULT_STROKE_LIGHT);
    (textarea.style as any).webkitFontSmoothing = 'antialiased';
    (textarea.style as any).mozOsxFontSmoothing = 'grayscale';

    textarea.style.boxSizing = 'border-box';
    textarea.style.outline = 'none';
    textarea.style.zIndex = '9999';
    textarea.style.background = 'transparent';
    textarea.style.minWidth = '20px';
    textarea.style.minHeight = '1.2em';
    textarea.style.padding = '0';
    textarea.style.margin = '0';
    textarea.style.display = 'block';
    textarea.style.visibility = 'visible';
    textarea.style.opacity = '1';
    textarea.style.overflow = 'hidden';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = '1.2';
    textarea.style.whiteSpace = 'pre';
    textarea.style.transformOrigin = 'top left';
    textarea.style.transform = `scale(${scale})`;

    const autoResize = () => {
      textarea.style.width = '1px';
      // Add 5px buffer to prevent clipping
      textarea.style.width = (textarea.scrollWidth + 5) + 'px';
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    textarea.addEventListener('input', autoResize);
    autoResize();

    setTimeout(() => {
      textarea.focus();
    }, 0);

    let isFinished = false;
    const finishText = async () => {
      if (isFinished) return;
      isFinished = true;

      const val = textarea.value;
      // Add 5px buffer before dividing by scale to prevent clipping
      const finalWidth = Math.max((textarea.offsetWidth + 5) / scale, 5);
      const finalHeight = Math.max((textarea.offsetHeight) / scale, 5);

      try {
        if (textarea.parentNode && document.body.contains(textarea)) {
          document.body.removeChild(textarea);
        }
      } catch (error) {
        // Element may have already been removed, ignore error
      }

      if (val.trim()) {
        const element: WhiteboardElement = {
          id,
          type: 'text',
          x,
          y,
          text: val,
          width: finalWidth,
          height: finalHeight,
          stroke: defaultProps.stroke || (isDark ? DEFAULT_STROKE_DARK : DEFAULT_STROKE_LIGHT),
          fill: 'transparent',
          strokeWidth: 2,
          rotation: 0,
          strokeStyle: 'solid',
          sloppiness: 1,
          edges: 'sharp',
          opacity: 1,
          fontFamily: defaultProps.fontFamily || 'Sans-serif',
          fontSize: defaultProps.fontSize || 20,
          textAlign: defaultProps.textAlign || 'left',
          ...defaultProps
        } as WhiteboardElement;

        const currentElements = elementsRef.current;
        const existingIndex = currentElements.findIndex(el => el.id === id);
        if (existingIndex !== -1) {
          const newArr = [...currentElements];
          newArr[existingIndex] = element;
          saveHistory(newArr);
        } else {
          saveHistory([...currentElements, element]);
        }
        setSelectedIds([id]);
      }
      onEditEnd?.();
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishText();
        return;
      }
      // Evitar que Backspace/Delete cheguem ao handler global que apaga elementos
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.stopPropagation();
      }
    });
    textarea.addEventListener('blur', finishText);
  }, [defaultProps, saveHistory, setSelectedIds]);

  const handleMouseDown = useCallback((e: any) => {
    if (activeTool === 'hand') return;

    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);

    if (activeTool === 'select') {
      const isClickedOnTransformer = e.target.getParent()?.className === 'Transformer';
      if (isClickedOnTransformer) return;

      const isClickedOnEmpty = e.target === stage;
      if (isClickedOnEmpty) {
        setSelectedIds([]);
        setIsSelecting(true);
        setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0, visible: true });
      } else {
        const id = e.target.id();
        if (!id) return;

        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;

        setSelectedIds(prev => {
          const isSelected = prev.includes(id);
          if (!metaPressed && !isSelected) return [id];
          if (metaPressed && isSelected) return prev.filter((sid) => sid !== id);
          if (metaPressed && !isSelected) return [...prev, id];
          return prev;
        });
      }
      return;
    }

    if (activeTool === 'text') {
      const isClickedOnEmpty = e.target.getStage() === e.target;
      if (!isClickedOnEmpty) {
        const hitId = e.target.id();
        const hitElement = elementsRef.current.find((el) => el.id === hitId);
        if (hitElement?.type === 'text') {
          const alreadySelected = selectedIds.includes(hitId);
          if (alreadySelected) {
            setSelectedIds([]);
            handleTextInput(hitElement.x, hitElement.y, hitElement.id, hitElement.text ?? '', () => setEditingTextId(null));
          } else {
            setSelectedIds([hitId]);
          }
          return;
        }
      }
      handleTextInput(pos.x, pos.y, nanoid());
      return;
    }

    if (activeTool === 'eraser') {
      setEraserSnapshot([...elementsRef.current]);
      setIsDrawing(true);
      handleEraser();
      return;
    }

    setIsDrawing(true);
    const id = nanoid();
    const element: WhiteboardElement = {
      id,
      type: activeTool as any,
      x: pos.x,
      y: pos.y,
      stroke: defaultProps.stroke ?? (isDark ? DEFAULT_STROKE_DARK : DEFAULT_STROKE_LIGHT),
      fill: 'transparent',
      strokeWidth: 2,
      rotation: 0,
      strokeStyle: 'solid',
      sloppiness: 0,
      edges: 'sharp',
      opacity: 1,
      arrowType: 'simple',
      arrowheads: true,
      arrowBreakPoints: 3,
      arrowheadTail: false,
      arrowheadStyle: 'triangle',
      fontFamily: 'Sans-serif',
      fontSize: 20,
      textAlign: 'left',
      ...defaultProps,
      ...(activeTool === 'rectangle' && { width: 0, height: 0 }),
      ...(activeTool === 'diamond' && { width: 0, height: 0 }),
      ...(activeTool === 'circle' && { width: 0, height: 0 }),
      ...(activeTool === 'triangle' && { width: 0, height: 0 }),
      ...(activeTool === 'line' && { points: [0, 0, 0, 0] }),
      ...(activeTool === 'arrow' && { points: [0, 0, 0, 0] }),
      ...(activeTool === 'pencil' && { points: [0, 0] }),
    };

    newElementRef.current = element;
    setNewElement(element);
    setSelectedIds([id]);
  }, [activeTool, defaultProps, handleTextInput, handleEraser, setSelectedIds, selectedIds]);

  const handleMouseMove = useCallback((e: any) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);

    if (activeTool === 'eraser' && isDrawing) {
      handleEraser();
      return;
    }

    if (isSelecting) {
      setSelectionBox(prev => ({ ...prev, width: pos.x - prev.x, height: pos.y - prev.y }));
      return;
    }

    if (!isDrawing) return;

    const currentNew = newElementRef.current;
    if (!currentNew) return;

    const updatedElement = { ...currentNew };

    if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'triangle' || activeTool === 'diamond') {
      updatedElement.width = pos.x - currentNew.x;
      updatedElement.height = pos.y - currentNew.y;
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      updatedElement.points = [0, 0, pos.x - currentNew.x, pos.y - currentNew.y];
    } else if (activeTool === 'pencil') {
      updatedElement.points = [...(currentNew.points || []), pos.x - currentNew.x, pos.y - currentNew.y];
    }

    newElementRef.current = updatedElement;
    setNewElement(updatedElement);
  }, [activeTool, isDrawing, isSelecting, handleEraser]);

  const handleMouseUp = useCallback(async () => {
    if (isSelecting) {
      const box = selectionBox;
      const x1 = Math.min(box.x, box.x + box.width);
      const x2 = Math.max(box.x, box.x + box.width);
      const y1 = Math.min(box.y, box.y + box.height);
      const y2 = Math.max(box.y, box.y + box.height);

      const selected = elementsRef.current.filter((el) => {
        const elX2 = el.x + (el.width || (el.radius || 0) * 2);
        const elY2 = el.y + (el.height || (el.radius || 0) * 2);
        return x1 < elX2 && x2 > el.x && y1 < elY2 && y2 > el.y;
      }).map(el => el.id);

      setSelectedIds(selected);
      setIsSelecting(false);
      setSelectionBox(prev => ({ ...prev, visible: false }));
      return;
    }

    if (activeTool === 'eraser' && isDrawing) {
      setIsDrawing(false);
      // For eraser, we want to save history only if something was deleted
      if (eraserSnapshot && JSON.stringify(eraserSnapshot) !== JSON.stringify(elementsRef.current)) {
        saveHistory(elementsRef.current, eraserSnapshot);
      }
      setEraserSnapshot(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    const currentNew = newElementRef.current;
    if (currentNew) {
      const finalElement = { ...currentNew };
      if (['rectangle', 'circle', 'triangle', 'diamond'].includes(finalElement.type)) {
        const width = finalElement.width ?? 0;
        const height = finalElement.height ?? 0;
        if (width < 0) {
          finalElement.x = finalElement.x + width;
          finalElement.width = Math.abs(width);
        }
        if (height < 0) {
          finalElement.y = finalElement.y + height;
          finalElement.height = Math.abs(height);
        }
      }
      if (finalElement.type === 'arrow' && finalElement.points?.length === 4) {
        const n = finalElement.arrowBreakPoints ?? 3;
        const [x1, y1, x2, y2] = finalElement.points;
        const out: number[] = [];
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          out.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
        }
        finalElement.points = out;
      }

      saveHistory([...elementsRef.current, finalElement]);
    }

    newElementRef.current = null;
    setNewElement(null);
  }, [isSelecting, selectionBox, activeTool, isDrawing, eraserSnapshot, saveHistory, setSelectedIds]);

  const handleTransformEnd = useCallback((e: any) => {
    const nodes = transformerRef.current?.nodes();
    if (!nodes) return;
    const currentElements = elementsRef.current;
    const updatedElements = [...currentElements];
    for (const node of nodes) {
      const id = node.id();
      const index = updatedElements.findIndex((el) => el.id === id);
      if (index === -1) continue;
      const element = updatedElements[index];
      const updatedElement: WhiteboardElement = {
        ...element,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      };

      if (element.type === 'rectangle' || element.type === 'text' || element.type === 'image') {
        const newWidth = node.width() * node.scaleX();
        const newHeight = node.height() * node.scaleY();
        updatedElement.width = newWidth;
        updatedElement.height = newHeight;

        // For text, update fontSize proportionally to the scale
        if (element.type === 'text') {
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          // Use average scale to maintain aspect ratio, or use scaleY for vertical scaling
          const avgScale = (scaleX + scaleY) / 2;
          const currentFontSize = element.fontSize ?? 20;
          updatedElement.fontSize = Math.max(8, Math.round(currentFontSize * avgScale));
        }

        // Update node immediately so it doesn't snap back to old size before re-render
        node.width(newWidth);
        node.height(newHeight);
        node.scaleX(1);
        node.scaleY(1);
      } else if (element.type === 'circle') {
        updatedElement.width = (node as any).radiusX() * 2 * node.scaleX();
        updatedElement.height = (node as any).radiusY() * 2 * node.scaleY();
        updatedElement.x = node.x() - (updatedElement.width / 2);
        updatedElement.y = node.y() - (updatedElement.height / 2);
        node.scaleX(1);
        node.scaleY(1);
      } else if (element.type === 'triangle' || element.type === 'diamond') {
        const baseRadius = (node as any).radius();
        updatedElement.width = baseRadius * 2 * node.scaleX();
        updatedElement.height = baseRadius * 2 * node.scaleY();
        updatedElement.x = node.x() - (updatedElement.width / 2);
        updatedElement.y = node.y() - (updatedElement.height / 2);
        node.scaleX(1);
        node.scaleY(1);
      } else if (element.type === 'arrow' || element.type === 'line') {
        // For arrows and lines:
        // - Horizontal scaling (scaleX) changes the length (X coordinates of points)
        // - Vertical scaling (scaleY) changes the thickness (strokeWidth)
        const points = element.points || [0, 0, 0, 0];
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Scale X coordinates for length
        const scaledPoints = points.map((p, idx) => {
          if (idx % 2 === 0) {
            // X coordinate - affects length
            return p * scaleX;
          } else {
            // Y coordinate - keep original for shape, but we'll adjust strokeWidth instead
            return p;
          }
        });

        updatedElement.points = scaledPoints;

        // Scale strokeWidth based on vertical scaling (grossura)
        const currentStrokeWidth = element.strokeWidth || 2;
        const newStrokeWidth = Math.max(1, Math.round(currentStrokeWidth * scaleY));
        updatedElement.strokeWidth = newStrokeWidth;

        // Reset scale
        node.scaleX(1);
        node.scaleY(1);
      }

      updatedElements[index] = updatedElement;
    }
    saveHistory(updatedElements);
  }, [saveHistory]);

  const handleDragEnd = useCallback(async (e: any) => {
    const id = e.target.id();
    const currentElements = elementsRef.current;
    const element = currentElements.find((el) => el.id === id);
    if (element) {
      let nx = e.target.x();
      let ny = e.target.y();

      if (element.type === 'circle' || element.type === 'triangle' || element.type === 'diamond') {
        nx -= (element.width || 0) / 2;
        ny -= (element.height || 0) / 2;
      }

      const updatedElement = { ...element, x: nx, y: ny };
      const updatedElements = currentElements.map((el) => el.id === id ? updatedElement : el);
      saveHistory(updatedElements);
    }
  }, [saveHistory]);

  const [stageSize, setStageSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 1000,
  });

  useEffect(() => {
    const handleResize = () => setStageSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update stage position when stagePosition prop changes (but not during drag)
  // Note: Initial position is set via x/y props on Stage
  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (isDraggingRef.current) return; // Don't update during drag
    const stage = stageRef.current;
    if (stage) {
      const currentPos = stage.position();
      // Only update if position actually changed to avoid unnecessary updates
      if (currentPos.x !== stagePosition.x || currentPos.y !== stagePosition.y) {
        stage.position(stagePosition);
      }
    }
  }, [stagePosition]);

  // Handle stage drag start
  const handleStageDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // Handle stage drag end to save position
  const handleStageDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    const stage = stageRef.current;
    if (stage) {
      const pos = stage.position();
      setStagePosition({ x: pos.x, y: pos.y });
    }
  }, [setStagePosition]);

  // Also save position during drag
  const handleStageDragMove = useCallback(() => {
    const stage = stageRef.current;
    if (stage) {
      const pos = stage.position();
      setStagePosition({ x: pos.x, y: pos.y });
    }
  }, [setStagePosition]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const oldScale = stage.scaleX();
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };

        const scaleBy = 1.1;
        const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
        const clampedScale = Math.min(Math.max(0.1, newScale), 5);

        // Update zoom state in parent via a custom event since we can't easily call setZoom here
        window.dispatchEvent(new CustomEvent('update-zoom', { detail: { zoom: clampedScale } }));

        const newPos = {
          x: pointer.x - mousePointTo.x * clampedScale,
          y: pointer.y - mousePointTo.y * clampedScale,
        };
        stage.position(newPos);
        // Save position after zoom
        setStagePosition(newPos);
      }
    };

    const container = stageRef.current?.container();
    container?.addEventListener('wheel', handleWheel, { passive: false });
    return () => container?.removeEventListener('wheel', handleWheel);
  }, [zoom, setStagePosition]);

  useEffect(() => {
    if (transformerRef.current) {
      const nodes = selectedIds.map(id => stageRef.current?.findOne('#' + id)).filter(Boolean);
      transformerRef.current.nodes(nodes as Konva.Node[]);
    }
  }, [selectedIds, elements]);

  const [clipboard, setClipboard] = useState<WhiteboardElement[]>([]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT';
      const isWhiteboardTextarea = document.getElementById('whiteboard-textarea');
      if (isInput || isWhiteboardTextarea) return;

      // DELETE / BACKSPACE
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        const newElements = elements.filter(el => !selectedIds.includes(el.id));
        saveHistory(newElements);
        setSelectedIds([]);
        return;
      }

      // CTRL + C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selected = elements.filter(el => selectedIds.includes(el.id));
        if (selected.length > 0) {
          setClipboard(JSON.parse(JSON.stringify(selected))); // Deep clone
          console.log('Copied', selected.length, 'elements');
        }
        return;
      }

      // CTRL + V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboard.length === 0) return;

        const offset = 20;
        const newPastedElements = clipboard.map(el => ({
          ...el,
          id: nanoid(),
          x: el.x + offset,
          y: el.y + offset,
        }));

        saveHistory([...elements, ...newPastedElements]);
        setSelectedIds(newPastedElements.map(el => el.id));
        setClipboard(newPastedElements);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, clipboard, saveHistory, setSelectedIds]);

  const getDash = (style: string) => {
    if (style === 'dashed') return [10, 5];
    if (style === 'dotted') return [2, 5];
    return [];
  };

  // Calculate control points for arrows and lines (supports 3, 5, or 8 break points)
  const getControlPoints = useCallback((element: WhiteboardElement) => {
    const points = element.points || [0, 0, 0, 0];
    const len = points.length;
    if (len < 4 || len % 2 !== 0) return null;
    const n = len / 2;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      pts.push({
        x: element.x + points[i * 2],
        y: element.y + points[i * 2 + 1]
      });
    }
    return {
      points: pts,
      isCurved: len > 4
    };
  }, []);

  // Handle control point drag
  const handleControlPointDragStart = useCallback((elementId: string, pointIndex: number) => {
    setDraggingControlPoint({ elementId, pointIndex });
  }, []);

  const handleControlPointDrag = useCallback((e: any, elementId: string, pointIndex: number) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    const currentElements = elementsRef.current;
    const element = currentElements.find(el => el.id === elementId);
    if (!element || (element.type !== 'arrow' && element.type !== 'line')) return;

    const points = element.points || [0, 0, 0, 0];
    const n = points.length / 2;
    if (pointIndex < 0 || pointIndex >= n) return;

    const newPoints = [...points];
    newPoints[pointIndex * 2] = pos.x - element.x;
    newPoints[pointIndex * 2 + 1] = pos.y - element.y;

    const updatedElements = currentElements.map(el =>
      el.id === elementId ? { ...el, points: newPoints } : el
    );
    setElements(updatedElements);
    elementsRef.current = updatedElements;
  }, [setElements]);

  const handleControlPointDragEnd = useCallback(() => {
    // Save to history when drag ends
    const currentElements = elementsRef.current;
    saveHistory(currentElements);
    setDraggingControlPoint(null);
  }, [saveHistory]);

  return (
    <div className={`w-full h-screen ${canvasBackground} overflow-hidden`}>
      <Stage
        width={stageSize.width} height={stageSize.height}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onDragStart={handleStageDragStart}
        onDragEnd={handleStageDragEnd}
        onDragMove={handleStageDragMove}
        ref={stageRef} draggable={(activeTool as string) === 'hand'}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePosition.x}
        y={stagePosition.y}
        style={{ cursor: activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair' }}
      >
        <Layer>
          {elements.map((el) => {
            const commonProps: any = {
              id: el.id, x: el.x, y: el.y, stroke: resolveStroke(el.stroke), strokeWidth: el.strokeWidth,
              fill: el.fill, rotation: el.rotation, opacity: el.opacity ?? 1,
              dash: getDash(el.strokeStyle),
              lineJoin: el.edges === 'round' ? 'round' : 'miter',
              lineCap: el.edges === 'round' ? 'round' : 'butt',
              hitStrokeWidth: 10,
              draggable: (activeTool as string) === 'select',
              onDragEnd: handleDragEnd,
              onClick: (e: any) => {
                if ((activeTool as string) === 'select') {
                  const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
                  if (!metaPressed && !selectedIds.includes(el.id)) setSelectedIds([el.id]);
                  else if (metaPressed && selectedIds.includes(el.id)) setSelectedIds(selectedIds.filter(sid => sid !== el.id));
                  else if (metaPressed) setSelectedIds([...selectedIds, el.id]);
                }
              }
            };

            if (el.type === 'rectangle') {
              const slop = el.sloppiness ?? 0;
              const w = el.width ?? 0;
              const h = el.height ?? 0;
              if (slop > 0) {
                const sceneFunc = createPencilSceneFunc('rectangle', w, h, resolveStroke(el.stroke), el.fill ?? 'transparent', el.strokeWidth, getDash(el.strokeStyle), el.edges === 'round' ? 'round' : 'miter', el.edges === 'round' ? 'round' : 'butt', slop, el.id, el.edges === 'round' ? 10 : 0);
                const hitFunc = (ctx: Konva.Context, sh: Konva.Shape) => { ctx._context.beginPath(); ctx._context.rect(0, 0, w, h); ctx._context.closePath(); ctx.fillStrokeShape(sh); };
                return <Shape key={el.id} {...commonProps} width={w} height={h} sceneFunc={sceneFunc} hitFunc={hitFunc} />;
              }
              return <Rect key={el.id} {...commonProps} width={w} height={h} cornerRadius={el.edges === 'round' ? 10 : 0} />;
            }
            if (el.type === 'circle') {
              const slop = el.sloppiness ?? 0;
              const rw = Math.max(Math.abs(el.width ?? 0), 1);
              const rh = Math.max(Math.abs(el.height ?? 0), 1);
              if (slop > 0) {
                const sceneFunc = createPencilSceneFunc('circle', rw, rh, resolveStroke(el.stroke), el.fill ?? 'transparent', el.strokeWidth, getDash(el.strokeStyle), el.edges === 'round' ? 'round' : 'miter', el.edges === 'round' ? 'round' : 'butt', slop, el.id, 0);
                const hitFunc = (ctx: Konva.Context, sh: Konva.Shape) => { ctx._context.beginPath(); ctx._context.rect(-rw / 2, -rh / 2, rw, rh); ctx._context.closePath(); ctx.fillStrokeShape(sh); };
                return <Shape key={el.id} {...commonProps} x={el.x + rw / 2} y={el.y + rh / 2} offsetX={rw / 2} offsetY={rh / 2} width={rw} height={rh} sceneFunc={sceneFunc} hitFunc={hitFunc} />;
              }
              return <Ellipse key={el.id} {...commonProps} radiusX={rw / 2} radiusY={rh / 2} x={el.x + rw / 2} y={el.y + rh / 2} />;
            }
            if (el.type === 'diamond') {
              const slop = el.sloppiness ?? 0;
              const rw = Math.max(Math.abs(el.width ?? 0), 1);
              const rh = Math.max(Math.abs(el.height ?? 0), 1);
              if (slop > 0) {
                const sceneFunc = createPencilSceneFunc('diamond', rw, rh, resolveStroke(el.stroke), el.fill ?? 'transparent', el.strokeWidth, getDash(el.strokeStyle), el.edges === 'round' ? 'round' : 'miter', el.edges === 'round' ? 'round' : 'butt', slop, el.id, 0);
                const hitFunc = (ctx: Konva.Context, sh: Konva.Shape) => { ctx._context.beginPath(); ctx._context.rect(-rw / 2, -rh / 2, rw, rh); ctx._context.closePath(); ctx.fillStrokeShape(sh); };
                return <Shape key={el.id} {...commonProps} x={el.x + rw / 2} y={el.y + rh / 2} offsetX={rw / 2} offsetY={rh / 2} width={rw} height={rh} sceneFunc={sceneFunc} hitFunc={hitFunc} />;
              }
              return <RegularPolygon key={el.id} {...commonProps} sides={4} radius={rw / 2} scaleY={rh / rw} x={el.x + rw / 2} y={el.y + rh / 2} />;
            }
            if (el.type === 'triangle') {
              const slop = el.sloppiness ?? 0;
              const rw = Math.max(Math.abs(el.width ?? 0), 1);
              const rh = Math.max(Math.abs(el.height ?? 0), 1);
              if (slop > 0) {
                const sceneFunc = createPencilSceneFunc('triangle', rw, rh, resolveStroke(el.stroke), el.fill ?? 'transparent', el.strokeWidth, getDash(el.strokeStyle), el.edges === 'round' ? 'round' : 'miter', el.edges === 'round' ? 'round' : 'butt', slop, el.id, 0);
                const hitFunc = (ctx: Konva.Context, sh: Konva.Shape) => { ctx._context.beginPath(); ctx._context.rect(-rw / 2, -rh / 2, rw, rh); ctx._context.closePath(); ctx.fillStrokeShape(sh); };
                return <Shape key={el.id} {...commonProps} x={el.x + rw / 2} y={el.y + rh / 2} offsetX={rw / 2} offsetY={rh / 2} width={rw} height={rh} sceneFunc={sceneFunc} hitFunc={hitFunc} />;
              }
              return <RegularPolygon key={el.id} {...commonProps} sides={3} radius={rw / 2} scaleY={rh / rw} x={el.x + rw / 2} y={el.y + rh / 2} />;
            }
            if (el.type === 'line' || el.type === 'pencil') {
              const slop = el.sloppiness ?? 0;
              let points = el.points || [];
              if (slop > 0 && el.type === 'line') {
                points = createJitteredPolyline(points, slop, el.id);
              }
              // Use tension for curved lines (6 points) or pencil
              const tension = el.type === 'pencil' ? 0.5 : (points.length === 6 ? 0.5 : 0);
              return <Line key={el.id} {...commonProps} points={points} tension={tension} />;
            }
            if (el.type === 'arrow') {
              const slop = el.sloppiness ?? 0;
              let points = el.points || [];
              if (slop > 0) {
                points = createJitteredPolyline(points, slop, el.id);
              }
              const tension = points.length > 4 ? 0.5 : 0;
              const style = el.arrowheadStyle ?? 'triangle';
              const useNativePointer = style === 'triangle';
              const strokeColor = resolveStroke(el.stroke);
              const headSize = (el.strokeWidth ?? 2) * 3;
              const showHead = el.arrowheads ?? true;
              const showTail = el.arrowheadTail ?? false;
              const arrowType = el.arrowType ?? 'simple';
              if (useNativePointer) {
                if (arrowType === 'double' && points.length >= 4) {
                  const x1 = points[0] ?? 0;
                  const y1 = points[1] ?? 0;
                  const x2 = points[points.length - 2] ?? 0;
                  const y2 = points[points.length - 1] ?? 0;
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const len = Math.hypot(dx, dy) || 1;
                  const ux = dx / len;
                  const uy = dy / len;
                  const nx = -uy;
                  const ny = ux;
                  const offset = Math.max(3, (el.strokeWidth ?? 2) * 1.5);
                  const offsetPoints = (sign: 1 | -1) =>
                    points.map((p, idx) => (idx % 2 === 0 ? p + nx * offset * sign : p + ny * offset * sign));
                  const ptsA = offsetPoints(1);
                  const ptsB = offsetPoints(-1);
                  // Direção da última perna para orientar a "cabeça" da ponta final
                  const lx1 = points.length >= 4 ? (points[points.length - 4] ?? x1) : x1;
                  const ly1 = points.length >= 4 ? (points[points.length - 3] ?? y1) : y1;
                  const ldx = x2 - lx1;
                  const ldy = y2 - ly1;
                  const llen = Math.hypot(ldx, ldy) || 1;
                  const lux = ldx / llen;
                  const luy = ldy / llen;
                  const headBack = Math.max(8, (el.strokeWidth ?? 2) * 4);
                  const baseX = x2 - lux * headBack;
                  const baseY = y2 - luy * headBack;
                  const headPoints = [baseX, baseY, x2, y2];
                  // Direção da primeira perna para orientar a "cabeça" do tail
                  const fx2 = points.length >= 4 ? (points[2] ?? x2) : x2;
                  const fy2 = points.length >= 4 ? (points[3] ?? y2) : y2;
                  const fdx = fx2 - x1;
                  const fdy = fy2 - y1;
                  const flen = Math.hypot(fdx, fdy) || 1;
                  const fux = fdx / flen;
                  const fuy = fdy / flen;
                  const tailBaseX = x1 + fux * headBack;
                  const tailBaseY = y1 + fuy * headBack;
                  const tailPoints = [tailBaseX, tailBaseY, x1, y1];
                  const trimSegment = (
                    pts: number[],
                    startX: number,
                    startY: number,
                    endX: number,
                    endY: number
                  ) => {
                    if (pts.length < 4) return pts;
                    const out = pts.slice();
                    // início
                    out[0] = startX;
                    out[1] = startY;
                    // fim
                    out[out.length - 2] = endX;
                    out[out.length - 1] = endY;
                    return out;
                  };
                  const ptsATrim = trimSegment(
                    ptsA,
                    tailBaseX + nx * offset,
                    tailBaseY + ny * offset,
                    baseX + nx * offset,
                    baseY + ny * offset
                  );
                  const ptsBTrim = trimSegment(
                    ptsB,
                    tailBaseX - nx * offset,
                    tailBaseY - ny * offset,
                    baseX - nx * offset,
                    baseY - ny * offset
                  );
                  return (
                    <Group key={el.id} {...commonProps}>
                      <Line
                        x={0}
                        y={0}
                        points={ptsATrim}
                        stroke={strokeColor}
                        strokeWidth={el.strokeWidth}
                        tension={tension}
                        dash={getDash(el.strokeStyle)}
                        lineJoin={el.edges === 'round' ? 'round' : 'miter'}
                        lineCap={el.edges === 'round' ? 'round' : 'butt'}
                        hitStrokeWidth={10}
                      />
                      <Line
                        x={0}
                        y={0}
                        points={ptsBTrim}
                        stroke={strokeColor}
                        strokeWidth={el.strokeWidth}
                        tension={tension}
                        dash={getDash(el.strokeStyle)}
                        lineJoin={el.edges === 'round' ? 'round' : 'miter'}
                        lineCap={el.edges === 'round' ? 'round' : 'butt'}
                        hitStrokeWidth={10}
                      />
                      {showHead && (
                        <Arrow
                          x={0}
                          y={0}
                          points={headPoints}
                          stroke={strokeColor}
                          strokeWidth={el.strokeWidth}
                          fill={strokeColor}
                          pointerAtEnding={true}
                          pointerAtBeginning={false}
                          tension={0}
                          dash={undefined}
                          lineJoin={el.edges === 'round' ? 'round' : 'miter'}
                          lineCap={el.edges === 'round' ? 'round' : 'butt'}
                          hitStrokeWidth={10}
                        />
                      )}
                      {showTail && (
                        <Arrow
                          x={0}
                          y={0}
                          points={tailPoints}
                          stroke={strokeColor}
                          strokeWidth={el.strokeWidth}
                          fill={strokeColor}
                          pointerAtEnding={true}
                          pointerAtBeginning={false}
                          tension={0}
                          dash={undefined}
                          lineJoin={el.edges === 'round' ? 'round' : 'miter'}
                          lineCap={el.edges === 'round' ? 'round' : 'butt'}
                          hitStrokeWidth={10}
                        />
                      )}
                    </Group>
                  );
                }
                return (
                  <Arrow
                    key={el.id}
                    {...commonProps}
                    points={points}
                    fill={strokeColor}
                    pointerAtEnding={showHead}
                    pointerAtBeginning={showTail}
                    tension={tension}
                  />
                );
              }
              const headX = points.length >= 2 ? points[points.length - 2] : 0;
              const headY = points.length >= 2 ? points[points.length - 1] : 0;
              const tailX = points[0] ?? 0;
              const tailY = points[1] ?? 0;
              return (
                <Group key={el.id} {...commonProps}>
                  <Arrow x={0} y={0} points={points} stroke={strokeColor} strokeWidth={el.strokeWidth} fill={strokeColor} pointerAtEnding={false} pointerAtBeginning={false} pointerLength={0} tension={tension} dash={getDash(el.strokeStyle)} lineJoin={el.edges === 'round' ? 'round' : 'miter'} lineCap={el.edges === 'round' ? 'round' : 'butt'} hitStrokeWidth={10} />
                  {showHead && style === 'circle' && <Circle x={headX} y={headY} radius={headSize} fill={strokeColor} stroke={strokeColor} strokeWidth={el.strokeWidth} />}
                  {showHead && style === 'diamond' && <RegularPolygon x={headX} y={headY} sides={4} radius={headSize} fill={strokeColor} stroke={strokeColor} strokeWidth={el.strokeWidth} rotation={45} />}
                  {showTail && style === 'circle' && <Circle x={tailX} y={tailY} radius={headSize} fill={strokeColor} stroke={strokeColor} strokeWidth={el.strokeWidth} />}
                  {showTail && style === 'diamond' && <RegularPolygon x={tailX} y={tailY} sides={4} radius={headSize} fill={strokeColor} stroke={strokeColor} strokeWidth={el.strokeWidth} rotation={45} />}
                </Group>
              );
            }
            if (el.type === 'text') {
              if (el.id === editingTextId) return null;
              return <Text key={el.id} {...commonProps} strokeWidth={0} fill={resolveStroke(el.stroke)} text={el.text ?? ''} fontSize={el.fontSize ?? 20} fontFamily={el.fontFamily ?? 'Sans-serif'} fontStyle="normal" lineHeight={1.2} align={el.textAlign ?? 'left'} width={el.width ?? 0} height={el.height ?? 0} onDblClick={(e) => handleTextInput(el.x, el.y, el.id, el.text ?? '', () => setEditingTextId(null))} />;
            }
            if (el.type === 'image') return <ImageElement key={el.id} el={el} activeTool={activeTool} {...commonProps} />;
            return null;
          })}

          {newElement && (
            <>
              {newElement.type === 'rectangle' && (
                <Rect
                  x={newElement.x} y={newElement.y} width={newElement.width ?? 0} height={newElement.height ?? 0}
                  stroke={resolveStroke(newElement.stroke)} strokeWidth={newElement.strokeWidth}
                  fill={newElement.fill} opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                  cornerRadius={newElement.edges === 'round' ? 10 : 0}
                />
              )}
              {newElement.type === 'circle' && (
                <Ellipse
                  x={newElement.x + (newElement.width ?? 0) / 2} y={newElement.y + (newElement.height ?? 0) / 2}
                  radiusX={Math.abs((newElement.width ?? 0) / 2)} radiusY={Math.abs((newElement.height ?? 0) / 2)}
                  stroke={resolveStroke(newElement.stroke)} strokeWidth={newElement.strokeWidth}
                  fill={newElement.fill} opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                />
              )}
              {newElement.type === 'triangle' && (
                <RegularPolygon
                  x={newElement.x + (newElement.width ?? 0) / 2} y={newElement.y + (newElement.height ?? 0) / 2}
                  sides={3} radius={Math.abs(newElement.width ?? 0) / 2} scaleY={Math.abs((newElement.height ?? 0) / (Math.max(Math.abs(newElement.width ?? 0), 1)))}
                  stroke={resolveStroke(newElement.stroke)} strokeWidth={newElement.strokeWidth}
                  fill={newElement.fill} opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                />
              )}
              {newElement.type === 'diamond' && (
                <RegularPolygon
                  x={newElement.x + (newElement.width ?? 0) / 2} y={newElement.y + (newElement.height ?? 0) / 2}
                  sides={4} radius={Math.abs(newElement.width ?? 0) / 2} scaleY={Math.abs((newElement.height ?? 0) / (Math.max(Math.abs(newElement.width ?? 0), 1)))}
                  stroke={resolveStroke(newElement.stroke)} strokeWidth={newElement.strokeWidth}
                  fill={newElement.fill} opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                />
              )}
              {(newElement.type === 'line' || newElement.type === 'pencil' || newElement.type === 'arrow') && (
                <Line
                  x={newElement.x} y={newElement.y} points={newElement.points || []}
                  stroke={resolveStroke(newElement.stroke)} strokeWidth={newElement.strokeWidth}
                  opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                  tension={newElement.type === 'pencil' ? 0.5 : 0}
                />
              )}
            </>
          )}

          {selectionBox.visible && <Rect x={selectionBox.x} y={selectionBox.y} width={selectionBox.width} height={selectionBox.height} fill="rgba(0, 161, 255, 0.3)" stroke="#00a1ff" strokeWidth={1} />}

          {/* Control points for arrows and lines */}
          {selectedIds.length > 0 && activeTool === 'select' && selectedIds.map(id => {
            const element = elements.find(el => el.id === id);
            if (!element || (element.type !== 'arrow' && element.type !== 'line')) return null;

            const controlPoints = getControlPoints(element);
            if (!controlPoints) return null;

            return (
              <React.Fragment key={`controls-${id}`}>
                {controlPoints.points.map((pt, idx) => (
                  <Circle
                    key={`${id}-${idx}`}
                    x={pt.x}
                    y={pt.y}
                    radius={6}
                    fill="#00a1ff"
                    stroke="#ffffff"
                    strokeWidth={2}
                    draggable
                    onDragStart={(e) => {
                      e.cancelBubble = true;
                      handleControlPointDragStart(id, idx);
                    }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      handleControlPointDrag(e, id, idx);
                    }}
                    onDragEnd={(e) => {
                      e.cancelBubble = true;
                      handleControlPointDragEnd();
                    }}
                    onClick={(e) => {
                      e.cancelBubble = true;
                    }}
                    hitStrokeWidth={10}
                    listening={true}
                  />
                ))}
              </React.Fragment>
            );
          })}

          {selectedIds.length > 0 && activeTool === 'select' && (
            <Transformer ref={transformerRef} onTransformEnd={handleTransformEnd} />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

