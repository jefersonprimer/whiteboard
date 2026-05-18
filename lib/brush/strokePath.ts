import { clamp, distance, normalize } from './math';

export interface WidthPoint {
  x: number;
  y: number;
  width: number;
}

export interface StrokeRenderData {
  samples: WidthPoint[];
  smoothed: WidthPoint[];
  outline: number[];
}

/** Unpack flat points + parallel widths into structured samples. */
export function unpackStroke(
  flatPoints: number[],
  pointWidths: number[],
): WidthPoint[] {
  const count = flatPoints.length / 2;
  const out: WidthPoint[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: flatPoints[i * 2],
      y: flatPoints[i * 2 + 1],
      width: pointWidths[i] ?? pointWidths[pointWidths.length - 1] ?? 2,
    });
  }
  return out;
}

export function buildStrokeRenderData(
  flatPoints: number[],
  pointWidths: number[],
): StrokeRenderData {
  const samples = unpackStroke(flatPoints, pointWidths);
  const smoothed = smoothCenterline(samples);
  const outline = getStrokeOutline(smoothed);
  return { samples, smoothed, outline };
}

/**
 * Insert midpoints for smoother quadratic-curve centerlines (Chaikin-style, one pass).
 */
export function smoothCenterline(points: WidthPoint[]): WidthPoint[] {
  if (points.length < 3) return points;

  const out: WidthPoint[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    const mw = (p0.width + p1.width) / 2;
    out.push({ x: mx, y: my, width: mw });
    if (i === points.length - 2) {
      out.push(p1);
    }
  }
  return out;
}

/** Build a closed polygon outline for a variable-width stroke (ink fill). */
export function getStrokeOutline(points: WidthPoint[]): number[] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    return circlePolygon(points[0].x, points[0].y, points[0].width / 2, 12);
  }

  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(i - 1, 0)];
    const curr = points[i];
    const next = points[Math.min(i + 1, points.length - 1)];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const { x: ux, y: uy } = normalize(dx, dy);
    const nx = -uy;
    const ny = ux;
    const r = curr.width / 2;

    left.push({ x: curr.x + nx * r, y: curr.y + ny * r });
    right.push({ x: curr.x - nx * r, y: curr.y - ny * r });
  }

  const outline: number[] = [];
  for (const p of left) outline.push(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) {
    outline.push(right[i].x, right[i].y);
  }
  return outline;
}

function circlePolygon(cx: number, cy: number, r: number, segments: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return out;
}

/** Draw variable-width stroke with quadratic Bézier segments along the centerline. */
export function drawVariableWidthStroke(
  ctx: CanvasRenderingContext2D,
  renderData: StrokeRenderData,
  color: string,
  opacity: number,
): void {
  const { samples, outline } = renderData;
  if (samples.length === 0) return;

  ctx.save();
  if (outline.length < 6) {
    const p = samples[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(outline[0], outline[1]);
  for (let i = 2; i < outline.length; i += 2) {
    ctx.lineTo(outline[i], outline[i + 1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.fill();
  ctx.restore();
}

/** Quadratic centerline path (for optional stroke preview / hit testing). */
export function traceQuadraticCenterline(
  ctx: CanvasRenderingContext2D,
  points: WidthPoint[],
): void {
  if (points.length < 2) return;
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

/** Hit-test: distance from point to polyline centerline. */
export function distanceToStroke(
  flatPoints: number[],
  px: number,
  py: number,
  maxDistance: number,
): boolean {
  for (let i = 0; i < flatPoints.length - 2; i += 2) {
    const x1 = flatPoints[i];
    const y1 = flatPoints[i + 1];
    const x2 = flatPoints[i + 2];
    const y2 = flatPoints[i + 3];
    const d = distToSegment(px, py, x1, y1, x2, y2);
    if (d <= maxDistance) return true;
  }
  return false;
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = clamp(t, 0, 1);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return distance(px, py, projX, projY);
}
