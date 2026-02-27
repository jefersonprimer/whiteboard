'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Toolbar, Tool, ExtraTool } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { db, WhiteboardElement } from '@/lib/db';
import { useHistoryState } from '@/lib/useHistoryState';
import { Plus, Minus, Undo2, Redo2, ShieldCheck, HelpCircle, Menu, X, Share2, PanelRight } from 'lucide-react';
import Sidebar from './Sidebar';
import { useTheme } from '@/app/contexts/ThemeContext';

import { SaveModal } from './SaveModal';
import { OpenModal } from './OpenModal';
import { ClearCanvasModal } from './ClearCanvasModal';
import { ShortcutsModal } from './ShortcutsModal';
import LiveCollaborationModal from './LiveCollaborationModal';
import LibrarySidebar from './LibrarySidebar';
import { ShareLinkModal } from './ShareLinkModal';

import { getElementsFromHash, getShareableLink } from '@/lib/fileService';

const Canvas = dynamic(() => import('./Canvas').then((mod) => mod.Canvas), {
  ssr: false,
});

export default function Whiteboard() {
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [activeExtraTool, setActiveExtraTool] = useState<ExtraTool>('none');
  const { elements, setElements, saveHistory, undo, redo, canUndo, canRedo } = useHistoryState([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isClearCanvasModalOpen, setIsClearCanvasModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isLiveCollaborationModalOpen, setIsLiveCollaborationModalOpen] = useState(false);
  const [isLibrarySidebarOpen, setIsLibrarySidebarOpen] = useState(false);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [elementsFromHash, setElementsFromHash] = useState<WhiteboardElement[] | null>(null);
  const [canvasBackground, setCanvasBackground] = useState<string>('bg-gray-50');
  const [defaultProps, setDefaultProps] = useState<Partial<WhiteboardElement>>({
    stroke: '#1e1e1e',
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
  });

  // Ref to always have latest elements (avoids stale closure when panel updates after transform)
  const elementsRef = useRef(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const { resolvedTheme, mounted } = useTheme();
  const LIGHT_BG = ['bg-white', 'bg-gray-50', 'bg-neutral-100', 'bg-neutral-200', 'bg-neutral-300', 'bg-yellow-100'];
  const DARK_BG = ['bg-neutral-900', 'bg-gray-800', 'bg-slate-900', 'bg-zinc-900', 'bg-gray-950', 'bg-stone-950'];

  // Load saved view state from localStorage (zoom/position)
  useEffect(() => {
    const savedZoom = localStorage.getItem('whiteboard-zoom');
    const savedPosition = localStorage.getItem('whiteboard-position');
    if (savedZoom) {
      const zoomValue = parseFloat(savedZoom);
      if (!isNaN(zoomValue) && zoomValue >= 0.1 && zoomValue <= 5) {
        setZoom(zoomValue);
      }
    }

    if (savedPosition) {
      try {
        const position = JSON.parse(savedPosition);
        if (position && typeof position.x === 'number' && typeof position.y === 'number') {
          setStagePosition(position);
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Sync canvas background when theme changes:
  // - always switch between light/dark defaults
  // - but remember the last background chosen for each theme separately
  useEffect(() => {
    if (!mounted) return;

    const key =
      resolvedTheme === 'dark'
        ? 'whiteboard-background-dark'
        : 'whiteboard-background-light';

    const savedPerTheme = localStorage.getItem(key);

    if (savedPerTheme) {
      setCanvasBackground(savedPerTheme);
      return;
    }

    // No saved background yet for this theme: pick a sensible default
    if (resolvedTheme === 'dark') {
      setCanvasBackground('bg-neutral-900');
    } else {
      setCanvasBackground('bg-gray-50');
    }
  }, [resolvedTheme, mounted]);

  // Default stroke: black in light mode, white in dark mode (figures, arrow, line, text visible on canvas)
  useEffect(() => {
    setDefaultProps((prev) => ({
      ...prev,
      stroke: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
    }));
  }, [resolvedTheme]);

  // Save zoom to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('whiteboard-zoom', zoom.toString());
  }, [zoom]);

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('whiteboard-position', JSON.stringify(stagePosition));
  }, [stagePosition]);

  useEffect(() => {
    const handleUpdateZoom = (e: any) => {
      setZoom(e.detail.zoom);
    };
    window.addEventListener('update-zoom', handleUpdateZoom);
    return () => window.removeEventListener('update-zoom', handleUpdateZoom);
  }, []);

  useEffect(() => {
    const loadElements = async () => {
      const storedElements = await db.elements.toArray();
      setElements(storedElements);
    };
    loadElements();
  }, [setElements]);

  // Open replace modal when app is loaded with a share link (#json=...)
  useEffect(() => {
    const fromHash = getElementsFromHash();
    if (fromHash) {
      setElementsFromHash(fromHash);
      setIsOpenModalOpen(true);
    }
  }, []);

  const handleOpenModalClose = useCallback(() => {
    setIsOpenModalOpen(false);
    setElementsFromHash(null);
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Handle Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we are in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable ||
        document.getElementById('whiteboard-textarea');

      if (isInput) return;

      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Undo: Ctrl+Z (without Shift)
      if (isCtrl && key === 'z' && !isShift) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Y, Ctrl+Shift+Z, or Ctrl+R
      else if (isCtrl && (key === 'y' || (key === 'z' && isShift) || key === 'r')) {
        e.preventDefault();
        redo();
      }
      // Open: Ctrl+O
      else if (isCtrl && key === 'o') {
        e.preventDefault();
        setIsOpenModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleClearCanvas = useCallback(() => {
    setIsClearCanvasModalOpen(true);
  }, []);

  const handleConfirmClearCanvas = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  const handleReplaceElements = useCallback((newElements: WhiteboardElement[]) => {
    saveHistory(newElements);
  }, [saveHistory]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        window.dispatchEvent(new CustomEvent('add-image', { detail: { src } }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const updateElements = useCallback(async (updates: Partial<WhiteboardElement>) => {
    if (selectedIds.length === 0) {
      setDefaultProps(prev => ({ ...prev, ...updates }));
      return;
    }

    // Use elementsRef so we always merge into the latest state (preserves width/height after resize)
    const currentElements = elementsRef.current;
    const updatedElements = currentElements.map(el => {
      if (!selectedIds.includes(el.id)) return el;
      const merged = { ...el, ...updates };
      if (el.type === 'arrow' && updates.arrowBreakPoints != null && el.points && el.points.length >= 4) {
        const targetN = updates.arrowBreakPoints;
        const currentN = el.points.length / 2;
        if (targetN !== currentN) {
          const pts = el.points;
          const out: number[] = [];
          for (let i = 0; i < targetN; i++) {
            const t = i / (targetN - 1);
            const idx = t * (currentN - 1);
            const lo = Math.floor(idx);
            const hi = Math.min(lo + 1, currentN - 1);
            const f = idx - lo;
            const x = (pts[lo * 2] ?? 0) * (1 - f) + (pts[hi * 2] ?? 0) * f;
            const y = (pts[lo * 2 + 1] ?? 0) * (1 - f) + (pts[hi * 2 + 1] ?? 0) * f;
            out.push(x, y);
          }
          merged.points = out;
        }
      }
      return merged;
    });

    saveHistory(updatedElements);
  }, [selectedIds, saveHistory]);

  const handleLayerChange = useCallback(async (action: 'front' | 'back' | 'forward' | 'backward') => {
    if (selectedIds.length === 0) return;

    let newElements = [...elements];
    const selectedIndices = selectedIds.map(id => newElements.findIndex(el => el.id === id)).sort((a, b) => a - b);

    if (action === 'front') {
      const selected = newElements.filter(el => selectedIds.includes(el.id));
      const remaining = newElements.filter(el => !selectedIds.includes(el.id));
      newElements = [...remaining, ...selected];
    } else if (action === 'back') {
      const selected = newElements.filter(el => selectedIds.includes(el.id));
      const remaining = newElements.filter(el => !selectedIds.includes(el.id));
      newElements = [...selected, ...remaining];
    } else if (action === 'forward') {
      for (let i = selectedIndices.length - 1; i >= 0; i--) {
        const idx = selectedIndices[i];
        if (idx < newElements.length - 1 && !selectedIds.includes(newElements[idx + 1].id)) {
          [newElements[idx], newElements[idx + 1]] = [newElements[idx + 1], newElements[idx]];
        }
      }
    } else if (action === 'backward') {
      for (let i = 0; i < selectedIndices.length; i++) {
        const idx = selectedIndices[i];
        if (idx > 0 && !selectedIds.includes(newElements[idx - 1].id)) {
          [newElements[idx], newElements[idx - 1]] = [newElements[idx - 1], newElements[idx]];
        }
      }
    }

    saveHistory(newElements);
  }, [elements, selectedIds, saveHistory]);

  const selectedElements = elements.filter(el => selectedIds.includes(el.id));

  const handleCanvasBackgroundChange = useCallback((color: string) => {
    setCanvasBackground(color);
    if (typeof window !== 'undefined') {
      const key =
        resolvedTheme === 'dark'
          ? 'whiteboard-background-dark'
          : 'whiteboard-background-light';
      localStorage.setItem(key, color);
    }
  }, [resolvedTheme]);

  const isTailwindBackground = canvasBackground.startsWith('bg-');

  return (
    <div
      className={`relative w-full h-screen overflow-hidden ${isTailwindBackground ? canvasBackground : ''}`}
      style={!isTailwindBackground ? { backgroundColor: canvasBackground } : undefined}
    >
      {/* Menu Button */}
      <div className="fixed top-4 left-4 z-[100]">
        <button
          onClick={() => {
            setIsSidebarOpen((v) => !v);
            setIsLibrarySidebarOpen(false);
          }}
          className="p-2 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-white transition-all active:scale-95"
          title="Menu"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>


      <div className="fixed top-4 right-4 z-[100] space-x-2">
        <button
          onClick={() => {
            setShareLink(getShareableLink(elements));
            setIsShareLinkModalOpen(true);
          }}
          className="p-2 bg-blue-400 hover:bg-blue-500 border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg text-white transition-all active:scale-95"
          title="Share"
        >
          <Share2 size={20} />
        </button>

        <button
          onClick={() => {
            setIsLibrarySidebarOpen((v) => !v);
            setIsSidebarOpen(false);
          }}
          className="p-2 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-white transition-all active:scale-95"
          title="Library"
        >
          <PanelRight size={20} />
        </button>
      </div>

      {/* Sidebar Overlay and Sidebar */}
      <div
        className={`fixed inset-0 z-[90] transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className="absolute inset-0 bg-transparent"
          onClick={() => setIsSidebarOpen(false)}
        />
        <div
          ref={sidebarRef}
          className={`absolute top-16 left-4  transition-all duration-200 ease-out origin-top-left ${isSidebarOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            }`}
        >
          <Sidebar
            onOpenClick={() => setIsOpenModalOpen(true)}
            onSaveClick={() => setIsSaveModalOpen(true)}
            onResetCanvas={handleClearCanvas}
            canvasBackground={canvasBackground}
            onCanvasBackgroundChange={handleCanvasBackgroundChange}
            onLiveCollaborationClick={() => setIsLiveCollaborationModalOpen(true)}
          />
        </div>
      </div>

      {/* Library Sidebar Overlay and Sidebar */}
      <div
        className={`fixed inset-0 z-[90] transition-opacity duration-200 ${isLibrarySidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className="absolute inset-0 bg-transparent"
          onClick={() => setIsLibrarySidebarOpen(false)}
        />
        <div
          className={`absolute top-16 right-4 transition-all duration-200 ease-out origin-top-right ${isLibrarySidebarOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            }`}
        >
          <LibrarySidebar onClose={() => setIsLibrarySidebarOpen(false)} />
        </div>
      </div>

      {/* Modals */}
      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        elements={elements}
      />
      <OpenModal
        isOpen={isOpenModalOpen}
        onClose={handleOpenModalClose}
        currentElements={elements}
        onReplace={handleReplaceElements}
        elementsFromHash={elementsFromHash}
      />
      <ClearCanvasModal
        isOpen={isClearCanvasModalOpen}
        onClose={() => setIsClearCanvasModalOpen(false)}
        onConfirm={handleConfirmClearCanvas}
      />
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
      <LiveCollaborationModal
        isOpen={isLiveCollaborationModalOpen}
        onClose={() => setIsLiveCollaborationModalOpen(false)}
      />
      <ShareLinkModal
        isOpen={isShareLinkModalOpen}
        onClose={() => setIsShareLinkModalOpen(false)}
        link={shareLink}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onClearCanvas={handleClearCanvas}
        onImageUpload={handleImageUpload}
        onHelpClick={() => setIsShortcutsModalOpen(true)}
        activeExtraTool={activeExtraTool}
        setActiveExtraTool={setActiveExtraTool}
      />
      <Canvas
        activeTool={activeTool}
        extraTool={activeExtraTool}
        elements={elements}
        setElements={setElements}
        saveHistory={saveHistory}
        undo={undo}
        redo={redo}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        defaultProps={defaultProps}
        zoom={zoom}
        stagePosition={stagePosition}
        setStagePosition={setStagePosition}
        canvasBackground={canvasBackground}
      />
      {selectedIds.length > 0 && (
        <PropertiesPanel
          activeTool={activeTool}
          selectedElements={selectedElements}
          updateElements={updateElements}
          onLayerChange={handleLayerChange}
        />
      )}

      {/* Bottom Left Controls */}
      <div className="fixed bottom-4 left-4 flex items-center gap-2 z-50">
        {/* Zoom Control */}
        <div className="flex items-center bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg p-1 gap-2">
          <button
            onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-white transition-colors"
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
          <div className="w-12 text-center text-sm font-medium text-gray-700 dark:text-white select-none">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom(Math.min(5, zoom + 0.1))}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-white transition-colors"
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Undo/Redo Control */}
        <div className="flex items-center bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg p-1 gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${canUndo ? 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-800' : 'text-gray-300 dark:text-neutral-500 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${canRedo ? 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-800' : 'text-gray-300 dark:text-neutral-500 cursor-not-allowed'}`}
            title="Redo (Ctrl+R / Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      {/* Bottom Right Controls */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 z-50">
        <div
          className="flex items-center bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg p-2 text-[#6965db] dark:text-[#a8a5ff] cursor-help"
          title="seus desenhos sao salvos em seu proprio navegador, eles nao sao mandados para nossos servidores"
        >
          <ShieldCheck size={20} />
        </div>
        <button
          onClick={() => setIsShortcutsModalOpen(true)}
          className="flex items-center bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg p-2 text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          title="Shortcuts (?)"
        >
          <HelpCircle size={20} />
        </button>
      </div>
    </div>
  );
}
