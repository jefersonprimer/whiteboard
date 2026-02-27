import { nanoid } from 'nanoid';
import { WhiteboardElement } from './db';

// ─── Excalidraw library format types ───────────────────────────────────────────

export interface ExcalidrawElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    /** angle in RADIANS */
    angle?: number;
    strokeColor?: string;
    backgroundColor?: string;
    fillStyle?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    /** 0 = architect, 1 = artist, 2 = cartoonist */
    roughness?: number;
    /** 0–100 scale (not 0–1!) */
    opacity?: number;
    text?: string;
    fontSize?: number;
    /** 1=Virgil, 2=Helvetica, 3=Cascadia */
    fontFamily?: number;
    textAlign?: string;
    /** Points are RELATIVE to element x/y – [[dx,dy], ...] */
    points?: [number, number][];
    /** v2: roundness object. v1: use strokeSharpness instead */
    roundness?: { type: number } | null;
    /** v1 field: "sharp" | "round" */
    strokeSharpness?: 'sharp' | 'round';
    startArrowhead?: string | null;
    endArrowhead?: string | null;
    isDeleted?: boolean;
}

export interface ExcalidrawLibItem {
    id: string;
    status?: string;
    elements: ExcalidrawElement[];
    name?: string;
}

export interface ExcalidrawLibFile {
    type: 'excalidrawlib';
    version: 1 | 2;
    source?: string;
    /** v2 format */
    libraryItems?: ExcalidrawLibItem[];
    /** v1 format: array of element-groups */
    library?: ExcalidrawElement[][];
}

/** Normalised item we store in the sidebar */
export interface LibraryItem {
    id: string;
    name: string;
    elements: ExcalidrawElement[];
}

// ─── Parser ────────────────────────────────────────────────────────────────────

export function parseExcalidrawLib(raw: unknown): LibraryItem[] {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid library file');
    const lib = raw as ExcalidrawLibFile;

    if (lib.type !== 'excalidrawlib') throw new Error('Not an excalidrawlib file');

    // Version 2 format
    if (lib.version === 2 && Array.isArray(lib.libraryItems)) {
        return lib.libraryItems.map((item, i) => ({
            id: item.id ?? nanoid(),
            name: (item as any).name ?? `Item ${i + 1}`,
            elements: (item.elements ?? []).filter(el => !el.isDeleted),
        }));
    }

    // Version 1 format — library is an array of element arrays
    if (Array.isArray(lib.library)) {
        return lib.library.map((elements, i) => ({
            id: nanoid(),
            name: `Item ${i + 1}`,
            elements: (elements ?? []).filter(el => !el.isDeleted),
        }));
    }

    throw new Error('Unsupported excalidrawlib format');
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapFontFamily(fontFamily?: number): string {
    switch (fontFamily) {
        case 1: return 'Virgil, cursive';
        case 2: return 'Helvetica, sans-serif';
        case 3: return 'Cascadia Code, monospace';
        default: return 'Sans-serif';
    }
}

function mapRoughness(roughness?: number): number {
    if (roughness === undefined || roughness === null) return 0;
    return Math.min(2, Math.max(0, roughness));
}

/** Determine if element has rounded edges using both v1 and v2 fields */
function isRound(el: ExcalidrawElement): boolean {
    // v2 roundness object
    if (el.roundness != null && typeof el.roundness === 'object') return true;
    // v1 strokeSharpness
    if (el.strokeSharpness === 'round') return true;
    return false;
}

/**
 * Convert relative Excalidraw points [[dx,dy],...] to flat absolute coords
 * [x, y, x, y,...] using the element's own x/y as base.
 */
export function flattenRelativePoints(
    points: [number, number][],
    baseX: number,
    baseY: number
): number[] {
    const out: number[] = [];
    for (const [dx, dy] of points) {
        out.push(baseX + dx, baseY + dy);
    }
    return out;
}

// ─── Converter ────────────────────────────────────────────────────────────────

/**
 * Convert a LibraryItem's Excalidraw elements into WhiteboardElements,
 * centred around (centerX, centerY) in canvas coordinates.
 */
export function convertLibraryItem(
    item: LibraryItem,
    centerX: number,
    centerY: number
): WhiteboardElement[] {
    const elements = item.elements;
    if (!elements.length) return [];

    // Calculate bounding box (all elements use absolute x/y).
    // For line/arrow/freedraw elements the real extents come from their
    // relative points, not from el.width/el.height.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
        if (el.points && el.points.length >= 2 &&
            (el.type === 'line' || el.type === 'arrow' || el.type === 'freedraw' || el.type === 'draw')) {
            for (const [dx, dy] of el.points) {
                minX = Math.min(minX, el.x + dx);
                minY = Math.min(minY, el.y + dy);
                maxX = Math.max(maxX, el.x + dx);
                maxY = Math.max(maxY, el.y + dy);
            }
        } else {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + (el.width ?? 0));
            maxY = Math.max(maxY, el.y + (el.height ?? 0));
        }
    }

    const groupW = maxX - minX;
    const groupH = maxY - minY;
    const offX = centerX - groupW / 2 - minX;
    const offY = centerY - groupH / 2 - minY;

    const result: WhiteboardElement[] = [];

    for (const el of elements) {
        const x = el.x + offX;
        const y = el.y + offY;
        const w = el.width ?? 100;
        const h = el.height ?? 100;

        // opacity is 0–100 in excalidraw, needs to be 0–1
        const opacity = (el.opacity ?? 100) / 100;

        // angle in radians → degrees
        const rotation = el.angle ? (el.angle * 180) / Math.PI : 0;

        const base = {
            stroke: el.strokeColor && el.strokeColor !== 'transparent' ? el.strokeColor : '#1e1e1e',
            fill: el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : 'transparent',
            strokeWidth: el.strokeWidth ?? 2,
            rotation,
            strokeStyle: (el.strokeStyle ?? 'solid') as 'solid' | 'dashed' | 'dotted',
            sloppiness: mapRoughness(el.roughness),
            edges: (isRound(el) ? 'round' : 'sharp') as 'sharp' | 'round',
            opacity,
            arrowType: 'simple' as const,
            arrowheads: !!(el.endArrowhead),
            arrowBreakPoints: 3 as const,
            arrowheadTail: !!(el.startArrowhead),
            arrowheadStyle: 'triangle' as const,
            fontFamily: mapFontFamily(el.fontFamily),
            fontSize: el.fontSize ?? 20,
            textAlign: (el.textAlign ?? 'left') as 'left' | 'center' | 'right',
        };

        switch (el.type) {
            case 'rectangle':
                result.push({ id: nanoid(), type: 'rectangle', x, y, width: w, height: h, ...base });
                break;

            case 'ellipse':
                result.push({ id: nanoid(), type: 'circle', x, y, width: w, height: h, ...base });
                break;

            case 'diamond':
                result.push({ id: nanoid(), type: 'diamond', x, y, width: w, height: h, ...base });
                break;

            case 'triangle':
                result.push({ id: nanoid(), type: 'triangle', x, y, width: w, height: h, ...base });
                break;

            case 'line':
            case 'arrow': {
                // Points are relative to element origin
                const pts = el.points && el.points.length >= 2
                    ? flattenRelativePoints(el.points, x, y)
                    : [x, y, x + w, y + h];

                result.push({
                    id: nanoid(),
                    type: el.type === 'arrow' ? 'arrow' : 'line',
                    x,
                    y,
                    width: w,
                    height: h,
                    points: pts,
                    ...base,
                    arrowheads: el.type === 'arrow' ? !!(el.endArrowhead) : false,
                    arrowheadTail: el.type === 'arrow' ? !!(el.startArrowhead) : false,
                });
                break;
            }

            // 'draw' is the v1 name for freedraw
            case 'freedraw':
            case 'draw': {
                const pts = el.points && el.points.length >= 2
                    ? flattenRelativePoints(el.points, x, y)
                    : null;
                if (pts) {
                    result.push({ id: nanoid(), type: 'pencil', x, y, width: w, height: h, points: pts, ...base });
                }
                break;
            }

            case 'text':
                result.push({
                    id: nanoid(),
                    type: 'text',
                    x,
                    y,
                    width: w,
                    height: h,
                    text: el.text ?? '',
                    ...base,
                });
                break;

            // image type: skip (excalidraw images reference fileIds which we cannot resolve)
            case 'image':
                break;

            default:
                // Unsupported type — skip silently
                break;
        }
    }

    return result;
}
