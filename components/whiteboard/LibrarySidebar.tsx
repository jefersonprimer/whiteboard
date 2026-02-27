'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Upload, Trash2, BookOpen, Package } from 'lucide-react';
import { parseExcalidrawLib, convertLibraryItem, LibraryItem, ExcalidrawElement } from '@/lib/excalidrawAdapter';

const STORAGE_KEY = 'opendraw-library';

type Props = {
  onClose: () => void;
};

// ─── SVG Mini-Thumbnail renderer ───────────────────────────────────────────────

function ThumbnailSVG({ elements }: { elements: ExcalidrawElement[] }) {
  const THUMB_W = 120;
  const THUMB_H = 90;

  // Filter out deleted / image elements (images reference fileIds we can't resolve)
  const visible = elements.filter(el => !el.isDeleted && el.type !== 'image');

  if (!visible.length) {
    return (
      <svg width={THUMB_W} height={THUMB_H} viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}>
        <rect width={THUMB_W} height={THUMB_H} fill="transparent" />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#9ca3af">
          Empty
        </text>
      </svg>
    );
  }

  // Compute bounding box using el.x/y (absolute).
  // For line/arrow/freedraw, the actual extents come from their relative points,
  // NOT from el.width/el.height which can be misleading.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of visible) {
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
      maxX = Math.max(maxX, el.x + Math.abs(el.width ?? 40));
      maxY = Math.max(maxY, el.y + Math.abs(el.height ?? 40));
    }
  }

  const pad = 8;
  const contentW = Math.max(maxX - minX, 1);
  const contentH = Math.max(maxY - minY, 1);
  const scaleX = (THUMB_W - pad * 2) / contentW;
  const scaleY = (THUMB_H - pad * 2) / contentH;
  const scale = Math.min(scaleX, scaleY, 2);
  const drawW = contentW * scale;
  const drawH = contentH * scale;
  const startX = (THUMB_W - drawW) / 2;
  const startY = (THUMB_H - drawH) / 2;

  /** Map absolute canvas coords → thumbnail coords */
  function tx(x: number) { return startX + (x - minX) * scale; }
  function ty(y: number) { return startY + (y - minY) * scale; }
  function ts(v: number) { return v * scale; }

  function renderEl(el: ExcalidrawElement, i: number) {
    const stroke = el.strokeColor && el.strokeColor !== 'transparent' ? el.strokeColor : '#374151';
    const fill = el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : 'none';
    const sw = Math.max(0.5, (el.strokeWidth ?? 2) * scale * 0.4);
    const x = tx(el.x);
    const y = ty(el.y);
    const w = ts(el.width ?? 40);
    const h = ts(el.height ?? 40);
    const dash = el.strokeStyle === 'dashed' ? '4,2' : el.strokeStyle === 'dotted' ? '1,2' : undefined;
    // Excalidraw opacity is 0-100
    const opacity = (el.opacity ?? 100) / 100;
    const angleRad = el.angle ?? 0;
    // rotate around element centre
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rotateStr = angleRad !== 0 ? `rotate(${(angleRad * 180) / Math.PI}, ${cx}, ${cy})` : undefined;

    const common = { stroke, strokeWidth: sw, fill, opacity, strokeDasharray: dash, transform: rotateStr };

    switch (el.type) {
      case 'rectangle':
        return (
          <rect key={i} x={x} y={y} width={w} height={h}
            rx={el.strokeSharpness === 'round' || (el.roundness != null) ? Math.min(w, h) * 0.12 : 0}
            {...common} />
        );

      case 'ellipse':
        return (
          <ellipse key={i} cx={x + w / 2} cy={y + h / 2} rx={Math.abs(w / 2)} ry={Math.abs(h / 2)}
            {...common} />
        );

      case 'diamond': {
        const dcx = x + w / 2, dcy = y + h / 2;
        return (
          <polygon key={i} points={`${dcx},${y} ${x + w},${dcy} ${dcx},${y + h} ${x},${dcy}`}
            {...common} />
        );
      }

      case 'triangle': {
        const tcx = x + w / 2;
        return (
          <polygon key={i} points={`${tcx},${y} ${x + w},${y + h} ${x},${y + h}`}
            {...common} />
        );
      }

      case 'line':
      case 'arrow':
      // 'draw' is the v1 name for freedraw
      case 'freedraw':
      case 'draw': {
        if (!el.points || el.points.length < 2) return null;
        // Points are RELATIVE to el.x / el.y.
        // Map the element origin through the coordinate transform, then apply
        // the relative offsets scaled — avoids the double-offset bug where
        // tx(el.x + dx) would add el.x twice against the bounding box shift.
        const ox = tx(el.x);
        const oy = ty(el.y);
        const pts = el.points
          .map(([dx, dy]) => `${ox + dx * scale},${oy + dy * scale}`)
          .join(' ');
        const isArrow = el.type === 'arrow';
        return (
          <polyline key={i} points={pts} fill="none" stroke={stroke}
            strokeWidth={sw} opacity={opacity} strokeDasharray={dash}
            strokeLinejoin="round" strokeLinecap="round"
            markerEnd={isArrow && el.endArrowhead ? 'url(#th-arrow)' : undefined}
            transform={rotateStr} />
        );
      }

      case 'text': {
        const lines = (el.text ?? '').split('\n').slice(0, 3);
        const fSize = Math.max(5, (el.fontSize ?? 14) * scale * 0.55);
        return (
          <text key={i} x={x} y={y + fSize} fontSize={fSize}
            fill={stroke} opacity={opacity} fontFamily="sans-serif"
            transform={rotateStr}>
            {lines.map((line, li) => (
              <tspan key={li} x={x} dy={li === 0 ? 0 : fSize * 1.2}>
                {line.slice(0, 18)}{line.length > 18 ? '…' : ''}
              </tspan>
            ))}
          </text>
        );
      }

      default:
        return null;
    }
  }

  return (
    <svg width={THUMB_W} height={THUMB_H} viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
      style={{ display: 'block' }}>
      <defs>
        <marker id="th-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L5,2.5 z" fill="#374151" />
        </marker>
        <clipPath id="th-clip">
          <rect width={THUMB_W} height={THUMB_H} />
        </clipPath>
      </defs>
      <g clipPath="url(#th-clip)">
        {visible.map((el, i) => renderEl(el, i))}
      </g>
    </svg>
  );
}


// ─── Main component ────────────────────────────────────────────────────────────

export default function LibrarySidebar({ onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Load persisted library on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Persist whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [items]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImporting(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = parseExcalidrawLib(json);

      setItems(prev => {
        // Avoid duplicate ids
        const existingIds = new Set(prev.map(i => i.id));
        const newItems = parsed.filter(i => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to import library');
    } finally {
      setImporting(false);
      // Reset so the same file can be re-imported
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleInsert = useCallback((item: LibraryItem) => {
    // Centre of the current viewport — Canvas will receive (0,0) base
    // and we set a reasonable canvas-space position. The Canvas listener
    // will place elements at the stage centre if it knows zoom/offset; we
    // use a simple fixed offset here and Canvas handles the rest.
    const converted = convertLibraryItem(item, 400, 300);
    if (!converted.length) return;
    window.dispatchEvent(new CustomEvent('add-library-items', { detail: { elements: converted } }));
    onClose();
  }, [onClose]);

  return (
    <aside
      className="flex flex-col w-[320px] max-w-[90vw] h-[calc(100vh-88px)] bg-white dark:bg-[#1C1C1C] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Library"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-indigo-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Library</span>
          {items.length > 0 && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-medium">
              {items.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Import button */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept=".excalidrawlib"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium transition-colors border border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
        >
          <Upload size={15} />
          {importing ? 'Importing…' : 'Import .excalidrawlib'}
        </button>

        {error && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400 text-center">{error}</p>
        )}
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Package size={22} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-neutral-300">No library items yet</p>
              <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">
                Import an <span className="font-mono">.excalidrawlib</span> file to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map(item => (
              <div
                key={item.id}
                className="group relative rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 overflow-hidden cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all"
                onClick={() => handleInsert(item)}
                title={`Insert "${item.name}"`}
              >
                {/* Thumbnail */}
                <div className="flex items-center justify-center bg-white dark:bg-neutral-900 p-1 h-[76px]">
                  <ThumbnailSVG elements={item.elements} />
                </div>

                {/* Label */}
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-600 dark:text-neutral-400 truncate leading-tight">
                    {item.name}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-500 shrink-0 ml-1"
                    onClick={e => { e.stopPropagation(); handleRemoveItem(item.id); }}
                    title="Remove"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {items.length > 0 && (
        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
          <p className="text-[10px] text-center text-gray-400 dark:text-neutral-600">
            Click any item to insert it on the canvas
          </p>
        </div>
      )}
    </aside>
  );
}