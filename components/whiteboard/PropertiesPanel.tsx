'use client';

import React from 'react';
import { WhiteboardElement } from '@/lib/db';
import { 
  Square, Minus, Type, Layers, ChevronUp, ChevronDown, 
  ArrowUp, ArrowDown, AlignLeft, AlignCenter, AlignRight,
  Maximize, Minimize, MinusSquare, Square as SquareIcon,
  Circle as CircleIcon, ArrowRight, MousePointer2, Eraser
} from 'lucide-react';

interface PropertiesPanelProps {
  activeTool: string;
  selectedElements: WhiteboardElement[];
  updateElements: (updates: Partial<WhiteboardElement>) => void;
  onLayerChange: (action: 'front' | 'back' | 'forward' | 'backward') => void;
}

const STROKE_COLORS = ['#1e1e1e', '#e03131', '#2f9e41', '#1971c2', '#f08c00'];
const BG_COLORS = ['transparent', '#ffec99', '#b2f2bb', '#a5d8ff', '#ffc9c9'];

const DEFAULT_ELEMENT: Partial<WhiteboardElement> = {
  stroke: '#1e1e1e',
  fill: 'transparent',
  strokeWidth: 2,
  strokeStyle: 'solid',
  sloppiness: 1,
  edges: 'sharp',
  opacity: 1,
  arrowType: 'simple',
  arrowheads: true,
  fontFamily: 'Sans-serif',
  fontSize: 20,
  textAlign: 'left',
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  activeTool,
  selectedElements, 
  updateElements,
  onLayerChange 
}) => {
  const isDrawingTool = ['rectangle', 'circle', 'triangle', 'line', 'arrow', 'pencil', 'text', 'image'].includes(activeTool);
  
  if (selectedElements.length === 0 && !isDrawingTool) return null;

  const first = selectedElements.length > 0 ? selectedElements[0] : DEFAULT_ELEMENT as WhiteboardElement;
  const type = selectedElements.length > 0 ? first.type : activeTool as any;

  const Section = ({ title, children, className = "" }: { title: string; children: React.ReactNode, className?: string }) => (
    <div className={`mb-5 ${className}`}>
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{title}</h4>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  const isShape = ['rectangle', 'circle', 'triangle', 'diamond', 'line', 'arrow'].includes(type);
  const isPencil = type === 'pencil';
  const isText = type === 'text';
  const isImage = type === 'image';

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 w-64 bg-white border border-gray-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-5 z-50 max-h-[85vh] overflow-y-auto custom-scrollbar transition-all duration-300">
      
      {/* STROKE COLORS */}
      {(isShape || isPencil || isText) && (
        <Section title="Stroke">
          <div className="flex items-center gap-1.5 w-full">
            {STROKE_COLORS.map(c => (
              <button
                key={c}
                className={`w-7 h-7 rounded-lg border transition-all ${first.stroke === c ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
                style={{ backgroundColor: c }}
                onClick={() => updateElements({ stroke: c })}
              />
            ))}
            <div className="w-[1.5px] h-5 bg-gray-200 mx-1 flex-shrink-0" />
            <div className="relative w-7 h-7 rounded-lg border border-gray-100 overflow-hidden cursor-pointer hover:border-gray-300 transition-all shadow-sm">
              <input 
                type="color" 
                value={first.stroke.startsWith('#') ? first.stroke : '#000000'} 
                onChange={(e) => updateElements({ stroke: e.target.value })}
                className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer border-none"
              />
            </div>
          </div>
        </Section>
      )}

      {/* BACKGROUND COLORS */}
      {(isShape || isPencil || isText) && (
        <Section title="Background">
          <div className="flex items-center gap-1.5 w-full">
            {BG_COLORS.map((c, i) => (
              <button
                key={c + i}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${first.fill === c ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
                style={{ backgroundColor: c === 'transparent' ? 'white' : c }}
                onClick={() => updateElements({ fill: c })}
              >
                {c === 'transparent' && <Minus size={14} className="rotate-45 text-gray-400" />}
              </button>
            ))}
            <div className="w-[1.5px] h-5 bg-gray-200 mx-1 flex-shrink-0" />
            <div className="relative w-7 h-7 rounded-lg border border-gray-100 overflow-hidden cursor-pointer hover:border-gray-300 transition-all shadow-sm">
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
      {(isShape || isPencil) && (
        <Section title="Stroke Width">
          {[2, 4, 8].map((w, i) => (
            <button
              key={w}
              onClick={() => updateElements({ strokeWidth: w })}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${first.strokeWidth === w ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
            >
              <div style={{ height: (i + 1) * 2, width: '65%', backgroundColor: 'currentColor', borderRadius: 4 }} />
            </button>
          ))}
        </Section>
      )}

      {/* STROKE STYLE */}
      {isShape && (
        <Section title="Stroke Style">
          {(['solid', 'dashed', 'dotted'] as const).map(s => (
            <button
              key={s}
              onClick={() => updateElements({ strokeStyle: s })}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${first.strokeStyle === s ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
            >
              <div className={`w-3/4 h-0 ${s === 'dashed' ? 'border-t-2 border-dashed' : s === 'dotted' ? 'border-t-2 border-dotted' : 'border-t-2'} border-current`} />
            </button>
          ))}
        </Section>
      )}

      {/* SLOPPINESS */}
      {isShape && (
        <Section title="Sloppiness">
          {[0, 1, 2].map(s => (
            <button
              key={s}
              onClick={() => updateElements({ sloppiness: s })}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${first.sloppiness === s ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
            >
              {s === 0 ? 'S' : s === 1 ? 'M' : 'L'}
            </button>
          ))}
        </Section>
      )}

      {/* EDGES */}
      {(['rectangle', 'triangle', 'diamond', 'line', 'image'].includes(type)) && (
        <Section title="Edges">
          {(['sharp', 'round'] as const).map(e => (
            <button
              key={e}
              onClick={() => updateElements({ edges: e })}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${first.edges === e ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
            >
              {e === 'sharp' ? <SquareIcon size={18} /> : <CircleIcon size={18} />}
            </button>
          ))}
        </Section>
      )}

      {/* ARROW TYPE */}
      {type === 'arrow' && (
        <>
          <Section title="Arrow Type">
            {(['simple', 'double', 'circle'] as const).map(at => (
              <button
                key={at}
                onClick={() => updateElements({ arrowType: at })}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${first.arrowType === at ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
              >
                {at === 'simple' ? <ArrowRight size={20} /> : at === 'double' ? <Maximize size={20} /> : <CircleIcon size={18} />}
              </button>
            ))}
          </Section>
          <Section title="Arrowheads">
            {[true, false].map(ah => (
              <button
                key={String(ah)}
                onClick={() => updateElements({ arrowheads: ah })}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${first.arrowheads === ah ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
              >
                {ah ? <ArrowRight size={20} /> : <Minus size={20} />}
              </button>
            ))}
          </Section>
        </>
      )}

      {/* TEXT SPECIFIC */}
      {isText && (
        <>
          <Section title="Font Family">
            {['Sans-serif', 'Serif', 'Monospace'].map(f => (
              <button
                key={f}
                onClick={() => updateElements({ fontFamily: f })}
                className={`px-3 py-2 text-[11px] font-medium rounded-xl border transition-all ${first.fontFamily === f ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
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
                className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xs font-semibold transition-all ${first.fontSize === s ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
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
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${first.textAlign === a ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-50 bg-gray-50/30 hover:bg-gray-100 hover:border-gray-200'}`}
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
          onChange={(e) => updateElements({ opacity: parseInt(e.target.value) / 100 })}
          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </Section>

      {/* LAYERS */}
      <Section title="Layers" className="mb-0">
        <div className="grid grid-cols-4 gap-2 w-full">
          <button onClick={() => onLayerChange('front')} title="To Front" className="w-full h-11 border border-gray-50 bg-gray-50/30 rounded-xl hover:bg-gray-100 hover:border-gray-200 flex items-center justify-center text-gray-500 transition-all"><ArrowUp size={20} /></button>
          <button onClick={() => onLayerChange('forward')} title="Forward" className="w-full h-11 border border-gray-50 bg-gray-50/30 rounded-xl hover:bg-gray-100 hover:border-gray-200 flex items-center justify-center text-gray-500 transition-all"><ChevronUp size={20} /></button>
          <button onClick={() => onLayerChange('backward')} title="Backward" className="w-full h-11 border border-gray-50 bg-gray-50/30 rounded-xl hover:bg-gray-100 hover:border-gray-200 flex items-center justify-center text-gray-500 transition-all"><ChevronDown size={20} /></button>
          <button onClick={() => onLayerChange('back')} title="To Back" className="w-full h-11 border border-gray-50 bg-gray-50/30 rounded-xl hover:bg-gray-100 hover:border-gray-200 flex items-center justify-center text-gray-500 transition-all"><ArrowDown size={20} /></button>
        </div>
      </Section>

    </div>
  );
};
