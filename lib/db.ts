import Dexie, { type Table } from 'dexie';

export interface WhiteboardElement {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'line' | 'triangle' | 'arrow' | 'pencil' | 'image' | 'diamond';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  points?: number[];
  stroke: string;
  fill: string;
  strokeWidth: number;
  rotation: number;
  src?: string;
  
  // New Properties
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  sloppiness: number;
  edges: 'sharp' | 'round';
  arrowType: 'simple' | 'double' | 'circle';
  arrowheads: boolean;
  opacity: number;
  fontFamily: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
}

export class WhiteboardDatabase extends Dexie {
  elements!: Table<WhiteboardElement>;

  constructor() {
    super('WhiteboardDB');
    this.version(3).stores({
      elements: 'id, type'
    });
  }
}

export const db = new WhiteboardDatabase();
