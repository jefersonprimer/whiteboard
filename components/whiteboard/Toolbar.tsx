'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Hand, MousePointer2, Square, Circle, Type, Minus, Triangle, ArrowRight, Pencil, Image as ImageIcon, Eraser, Diamond, Trash2, Sun, Moon, Globe2, LassoSelect, ChevronDown, Check, Hash } from 'lucide-react';
import LaserIcon from '@/app/components/LaserIcon';
import { useTheme } from '@/app/contexts/ThemeContext';

export type Tool = 'hand' | 'select' | 'rectangle' | 'diamond' | 'triangle' | 'circle' | 'arrow' | 'line' | 'pencil' | 'text' | 'image' | 'eraser';

export type ExtraTool = 'none' | 'frame' | 'web-embed' | 'laser-pointer' | 'lasso-selection';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onClearCanvas: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHelpClick?: () => void;
  activeExtraTool: ExtraTool;
  setActiveExtraTool: (tool: ExtraTool) => void;
}

// Shortcut mapping: key -> tool (t=text, g=triangle/triângulo to avoid conflict)
const SHORTCUT_MAP: Record<string, Tool> = {
  'h': 'hand', 's': 'select', 'r': 'rectangle', 'd': 'diamond', 'c': 'circle',
  'a': 'arrow', 'l': 'line', 'p': 'pencil', 'g': 'triangle', 't': 'text', 'i': 'image', 'e': 'eraser',
  '1': 'select', '2': 'rectangle', '3': 'diamond', '4': 'triangle', '5': 'circle',
  '6': 'arrow', '7': 'line', '8': 'pencil', '9': 'text', '0': 'image'
};

const TOOL_SHORTCUT_NUMBER: Partial<Record<Tool, number>> = {
  select: 1, rectangle: 2, diamond: 3, triangle: 4, circle: 5,
  arrow: 6, line: 7, pencil: 8, text: 9, image: 0
};

const TOOL_SHORTCUT_LETTER: Partial<Record<Tool, string>> = {

  eraser: 'e'
};

const CC_DELAY_MS = 400;

const extraTools: { id: Exclude<ExtraTool, 'none'>; label: string; icon: React.ReactNode }[] = [
  { id: 'frame', label: 'Frame tool', icon: <Hash size={18} /> },
  { id: 'web-embed', label: 'Web embed', icon: <Globe2 size={18} /> },
  { id: 'laser-pointer', label: 'Laser pointer', icon: <LaserIcon size={18} /> },
  { id: 'lasso-selection', label: 'Lasso selection', icon: <LassoSelect size={18} /> },
];

const tools: { id: Tool; icon: React.ReactNode; label: string; isAction?: boolean }[] = [
  { id: 'hand', icon: <Hand size={18} />, label: 'Pan' },
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select' },
  { id: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
  { id: 'diamond', icon: <Diamond size={18} />, label: 'Diamond' },
  { id: 'triangle', icon: <Triangle size={18} />, label: 'Triangle' },
  { id: 'circle', icon: <Circle size={18} />, label: 'Circle' },
  { id: 'arrow', icon: <ArrowRight size={18} />, label: 'Arrow' },
  { id: 'line', icon: <Minus size={18} />, label: 'Line' },
  { id: 'pencil', icon: <Pencil size={18} />, label: 'Pencil' },
  { id: 'text', icon: <Type size={18} />, label: 'Text' },
  { id: 'image', icon: <ImageIcon size={18} />, label: 'Image' },
  { id: 'eraser', icon: <Eraser size={18} />, label: 'Eraser' },
];

interface ExtraToolDropdownProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  activeExtraTool: ExtraTool;
  onSelect: (tool: Exclude<ExtraTool, 'none'>) => void;
  onClose: () => void;
}

const ExtraToolDropdown: React.FC<ExtraToolDropdownProps> = ({
  isOpen,
  position,
  activeExtraTool,
  onSelect,
  onClose,
}) => {
  if (!isOpen || !position) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-200" onClick={onClose}>
      <div
        className="absolute z-201 w-48 bg-white dark:bg-[#1C1C1C] rounded-md shadow-lg border border-neutral-200 dark:border-neutral-800"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-1">
          {extraTools.map((option) => {
            const isActive = option.id === activeExtraTool;
            return (
              <button
                key={option.id}
                onClick={() => onSelect(option.id)}
                className={`flex items-center justify-between w-full px-3 py-2 text-left text-sm rounded-sm transition-colors ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-neutral-600 dark:text-neutral-300">
                    {option.icon}
                  </span>
                  <span>{option.label}</span>
                </span>
                {isActive && (
                  <Check className="text-blue-500 dark:text-blue-400" size={16} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClearCanvas,
  onImageUpload,
  onHelpClick,
  activeExtraTool,
  setActiveExtraTool
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const lastCKeyRef = React.useRef<number>(0);
  const { resolvedTheme, setTheme } = useTheme();
  const [isExtraToolModalOpen, setIsExtraToolModalOpen] = React.useState(false);
  const currentExtraTool = extraTools.find((tool) => tool.id === activeExtraTool) ?? extraTools[0];
  const extraToolButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const [extraMenuPosition, setExtraMenuPosition] = React.useState<{ top: number; left: number } | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl+D - Dark theme
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setTheme('dark');
        return;
      }

      // Ctrl+L - Light theme
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setTheme('light');
        return;
      }

      // cc - Clear canvas (double-tap c)
      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const now = Date.now();
        if (now - lastCKeyRef.current < CC_DELAY_MS) {
          e.preventDefault();
          lastCKeyRef.current = 0;
          onClearCanvas();
          return;
        }
        lastCKeyRef.current = now;
      }

      // ? - Show shortcuts modal
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onHelpClick?.();
        return;
      }

      const key = e.key.toLowerCase();
      const tool = SHORTCUT_MAP[key];
      if (tool) {
        e.preventDefault();
        if (tool === 'image') {
          fileInputRef.current?.click();
        } else {
          setActiveTool(tool);
          setActiveExtraTool('none');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, onClearCanvas, onHelpClick, setTheme, setActiveExtraTool]);

  const handleThemeToggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleClick = (toolId: Tool) => {
    if (toolId === 'image') {
      fileInputRef.current?.click();
    } else {
      setActiveTool(toolId);
      setActiveExtraTool('none');
    }
  };

  const handleExtraButtonClick = () => {
    setIsExtraToolModalOpen((open) => {
      const willOpen = !open;
      if (willOpen && extraToolButtonRef.current) {
        const rect = extraToolButtonRef.current.getBoundingClientRect();
        setExtraMenuPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
      return willOpen;
    });
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg p-1 flex gap-1 z-50 overflow-x-auto max-w-[95vw] items-center">
      {tools.map((tool) => {
        const shortcutNum = TOOL_SHORTCUT_NUMBER[tool.id];
        const shortcutLetter = TOOL_SHORTCUT_LETTER[tool.id];
        const badge = shortcutLetter ?? (shortcutNum !== undefined ? String(shortcutNum) : undefined);
        return (
          <button
            key={tool.id}
            onClick={() => handleClick(tool.id)}
            className={`relative p-2 rounded-md transition-colors shrink-0 ${activeTool === tool.id && !tool.isAction && activeExtraTool === 'none'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-400'
                : tool.isAction
                  ? 'hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-600 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400'
                  : 'hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-300'
              }`}
            title={tool.label}
          >
            {tool.icon}
            {badge !== undefined && (
              <span className="absolute bottom-0.5 right-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 leading-none">
                {badge}
              </span>
            )}
          </button>
        );
      })}

      <div className="flex gap-1 border-l border-gray-200 dark:border-neutral-700 pl-1 ml-1 items-center">
        <button
          ref={extraToolButtonRef}
          onClick={handleExtraButtonClick}
          className={`p-2 rounded-md transition-colors flex items-center gap-1 ${activeExtraTool !== 'none'
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
          title={currentExtraTool.label}
        >
          <span className="flex items-center gap-1">
            <span className="text-gray-700 dark:text-neutral-200">
              {currentExtraTool.icon}
            </span>
            <ChevronDown size={14} className="text-neutral-400" />
          </span>
        </button>
        <button
          onClick={handleThemeToggle}
          className="p-2 rounded-md transition-colors text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
          title={resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={onClearCanvas}
          className="p-2 rounded-md transition-colors text-gray-600 dark:text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400"
          title="Clear Canvas (cc)"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onImageUpload}
        accept="image/*"
        className="hidden"
      />

      <ExtraToolDropdown
        isOpen={isExtraToolModalOpen}
        position={extraMenuPosition}
        activeExtraTool={activeExtraTool}
        onSelect={(tool) => {
          setActiveExtraTool(tool);
          setIsExtraToolModalOpen(false);
        }}
        onClose={() => setIsExtraToolModalOpen(false)}
      />
    </div>
  );
};
