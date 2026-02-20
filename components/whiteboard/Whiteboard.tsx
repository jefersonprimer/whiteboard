'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Toolbar, Tool } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { db, WhiteboardElement } from '@/lib/db';

const Canvas = dynamic(() => import('./Canvas').then((mod) => mod.Canvas), {
  ssr: false,
});

export default function Whiteboard() {
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
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
    const loadElements = async () => {
      const storedElements = await db.elements.toArray();
      setElements(storedElements);
    };
    loadElements();
  }, [refreshKey]);

  const handleClearCanvas = useCallback(async () => {
    if (confirm('Are you sure you want to clear the entire canvas?')) {
      await db.elements.clear();
      setElements([]);
      setSelectedIds([]);
      setRefreshKey(prev => prev + 1);
    }
  }, []);

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

    setElements(updatedElements);

    // Save to DB
    for (const id of selectedIds) {
      const el = updatedElements.find(e => e.id === id);
      if (el) await db.elements.put(el);
    }
  }, [elements, selectedIds]);

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

    setElements(newElements);
    // In a real app, we might want to update a 'zIndex' property or just re-save all to maintain order
    // For now, let's just clear and re-add to maintain IndexedDB order if that's how we're loading them
    await db.elements.clear();
    await db.elements.bulkAdd(newElements);
  }, [elements, selectedIds]);

  const selectedElements = elements.filter(el => selectedIds.includes(el.id));
  const isDrawingTool = ['rectangle', 'circle', 'triangle', 'line', 'arrow', 'pencil', 'text', 'image'].includes(activeTool);

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
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        defaultProps={defaultProps}
      />
      {(selectedIds.length > 0 || isDrawingTool) && (
        <PropertiesPanel 
          activeTool={activeTool}
          selectedElements={selectedElements.length > 0 ? selectedElements : [defaultProps as WhiteboardElement]}
          updateElements={updateElements}
          onLayerChange={handleLayerChange}
        />
      )}
    </div>
  );
}
