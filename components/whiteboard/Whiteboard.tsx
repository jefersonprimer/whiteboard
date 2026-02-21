'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Toolbar, Tool } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { db, WhiteboardElement } from '@/lib/db';
import { useHistoryState } from '@/lib/useHistoryState';
import { Plus, Minus, Undo2, Redo2, ShieldCheck, HelpCircle } from 'lucide-react';

const Canvas = dynamic(() => import('./Canvas').then((mod) => mod.Canvas), {
  ssr: false,
});

export default function Whiteboard() {
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const { elements, setElements, saveHistory, undo, redo, canUndo, canRedo } = useHistoryState([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [defaultProps, setDefaultProps] = useState<Partial<WhiteboardElement>>({
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
  });

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleClearCanvas = useCallback(async () => {
    if (confirm('Are you sure you want to clear the entire canvas?')) {
      saveHistory([]);
    }
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

    const updatedElements = elements.map(el => {
      if (selectedIds.includes(el.id)) {
        return { ...el, ...updates };
      }
      return el;
    });

    // For property updates, we might want to save history only when the interaction finishes
    // But for now, let's just save it. In a real app, we'd debounce this or use an 'onFinishChange' event.
    saveHistory(updatedElements);
  }, [elements, selectedIds, saveHistory]);

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
  const isDrawingTool = ['rectangle', 'circle', 'triangle', 'diamond', 'line', 'arrow', 'pencil', 'text', 'image'].includes(activeTool);

  return (
    <div className="relative w-full h-screen bg-gray-50">
      <Toolbar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        onClearCanvas={handleClearCanvas}
        onImageUpload={handleImageUpload}
      />
      <Canvas 
        activeTool={activeTool} 
        elements={elements} 
        setElements={setElements}
        saveHistory={saveHistory}
        undo={undo}
        redo={redo}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        defaultProps={defaultProps}
        zoom={zoom}
      />
      {(selectedIds.length > 0 || isDrawingTool) && (
        <PropertiesPanel 
          activeTool={activeTool}
          selectedElements={selectedElements.length > 0 ? selectedElements : [defaultProps as WhiteboardElement]}
          updateElements={updateElements}
          onLayerChange={handleLayerChange}
        />
      )}

      {/* Bottom Left Controls */}
      <div className="fixed bottom-4 left-4 flex items-center gap-2 z-50">
        {/* Zoom Control */}
        <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-lg p-1 gap-2">
          <button
            onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
          <div className="w-12 text-center text-sm font-medium text-gray-700 select-none">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom(Math.min(5, zoom + 0.1))}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Undo/Redo Control */}
        <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-lg p-1 gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${canUndo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${canRedo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
            title="Redo (Ctrl+R / Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      {/* Bottom Right Controls */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 z-50">
        <div 
          className="flex items-center bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-green-600 cursor-help"
          title="seus desenhos sao salvos em seu proprio navegador, eles nao sao mandados para nossos servidores"
        >
          <ShieldCheck size={20} />
        </div>
        <button 
          className="flex items-center bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
          title="Help?"
        >
          <HelpCircle size={20} />
        </button>
      </div>
    </div>
  );
}
