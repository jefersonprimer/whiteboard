import { clamp, distance, lerp } from './math';
import type {
  BrushEngine,
  BrushStrokeData,
  StrokePoint,
  VelocityBrushConfig,
} from './types';

export const DEFAULT_VELOCITY_BRUSH_CONFIG: VelocityBrushConfig = {
  minWidth: 2,
  maxWidth: 5.5,
  velocityCap: 2.8,
  widthSmoothing: 0.38,
  stabilization: 0.12,
  minPointDistance: 1.25,
  pressureInfluence: 0.45,
  taperStart: true,
  taperEnd: true,
};

export function createVelocityBrushConfig(minWidth: number): VelocityBrushConfig {
  const w = Math.max(1, minWidth);
  return {
    ...DEFAULT_VELOCITY_BRUSH_CONFIG,
    minWidth: w,
    maxWidth: w * 2.75,
    velocityCap: 1.8 + w * 0.35,
  };
}

function strokePointsToData(samples: StrokePoint[]): BrushStrokeData {
  const points: number[] = [];
  const pointWidths: number[] = [];
  for (const s of samples) {
    points.push(s.x, s.y);
    pointWidths.push(s.width);
  }
  return { points, pointWidths };
}

function computeTargetWidth(
  velocity: number,
  pressure: number,
  config: VelocityBrushConfig,
): number {
  const normalizedV = clamp(velocity / config.velocityCap, 0, 1);
  let target = lerp(config.maxWidth, config.minWidth, normalizedV);

  if (config.pressureInfluence > 0) {
    const pressureScale = lerp(0.72, 1, pressure);
    const pressureBoost = lerp(1, config.maxWidth / config.minWidth, pressureScale - 0.72);
    target = lerp(target, config.minWidth * pressureBoost, config.pressureInfluence * 0.55);
    target = clamp(target, config.minWidth, config.maxWidth);
  }

  return target;
}

function taperMultiplier(index: number, total: number, config: VelocityBrushConfig): number {
  if (total <= 1) return 1;
  let m = 1;
  if (config.taperStart) {
    const startT = Math.min(1, index / 4);
    m *= lerp(0.35, 1, startT);
  }
  if (config.taperEnd) {
    const endT = Math.min(1, (total - 1 - index) / 5);
    m *= lerp(0.4, 1, endT);
  }
  return m;
}

/**
 * Velocity-sensitive ink brush: slow strokes are thicker, fast strokes thinner.
 * Width never drops below `minWidth` (toolbar brush size).
 */
export class VelocityBrushEngine implements BrushEngine {
  private samples: StrokePoint[] = [];
  private lastWidth: number;
  private lastTimestamp: number | null = null;
  readonly config: VelocityBrushConfig;

  constructor(config: VelocityBrushConfig) {
    this.config = config;
    this.lastWidth = config.maxWidth * 0.85;
  }

  reset(config?: Partial<VelocityBrushConfig>): void {
    if (config) {
      Object.assign(this.config, config);
    }
    this.samples = [];
    this.lastWidth = this.config.maxWidth * 0.85;
    this.lastTimestamp = null;
  }

  addPoint(
    x: number,
    y: number,
    timestamp: number,
    pressure = 0.5,
  ): StrokePoint | null {
    const { config } = this;
    const last = this.samples[this.samples.length - 1];

    let sx = x;
    let sy = y;
    if (last && config.stabilization > 0) {
      const t = 1 - config.stabilization;
      sx = lerp(last.x, x, t);
      sy = lerp(last.y, y, t);
    }

    if (last) {
      const dist = distance(last.x, last.y, sx, sy);
      if (dist < config.minPointDistance) {
        return null;
      }
    }

    let velocity = 0;
    if (last && this.lastTimestamp != null) {
      const dt = Math.max(timestamp - this.lastTimestamp, 1);
      velocity = distance(last.x, last.y, sx, sy) / dt;
    }

    const targetWidth = computeTargetWidth(velocity, pressure, config);
    const smoothedWidth = lerp(this.lastWidth, targetWidth, config.widthSmoothing);
    this.lastWidth = smoothedWidth;
    this.lastTimestamp = timestamp;

    const point: StrokePoint = {
      x: sx,
      y: sy,
      timestamp,
      velocity,
      width: smoothedWidth,
      pressure,
    };
    this.samples.push(point);
    return point;
  }

  /** Apply end taper and return packed stroke data. */
  finalize(): BrushStrokeData {
    if (this.config.taperEnd && this.samples.length > 1) {
      const n = this.samples.length;
      for (let i = 0; i < n; i++) {
        const m = taperMultiplier(i, n, this.config);
        this.samples[i] = {
          ...this.samples[i],
          width: clamp(this.samples[i].width * m, this.config.minWidth, this.config.maxWidth),
        };
      }
    }
    if (this.config.taperStart && this.samples.length > 0) {
      const first = this.samples[0];
      this.samples[0] = {
        ...first,
        width: clamp(first.width * 0.45, this.config.minWidth * 0.5, this.config.maxWidth),
      };
    }
    return strokePointsToData(this.samples);
  }

  getStrokeData(): BrushStrokeData {
    return strokePointsToData(this.samples);
  }

  getSamples(): readonly StrokePoint[] {
    return this.samples;
  }
}
