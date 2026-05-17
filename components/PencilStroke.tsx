'use client';

import React, { useMemo } from 'react';
import { Shape } from 'react-konva';
import Konva from 'konva';
import { drawVariableWidthStroke, getStrokeOutline, unpackStroke } from '@/lib/brush';

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
