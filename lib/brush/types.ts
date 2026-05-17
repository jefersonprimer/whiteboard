/** A single sampled point along an in-progress or completed stroke. */
export interface StrokePoint {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  width: number;
  pressure: number;
}

/** Configuration shared by velocity-based brush engines. */
export interface VelocityBrushConfig {
  /** Toolbar brush size — minimum stroke width (px). */
  minWidth: number;
  /** Peak width when drawing slowly (px). */
  maxWidth: number;
  /** Velocity (px/ms) mapped to minimum width. */
  velocityCap: number;
  /** 0–1 lerp factor for width transitions (higher = snappier). */
  widthSmoothing: number;
  /** 0–1 lerp factor for pointer stabilization (0 = off). */
  stabilization: number;
  /** Minimum distance between stored points (px). */
  minPointDistance: number;
  /** Blend stylus pressure into width (0 = velocity only). */
  pressureInfluence: number;
  /** Apply thin taper at stroke start. */
  taperStart: boolean;
  /** Apply thin taper at stroke end. */
  taperEnd: boolean;
}

export interface BrushStrokeData {
  /** Flat [x0, y0, x1, y1, …] relative to element origin. */
  points: number[];
  /** Per-vertex width (one entry per point pair). */
  pointWidths: number[];
}

export interface BrushEngine {
  readonly config: VelocityBrushConfig;
  reset(config?: Partial<VelocityBrushConfig>): void;
  addPoint(
    x: number,
    y: number,
    timestamp: number,
    pressure?: number,
  ): StrokePoint | null;
  finalize(): BrushStrokeData;
  getStrokeData(): BrushStrokeData;
}
