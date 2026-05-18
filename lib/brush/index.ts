export type {
  BrushEngine,
  BrushStrokeData,
  StrokePoint,
  VelocityBrushConfig,
} from './types';

export {
  DEFAULT_VELOCITY_BRUSH_CONFIG,
  VelocityBrushEngine,
  createVelocityBrushConfig,
} from './velocityBrush';

export {
  buildStrokeRenderData,
  drawVariableWidthStroke,
  distanceToStroke,
  getStrokeOutline,
  smoothCenterline,
  traceQuadraticCenterline,
  unpackStroke,
} from './strokePath';

export type { WidthPoint } from './strokePath';

export { clamp, distance, lerp, normalize } from './math';
