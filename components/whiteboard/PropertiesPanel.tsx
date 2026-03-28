'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WhiteboardElement } from '@/lib/db';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Minus, AlignLeft, AlignCenter, AlignRight,
  Square as SquareIcon,
  Circle as CircleIcon, ArrowRight, ArrowDownToLine, MoveDown, MoveUp, ArrowUpToLine,
  ChevronDown, ArrowLeftRight, SlidersHorizontal, Ellipsis
} from 'lucide-react';

interface PropertiesPanelProps {
  activeTool: string;
  selectedElements: WhiteboardElement[];
  updateElements: (updates: Partial<WhiteboardElement>) => void;
  onLayerChange: (action: 'front' | 'back' | 'forward' | 'backward') => void;
}

const STROKE_COLORS_LIGHT = ['#000000', '#e03131', '#2f9e41', '#1971c2', '#f08c00'];
const STROKE_COLORS_DARK = ['#ffffff', '#e03131', '#2f9e41', '#1971c2', '#f08c00'];
const BG_COLORS = ['transparent', '#ffec99', '#b2f2bb', '#a5d8ff', '#ffc9c9'];

const ARROWHEAD_STYLES: { id: 'triangle' | 'circle' | 'diamond'; label: string; icon: React.ReactNode }[] = [
  { id: 'triangle', label: 'Triângulo', icon: <ArrowRight size={18} /> },
  { id: 'circle', label: 'Círculo', icon: <CircleIcon size={18} /> },
  { id: 'diamond', label: 'Losango', icon: <SquareIcon size={16} className="rotate-45" /> },
];

function ArrowheadStylePicker({ value, onChange }: { value: 'triangle' | 'circle' | 'diamond'; onChange: (s: 'triangle' | 'circle' | 'diamond') => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  const current = ARROWHEAD_STYLES.find(s => s.id === value) ?? ARROWHEAD_STYLES[0];
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-md border border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 px-3 py-2 flex items-center justify-between gap-2 text-left text-sm"
      >
        <span className="flex items-center gap-2">
          {current.icon}
          <span className="text-gray-700 dark:text-neutral-300">{current.label}</span>
        </span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 py-1 bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-neutral-700 rounded-lg shadow-lg z-60">
          {ARROWHEAD_STYLES.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { onChange(id); setOpen(false); }}
              className={`w-full px-3 py-2 flex items-center gap-2 text-sm rounded-md transition-colors ${value === id ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-300'}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_ELEMENT: Partial<WhiteboardElement> = {
  stroke: '#000000',
  fill: 'transparent',
  strokeWidth: 2,
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
};

export function PropertiesPanel({ 
  activeTool,
  selectedElements, 
  updateElements,
  onLayerChange 
}: PropertiesPanelProps) {
  const [activeMobilePanel, setActiveMobilePanel] = useState<'stroke' | 'background' | 'filters' | 'layers' | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileModalArrowLeft, setMobileModalArrowLeft] = useState(0);
  const [mobileModalLeft, setMobileModalLeft] = useState(16);
  const mobileButtonRefs = useRef<Record<'stroke' | 'background' | 'filters' | 'layers', HTMLButtonElement | null>>({
    stroke: null,
    background: null,
    filters: null,
    layers: null,
  });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const STROKE_COLORS = isDark ? STROKE_COLORS_DARK : STROKE_COLORS_LIGHT;
  const isDrawingTool = ['rectangle', 'circle', 'triangle', 'line', 'arrow', 'pencil', 'text', 'image'].includes(activeTool);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!activeMobilePanel || !isMounted) return;

    const updateArrowPosition = () => {
      const button = mobileButtonRefs.current[activeMobilePanel];
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const modalWidth = Math.min(window.innerWidth - 32, 420);
      const modalLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - modalWidth / 2, window.innerWidth - modalWidth - 16));
      const arrowHalfWidth = 10;
      const nextLeft = rect.left + rect.width / 2 - modalLeft - arrowHalfWidth;
      setMobileModalLeft(modalLeft);
      setMobileModalArrowLeft(Math.max(16, Math.min(nextLeft, modalWidth - 36)));
    };

    updateArrowPosition();
    window.addEventListener('resize', updateArrowPosition);

    return () => window.removeEventListener('resize', updateArrowPosition);
  }, [activeMobilePanel, isMounted]);

  if (selectedElements.length === 0 && !isDrawingTool) return null;

  const first = selectedElements.length > 0 ? selectedElements[0] : DEFAULT_ELEMENT as WhiteboardElement;
  const type = selectedElements.length > 0 ? first.type : activeTool as any;
  // Cores que invertem com o tema: mostrar no painel a cor que está visível no canvas
  const contrastLight = ['#000000', '#1e1e1e', '#1a1a1a', '#111'];
  const contrastDark = ['#ffffff', '#e5e5e5', '#eee', '#f5f5f5', '#fafafa'];
  const s = (first.stroke || '').toLowerCase().trim();
  const strokeForSwatch =
    isDark && contrastLight.some((c) => c === s)
      ? '#ffffff'
      : !isDark && contrastDark.some((c) => c === s)
        ? '#000000'
        : first.stroke;

  const Section = ({ title, children, className = "" }: { title: string; children: React.ReactNode, className?: string }) => (
    <div className={`mb-5 ${className}`}>
      <h4 className="text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-2.5">{title}</h4>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  const isShape = ['rectangle', 'circle', 'triangle', 'diamond', 'line', 'arrow'].includes(type);
  const isPencil = type === 'pencil';
  const isText = type === 'text';
  const showStrokeSection = isShape || isPencil || isText;
  const showBackgroundSection = isShape || isPencil || isText;
  const showStrokeWidthSection = isShape || isPencil;
  const showStrokeStyleSection = isShape;
  const showSloppinessSection = isShape;
  const showEdgesSection = ['rectangle', 'triangle', 'diamond', 'line', 'image'].includes(type);
  const showArrowSection = type === 'arrow';
  const showTextSection = isText;
  const showFiltersButton = showStrokeWidthSection || showStrokeStyleSection || showSloppinessSection || showEdgesSection || showArrowSection || showTextSection;

  const breakpointOptions: { value: 3 | 5 | 8; icon: React.ReactNode }[] = [
    {
      value: 3,
      icon: (
        <svg
          aria-hidden="true"
          focusable="false"
          role="img"
          viewBox="0 0 24 24"
          className="w-5 h-5"
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g>
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M6 18l12 -12" />
            <path d="M18 10v-4h-4" />
          </g>
        </svg>
      ),
    },
    {
      value: 5,
      icon: (
        <svg 
          aria-hidden="true" 
          focusable="false" 
          role="img" 
          viewBox="0 0 24 24" 
          className="w-5 h-5"
          fill="none" 
          strokeWidth="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"

        >
          <g>
            <path d="M16,12L20,9L16,6">
            </path>
            <path d="M6 20c0 -6.075 4.925 -11 11 -11h3">
            </path>
          </g>
        </svg>
      ),
    },
    {
      value: 8,
      icon: (
        <svg
          aria-hidden="true"
          focusable="false"
          role="img"
          viewBox="0 0 24 24"
          className="w-5 h-5"
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g>
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4,19L10,19C11.097,19 12,18.097 12,17L12,9C12,7.903 12.903,7 14,7L21,7" />
            <path d="M18 4l3 3l-3 3" />
          </g>
        </svg>
      ),
    },
  ];

  const MobilePanelButton = ({
    onClick,
    children,
    className = '',
    title,
    buttonRef,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    title: string;
    buttonRef?: (node: HTMLButtonElement | null) => void;
  }) => (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      title={title}
      className={`h-11 min-w-11 px-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1C1C1C] shadow-lg flex items-center justify-center text-gray-700 dark:text-neutral-200 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900 ${className}`}
    >
      {children}
    </button>
  );

  const mobileModal = (title: string, content: React.ReactNode) => {
    if (!isMounted || !activeMobilePanel) return null;

    const isLayersModal = activeMobilePanel === 'layers';
    const mobileModalStyle: React.CSSProperties = {
      width: 'max-content',
      maxWidth: isLayersModal ? 'min(calc(100vw - 2rem), 520px)' : 'min(calc(100vw - 2rem), 420px)',
      minWidth: isLayersModal ? '280px' : undefined,
      left: mobileModalLeft,
    };

    return createPortal(
      <div className="fixed inset-0 z-[120] md:hidden" onClick={() => setActiveMobilePanel(null)}>
        <div className="absolute inset-0 bg-black/25" />
        <div
          className="absolute bottom-32 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1C1C1C] shadow-2xl p-4 max-h-[60vh] overflow-y-auto custom-scrollbar"
          style={mobileModalStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">{title}</h3>
          </div>
          {content}
          <div
            className="absolute -bottom-[10px] w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-white dark:border-t-[#1C1C1C]"
            style={{ left: mobileModalArrowLeft }}
          />
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className="hidden md:block fixed left-6 top-1/2 -translate-y-1/2 w-60 bg-white dark:bg-[#1C1C1C] border border-gray-100 dark:border-neutral-800 rounded-lg p-3 z-50 max-h-[80vh] overflow-y-auto custom-scrollbar transition-all duration-300">
        {/* STROKE COLORS */}
        {showStrokeSection && (
          <Section title="Stroke">
            <div className="flex items-center gap-1.5 w-full">
              {STROKE_COLORS.map(c => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded-lg border transition-all ${strokeForSwatch === c ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1C] scale-110 shadow-sm' : 'border-gray-100 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => updateElements({ stroke: c })}
                />
              ))}
              <div className="w-[1.5px] h-5 bg-gray-200 dark:bg-neutral-600 mx-1 shrink-0" />
              <div className="relative w-7 h-7 rounded-lg border border-gray-100 dark:border-neutral-700 overflow-hidden cursor-pointer hover:border-gray-300 dark:hover:border-neutral-600 transition-all shadow-sm">
                <input
                  type="color"
                  value={first.stroke.startsWith('#') ? strokeForSwatch : (isDark ? '#ffffff' : '#000000')}
                  onChange={(e) => updateElements({ stroke: e.target.value })}
                  className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer border-none"
                />
              </div>
            </div>
          </Section>
        )}

        {/* BACKGROUND COLORS */}
        {showBackgroundSection && (
          <Section title="Background">
            <div className="flex items-center gap-1.5 w-full">
              {BG_COLORS.map((c, i) => {
                const isTransparent = c === 'transparent';
                const transparentStyle: React.CSSProperties = {
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  backgroundImage: `
                    linear-gradient(45deg, rgba(148, 163, 184, 0.5) 25%, transparent 25%, transparent 75%, rgba(148, 163, 184, 0.5) 75%, rgba(148, 163, 184, 0.5)),
                    linear-gradient(45deg, rgba(148, 163, 184, 0.5) 25%, transparent 25%, transparent 75%, rgba(148, 163, 184, 0.5) 75%, rgba(148, 163, 184, 0.5))
                  `,
                  backgroundSize: '6px 6px',
                  backgroundPosition: '0 0, 3px 3px',
                };

                return (
                  <button
                    key={c + i}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${first.fill === c ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1C] scale-110 shadow-sm' : 'border-gray-100 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'}`}
                    style={isTransparent ? transparentStyle : { backgroundColor: c }}
                    onClick={() => updateElements({ fill: c })}
                  >
                    {isTransparent}
                  </button>
                );
              })}
              <div className="w-[1.5px] h-5 bg-gray-200 dark:bg-neutral-600 mx-1 shrink-0" />
              <div className="relative w-7 h-7 rounded-lg border border-gray-100 dark:border-neutral-700 overflow-hidden cursor-pointer hover:border-gray-300 dark:hover:border-neutral-600 transition-all shadow-sm">
                <input
                  type="color"
                  value={first.fill !== 'transparent' && first.fill.startsWith('#') ? first.fill : '#ffffff'}
                  onChange={(e) => updateElements({ fill: e.target.value })}
                  className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer border-none"
                />
              </div>
            </div>
          </Section>
        )}

        {/* STROKE WIDTH */}
        {showStrokeWidthSection && (
          <Section title="Stroke Width">
            {[2, 4, 8].map((w, i) => (
              <button
                key={w}
                onClick={() => updateElements({ strokeWidth: w })}
                className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all ${first.strokeWidth === w ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
              >
                <div style={{ height: (i + 1) * 1.5, width: '50%', backgroundColor: 'currentColor', borderRadius: 4 }} />
              </button>
            ))}
          </Section>
        )}

        {/* STROKE STYLE */}
        {showStrokeStyleSection && (
          <Section title="Stroke Style">
            {(['solid', 'dashed', 'dotted'] as const).map(s => (
              <button
                key={s}
                onClick={() => updateElements({ strokeStyle: s })}
                className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all ${first.strokeStyle === s ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
              >
                <div className={`w-2/4 h-0 ${s === 'dashed' ? 'border-t-2 border-dashed' : s === 'dotted' ? 'border-t-2 border-dotted' : 'border-t-2'} border-current`} />
              </button>
            ))}
          </Section>
        )}

        {/* SLOPPINESS */}
        {showSloppinessSection && (
          <Section title="Sloppiness">
            {[
              { value: 0, title: 'Limpo e acabado' },
              { value: 1, title: 'Traço tipo lápis (bem feito)' },
              { value: 2, title: 'Traço tipo lápis (rascunho)' },
            ].map(({ value, title }) => (
              <button
                key={value}
                title={title}
                onClick={() => updateElements({ sloppiness: value })}
                className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all ${first.sloppiness === value ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
              >
                {value === 0 && (
                  <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12.038c1.655-.885 5.9-3.292 8.568-4.354 2.668-1.063.101 2.821 1.32 3.104 1.218.283 5.112-1.814 5.112-1.814" strokeWidth="1.25"></path></svg>
                )}
                {value === 1 && (
                  <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12.563c1.655-.886 5.9-3.293 8.568-4.355 2.668-1.062.101 2.822 1.32 3.105 1.218.283 5.112-1.814 5.112-1.814m-13.469 2.23c2.963-1.586 6.13-5.62 7.468-4.998 1.338.623-1.153 4.11-.132 5.595 1.02 1.487 6.133-1.43 6.133-1.43" strokeWidth="1.25"></path></svg>
                )}
                {value === 2 && (
                  <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 11.936c1.737-.879 8.627-5.346 10.42-5.268 1.795.078-.418 5.138.345 5.736.763.598 3.53-1.789 4.235-2.147M2.929 9.788c1.164-.519 5.47-3.28 6.987-3.114 1.519.165 1 3.827 2.121 4.109 1.122.281 3.839-2.016 4.606-2.42" strokeWidth="1.25"></path></svg>
                )}
              </button>
            ))}
          </Section>
        )}

        {/* EDGES */}
        {showEdgesSection && (
          <Section title="Edges">
            {(['sharp', 'round'] as const).map(e => (
              <button
                key={e}
                onClick={() => updateElements({ edges: e })}
                className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all ${first.edges === e ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
              >
                {e === 'sharp' ? <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><svg strokeWidth="1.5"><path d="M3.33334 9.99998V6.66665C3.33334 6.04326 3.33403 4.9332 3.33539 3.33646C4.95233 3.33436 6.06276 3.33331 6.66668 3.33331H10"></path><path d="M13.3333 3.33331V3.34331"></path><path d="M16.6667 3.33331V3.34331"></path><path d="M16.6667 6.66669V6.67669"></path><path d="M16.6667 10V10.01"></path><path d="M3.33334 13.3333V13.3433"></path><path d="M16.6667 13.3333V13.3433"></path><path d="M3.33334 16.6667V16.6767"></path><path d="M6.66666 16.6667V16.6767"></path><path d="M10 16.6667V16.6767"></path><path d="M13.3333 16.6667V16.6767"></path><path d="M16.6667 16.6667V16.6767"></path></svg></svg> : <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M4 12v-4a4 4 0 0 1 4 -4h4"></path><line x1="16" y1="4" x2="16" y2="4.01"></line><line x1="20" y1="4" x2="20" y2="4.01"></line><line x1="20" y1="8" x2="20" y2="8.01"></line><line x1="20" y1="12" x2="20" y2="12.01"></line><line x1="4" y1="16" x2="4" y2="16.01"></line><line x1="20" y1="16" x2="20" y2="16.01"></line><line x1="4" y1="20" x2="4" y2="20.01"></line><line x1="8" y1="20" x2="8" y2="20.01"></line><line x1="12" y1="20" x2="12" y2="20.01"></line><line x1="16" y1="20" x2="16" y2="20.01"></line><line x1="20" y1="20" x2="20" y2="20.01"></line></g></svg>}
              </button>
            ))}
          </Section>
        )}

        {/* ARROW OPTIONS */}
        {showArrowSection && (
          <>
            <Section title="Pontos de quebra">
              {breakpointOptions.map(({ value, icon }) => (
                <button
                  key={value}
                  title={`${value} pontos`}
                  onClick={() =>
                    updateElements({
                      arrowBreakPoints: value,
                      arrowType: value === 5 ? 'double' : 'simple',
                    })
                  }
                  className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all text-xs font-semibold ${(first.arrowBreakPoints ?? 3) === value ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                >
                  {icon}
                </button>
              ))}
            </Section>
            <Section title="Arrowheads">
              <div className="flex flex-wrap items-center gap-2 w-full">
                <span className="text-[11px] text-gray-500 dark:text-neutral-400 w-full">Ponta no fim</span>
                {[true, false].map(ah => (
                  <button
                    key={String(ah)}
                    onClick={() => updateElements({ arrowheads: ah })}
                    className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all ${(first.arrowheads ?? true) === ah ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                  >
                    {ah ? <ArrowRight size={20} /> : <Minus size={20} />}
                  </button>
                ))}
                <span className="text-[11px] text-gray-500 dark:text-neutral-400 w-full mt-1">Ponta no início (duas pontas)</span>
                <button
                  onClick={() => updateElements({ arrowheadTail: !(first.arrowheadTail ?? false) })}
                  className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all ${first.arrowheadTail ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                  title="Cabeça no tail (seta dupla)"
                >
                  <ArrowLeftRight size={20} />
                </button>
                <div className="w-full mt-1 relative">
                  <span className="text-[11px] text-gray-500 dark:text-neutral-400 block mb-1">Estilo da ponta</span>
                  <ArrowheadStylePicker value={first.arrowheadStyle ?? 'triangle'} onChange={(s) => updateElements({ arrowheadStyle: s })} />
                </div>
              </div>
            </Section>
          </>
        )}

        {/* TEXT SPECIFIC */}
        {showTextSection && (
          <>
            <Section title="Font Family">
              {['Sans-serif', 'Serif', 'Monospace'].map(f => (
                <button
                  key={f}
                  onClick={() => updateElements({ fontFamily: f })}
                  className={`px-3 py-2 text-[11px] font-medium rounded-xl border transition-all ${first.fontFamily === f ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                >
                  {f}
                </button>
              ))}
            </Section>
            <Section title="Font Size">
              {[16, 20, 24, 32].map(s => (
                <button
                  key={s}
                  onClick={() => updateElements({ fontSize: s })}
                  className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold transition-all ${first.fontSize === s ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                >
                  {s}
                </button>
              ))}
            </Section>
            <Section title="Align">
              {(['left', 'center', 'right'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => updateElements({ textAlign: a })}
                  className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all ${first.textAlign === a ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                >
                  {a === 'left' ? <AlignLeft size={18} /> : a === 'center' ? <AlignCenter size={18} /> : <AlignRight size={18} />}
                </button>
              ))}
            </Section>
          </>
        )}

        {/* OPACITY */}
        <Section title={`Opacity (${Math.round(first.opacity * 100)}%)`}>
          <input
            type="range" min="0" max="100" step="1"
            value={Math.round(first.opacity * 100)}
            onChange={(e) => updateElements({ opacity: parseInt(e.target.value, 10) / 100 })}
            className="w-full h-2 bg-gray-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </Section>

        {/* LAYERS */}
        <Section title="Layers" className="mb-0">
          <div className="flex items-center gap-2">
            <button onClick={() => onLayerChange('front')} title="To Front" className="w-8 h-8 p-1 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600 flex items-center justify-center text-black dark:text-white transition-all rounded-md"><ArrowDownToLine size={20} /></button>
            <button onClick={() => onLayerChange('forward')} title="Forward" className="w-8 h-8 p-1 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600 rounded-md flex items-center justify-center text-black dark:text-white transition-all"><MoveDown size={20} /></button>
            <button onClick={() => onLayerChange('backward')} title="Backward" className="w-8 h-8 p-1 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600 rounded-md flex items-center justify-center text-black dark:text-white transition-all"><MoveUp size={20} /></button>
            <button onClick={() => onLayerChange('back')} title="To Back" className="w-8 h-8 p-1 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600 rounded-md flex items-center justify-center text-black dark:text-white transition-all"><ArrowUpToLine size={20} /></button>
          </div>
        </Section>
      </div>

      <div className="fixed bottom-20 left-4 z-[60] flex items-center gap-2 md:hidden">
        {showStrokeSection && (
          <MobilePanelButton
            onClick={() => setActiveMobilePanel('stroke')}
            title="Stroke"
            buttonRef={(node) => {
              mobileButtonRefs.current.stroke = node;
            }}
          >
            <span className="h-5 w-5 rounded-md border border-black/10 dark:border-white/10" style={{ backgroundColor: strokeForSwatch }} />
          </MobilePanelButton>
        )}

        {showBackgroundSection && (
          <MobilePanelButton
            onClick={() => setActiveMobilePanel('background')}
            title="Background"
            buttonRef={(node) => {
              mobileButtonRefs.current.background = node;
            }}
          >
            <span
              className="h-5 w-5 rounded-md border border-black/10 dark:border-white/10"
              style={
                first.fill === 'transparent'
                  ? {
                      backgroundColor: isDark ? '#111827' : '#ffffff',
                      backgroundImage: `
                        linear-gradient(45deg, rgba(148, 163, 184, 0.5) 25%, transparent 25%, transparent 75%, rgba(148, 163, 184, 0.5) 75%, rgba(148, 163, 184, 0.5)),
                        linear-gradient(45deg, rgba(148, 163, 184, 0.5) 25%, transparent 25%, transparent 75%, rgba(148, 163, 184, 0.5) 75%, rgba(148, 163, 184, 0.5))
                      `,
                      backgroundSize: '6px 6px',
                      backgroundPosition: '0 0, 3px 3px',
                    }
                  : { backgroundColor: first.fill }
              }
            />
          </MobilePanelButton>
        )}

        <MobilePanelButton
          onClick={() => setActiveMobilePanel('filters')}
          title="Filtros"
          className={!showFiltersButton ? 'opacity-50' : ''}
          buttonRef={(node) => {
            mobileButtonRefs.current.filters = node;
          }}
        >
          <SlidersHorizontal size={18} />
        </MobilePanelButton>

        <MobilePanelButton
          onClick={() => setActiveMobilePanel('layers')}
          title="Layers"
          buttonRef={(node) => {
            mobileButtonRefs.current.layers = node;
          }}
        >
          <Ellipsis size={18} />
        </MobilePanelButton>
      </div>

      {activeMobilePanel === 'stroke' && mobileModal('Stroke', (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-10 h-10 rounded-xl border transition-all ${strokeForSwatch === c ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1C] scale-105 shadow-sm' : 'border-gray-200 dark:border-neutral-700'}`}
                style={{ backgroundColor: c }}
                onClick={() => updateElements({ stroke: c })}
              />
            ))}
          </div>
          <label className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-3 text-sm text-gray-700 dark:text-neutral-200">
            Cor personalizada
            <input
              type="color"
              value={first.stroke.startsWith('#') ? strokeForSwatch : (isDark ? '#ffffff' : '#000000')}
              onChange={(e) => updateElements({ stroke: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border-none bg-transparent"
            />
          </label>
        </div>
      ))}

      {activeMobilePanel === 'background' && mobileModal('Background', (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {BG_COLORS.map((c, i) => {
              const isTransparent = c === 'transparent';
              return (
                <button
                  key={c + i}
                  type="button"
                  className={`w-10 h-10 rounded-xl border transition-all ${first.fill === c ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1C] scale-105 shadow-sm' : 'border-gray-200 dark:border-neutral-700'}`}
                  style={isTransparent ? {
                    backgroundColor: isDark ? '#111827' : '#ffffff',
                    backgroundImage: `
                      linear-gradient(45deg, rgba(148, 163, 184, 0.5) 25%, transparent 25%, transparent 75%, rgba(148, 163, 184, 0.5) 75%, rgba(148, 163, 184, 0.5)),
                      linear-gradient(45deg, rgba(148, 163, 184, 0.5) 25%, transparent 25%, transparent 75%, rgba(148, 163, 184, 0.5) 75%, rgba(148, 163, 184, 0.5))
                    `,
                    backgroundSize: '6px 6px',
                    backgroundPosition: '0 0, 3px 3px',
                  } : { backgroundColor: c }}
                  onClick={() => updateElements({ fill: c })}
                />
              );
            })}
          </div>
          <label className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-3 text-sm text-gray-700 dark:text-neutral-200">
            Cor personalizada
            <input
              type="color"
              value={first.fill !== 'transparent' && first.fill.startsWith('#') ? first.fill : '#ffffff'}
              onChange={(e) => updateElements({ fill: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border-none bg-transparent"
            />
          </label>
        </div>
      ))}

      {activeMobilePanel === 'filters' && showFiltersButton && mobileModal('Propriedades', (
        <div>
          {showStrokeWidthSection && (
            <Section title="Stroke Width">
              {[2, 4, 8].map((w, i) => (
                <button
                  key={w}
                  onClick={() => updateElements({ strokeWidth: w })}
                  className={`w-10 h-10 rounded-md border flex items-center justify-center transition-all ${first.strokeWidth === w ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                >
                  <div style={{ height: (i + 1) * 1.5, width: '50%', backgroundColor: 'currentColor', borderRadius: 4 }} />
                </button>
              ))}
            </Section>
          )}

          {showStrokeStyleSection && (
            <Section title="Stroke Style">
              {(['solid', 'dashed', 'dotted'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => updateElements({ strokeStyle: s })}
                  className={`w-10 h-10 rounded-md border flex items-center justify-center transition-all ${first.strokeStyle === s ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                >
                  <div className={`w-2/4 h-0 ${s === 'dashed' ? 'border-t-2 border-dashed' : s === 'dotted' ? 'border-t-2 border-dotted' : 'border-t-2'} border-current`} />
                </button>
              ))}
            </Section>
          )}

          {showSloppinessSection && (
            <Section title="Sloppiness">
              {[
                { value: 0, title: 'Limpo e acabado' },
                { value: 1, title: 'Traço tipo lápis (bem feito)' },
                { value: 2, title: 'Traço tipo lápis (rascunho)' },
              ].map(({ value, title }) => (
                <button
                  key={value}
                  title={title}
                  onClick={() => updateElements({ sloppiness: value })}
                  className={`w-10 h-10 rounded-md border flex items-center justify-center transition-all ${first.sloppiness === value ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                >
                  {value === 0 && (
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12.038c1.655-.885 5.9-3.292 8.568-4.354 2.668-1.063.101 2.821 1.32 3.104 1.218.283 5.112-1.814 5.112-1.814" strokeWidth="1.25"></path></svg>
                  )}
                  {value === 1 && (
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12.563c1.655-.886 5.9-3.293 8.568-4.355 2.668-1.062.101 2.822 1.32 3.105 1.218.283 5.112-1.814 5.112-1.814m-13.469 2.23c2.963-1.586 6.13-5.62 7.468-4.998 1.338.623-1.153 4.11-.132 5.595 1.02 1.487 6.133-1.43 6.133-1.43" strokeWidth="1.25"></path></svg>
                  )}
                  {value === 2 && (
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 11.936c1.737-.879 8.627-5.346 10.42-5.268 1.795.078-.418 5.138.345 5.736.763.598 3.53-1.789 4.235-2.147M2.929 9.788c1.164-.519 5.47-3.28 6.987-3.114 1.519.165 1 3.827 2.121 4.109 1.122.281 3.839-2.016 4.606-2.42" strokeWidth="1.25"></path></svg>
                  )}
                </button>
              ))}
            </Section>
          )}

          {showEdgesSection && (
            <Section title="Edges">
              {(['sharp', 'round'] as const).map(e => (
                <button
                  key={e}
                  onClick={() => updateElements({ edges: e })}
                  className={`w-10 h-10 rounded-md border flex items-center justify-center transition-all ${first.edges === e ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                >
                  {e === 'sharp' ? <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><svg strokeWidth="1.5"><path d="M3.33334 9.99998V6.66665C3.33334 6.04326 3.33403 4.9332 3.33539 3.33646C4.95233 3.33436 6.06276 3.33331 6.66668 3.33331H10"></path><path d="M13.3333 3.33331V3.34331"></path><path d="M16.6667 3.33331V3.34331"></path><path d="M16.6667 6.66669V6.67669"></path><path d="M16.6667 10V10.01"></path><path d="M3.33334 13.3333V13.3433"></path><path d="M16.6667 13.3333V13.3433"></path><path d="M3.33334 16.6667V16.6767"></path><path d="M6.66666 16.6667V16.6767"></path><path d="M10 16.6667V16.6767"></path><path d="M13.3333 16.6667V16.6767"></path><path d="M16.6667 16.6667V16.6767"></path></svg></svg> : <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M4 12v-4a4 4 0 0 1 4 -4h4"></path><line x1="16" y1="4" x2="16" y2="4.01"></line><line x1="20" y1="4" x2="20" y2="4.01"></line><line x1="20" y1="8" x2="20" y2="8.01"></line><line x1="20" y1="12" x2="20" y2="12.01"></line><line x1="4" y1="16" x2="4" y2="16.01"></line><line x1="20" y1="16" x2="20" y2="16.01"></line><line x1="4" y1="20" x2="4" y2="20.01"></line><line x1="8" y1="20" x2="8" y2="20.01"></line><line x1="12" y1="20" x2="12" y2="20.01"></line><line x1="16" y1="20" x2="16" y2="20.01"></line><line x1="20" y1="20" x2="20" y2="20.01"></line></g></svg>}
                </button>
              ))}
            </Section>
          )}

          {showArrowSection && (
            <>
              <Section title="Pontos de quebra">
                {breakpointOptions.map(({ value, icon }) => (
                  <button
                    key={value}
                    title={`${value} pontos`}
                    onClick={() =>
                      updateElements({
                        arrowBreakPoints: value,
                        arrowType: value === 5 ? 'double' : 'simple',
                      })
                    }
                    className={`w-10 h-10 rounded-md border flex items-center justify-center transition-all text-xs font-semibold ${(first.arrowBreakPoints ?? 3) === value ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                  >
                    {icon}
                  </button>
                ))}
              </Section>
              <Section title="Arrowheads">
                <div className="flex flex-wrap items-center gap-2 w-full">
                  <span className="text-[11px] text-gray-500 dark:text-neutral-400 w-full">Ponta no fim</span>
                  {[true, false].map(ah => (
                    <button
                      key={String(ah)}
                      onClick={() => updateElements({ arrowheads: ah })}
                      className={`w-10 h-10 rounded-md border flex items-center justify-center transition-all ${(first.arrowheads ?? true) === ah ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                    >
                      {ah ? <ArrowRight size={20} /> : <Minus size={20} />}
                    </button>
                  ))}
                  <span className="text-[11px] text-gray-500 dark:text-neutral-400 w-full mt-1">Ponta no início (duas pontas)</span>
                  <button
                    onClick={() => updateElements({ arrowheadTail: !(first.arrowheadTail ?? false) })}
                    className={`w-10 h-10 rounded-md border flex items-center justify-center transition-all ${first.arrowheadTail ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                    title="Cabeça no tail (seta dupla)"
                  >
                    <ArrowLeftRight size={20} />
                  </button>
                  <div className="w-full mt-1 relative">
                    <span className="text-[11px] text-gray-500 dark:text-neutral-400 block mb-1">Estilo da ponta</span>
                    <ArrowheadStylePicker value={first.arrowheadStyle ?? 'triangle'} onChange={(s) => updateElements({ arrowheadStyle: s })} />
                  </div>
                </div>
              </Section>
            </>
          )}

          {showTextSection && (
            <>
              <Section title="Font Family">
                {['Sans-serif', 'Serif', 'Monospace'].map(f => (
                  <button
                    key={f}
                    onClick={() => updateElements({ fontFamily: f })}
                    className={`px-3 py-2 text-[11px] font-medium rounded-xl border transition-all ${first.fontFamily === f ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                  >
                    {f}
                  </button>
                ))}
              </Section>
              <Section title="Font Size">
                {[16, 20, 24, 32].map(s => (
                  <button
                    key={s}
                    onClick={() => updateElements({ fontSize: s })}
                    className={`w-10 h-10 rounded-md border flex items-center justify-center text-xs font-semibold transition-all ${first.fontSize === s ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                  >
                    {s}
                  </button>
                ))}
              </Section>
              <Section title="Align">
                {(['left', 'center', 'right'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => updateElements({ textAlign: a })}
                    className={`w-10 h-10 rounded-md border flex items-center justify-center transition-all ${first.textAlign === a ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-50 dark:border-neutral-700 bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-200 dark:hover:border-neutral-600'}`}
                  >
                    {a === 'left' ? <AlignLeft size={18} /> : a === 'center' ? <AlignCenter size={18} /> : <AlignRight size={18} />}
                  </button>
                ))}
              </Section>
            </>
          )}

          <Section title={`Opacity (${Math.round(first.opacity * 100)}%)`} className="mb-0">
            <input
              type="range" min="0" max="100" step="1"
              value={Math.round(first.opacity * 100)}
              onChange={(e) => updateElements({ opacity: parseInt(e.target.value, 10) / 100 })}
              className="w-full h-2 bg-gray-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </Section>
        </div>
      ))}

      {activeMobilePanel === 'layers' && mobileModal('Layers', (
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => onLayerChange('front')} title="To Front" className="h-11 rounded-xl bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center justify-center text-black dark:text-white transition-all"><ArrowDownToLine size={16} /></button>
          <button onClick={() => onLayerChange('forward')} title="Forward" className="h-11 rounded-xl bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center justify-center text-black dark:text-white transition-all"><MoveDown size={16} /></button>
          <button onClick={() => onLayerChange('backward')} title="Backward" className="h-11 rounded-xl bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center justify-center text-black dark:text-white transition-all"><MoveUp size={16} /></button>
          <button onClick={() => onLayerChange('back')} title="To Back" className="h-11 rounded-xl bg-gray-50/30 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center justify-center text-black dark:text-white transition-all"><ArrowUpToLine size={16} /></button>
        </div>
      ))}
    </>
  );
}
