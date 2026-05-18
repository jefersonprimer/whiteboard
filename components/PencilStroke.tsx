'use client';

import React, { useMemo } from 'react';
import { Shape } from 'react-konva';
import Konva from 'konva';
import { drawVariableWidthStroke, getStrokeOutline, unpackStroke } from '@/lib/brush';

export interface PencilStrokeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getPencilStrokeBounds(
  points: number[],
  pointWidths: number[],
  minSize = 1,
): PencilStrokeBounds {
  if (points.length < 2) {
    return { x: 0, y: 0, width: minSize, height: minSize };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i += 2) {
    const x = points[i] ?? 0;
    const y = points[i + 1] ?? 0;
    const width = Math.max(pointWidths[Math.floor(i / 2)] ?? pointWidths[pointWidths.length - 1] ?? 2, 1);
    const half = width / 2;

    minX = Math.min(minX, x - half);
    minY = Math.min(minY, y - half);
    maxX = Math.max(maxX, x + half);
    maxY = Math.max(maxY, y + half);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, minSize),
    height: Math.max(maxY - minY, minSize),
  };
}

interface PencilStrokeProps {
  id: string;
  x: number;
  y: number;
  points: number[];
  pointWidths: number[];
  stroke: string;
  opacity?: number;
  rotation?: number;
  draggable?: boolean;
  hitStrokeWidth?: number;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTap?: (e: Konva.KonvaEventObject<TouchEvent>) => void;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void;
}

export const PencilStroke: React.FC<PencilStrokeProps> = ({
  id,
  x,
  y,
  points,
  pointWidths,
  stroke,
  opacity = 1,
  rotation = 0,
  draggable,
  hitStrokeWidth = 12,
  onDragEnd,
  onClick,
  onTap,
  onTransformEnd,
}) => {
  const sceneFunc = useMemo(
    () => (ctx: Konva.Context, shape: Konva.Shape) => {
      const canvas = ctx._context;
      const samples = unpackStroke(points, pointWidths);
      drawVariableWidthStroke(canvas, samples, stroke, opacity);
      ctx.fillStrokeShape(shape);
    },
    [points, pointWidths, stroke, opacity],
  );

  const hitFunc = useMemo(
    () => (ctx: Konva.Context, shape: Konva.Shape) => {
      const samples = unpackStroke(points, pointWidths);
      const outline = getStrokeOutline(samples);
      const c = ctx._context;
      if (outline.length >= 6) {
        c.beginPath();
        c.moveTo(outline[0], outline[1]);
        for (let i = 2; i < outline.length; i += 2) {
          c.lineTo(outline[i], outline[i + 1]);
        }
        c.closePath();
      } else if (samples.length > 0) {
        c.beginPath();
        c.arc(samples[0].x, samples[0].y, Math.max(hitStrokeWidth / 2, samples[0].width / 2), 0, Math.PI * 2);
      }
      ctx.fillStrokeShape(shape);
    },
    [points, pointWidths, hitStrokeWidth],
  );

  return (
    <Shape
      id={id}
      x={x}
      y={y}
      rotation={rotation}
      draggable={draggable}
      sceneFunc={sceneFunc}
      hitFunc={hitFunc}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onTap={onTap}
      onTransformEnd={onTransformEnd}
    />
  );
};
