import { useState, useCallback, useEffect } from 'react';
import { db } from './db';
import type { WhiteboardElement } from './db';

interface HistoryState {
  elements: WhiteboardElement[];
  past: WhiteboardElement[][];
  future: WhiteboardElement[][];
}

export function useHistoryState(initialElements: WhiteboardElement[]) {
  const [state, setState] = useState<HistoryState>({
    elements: initialElements,
    past: [],
    future: [],
  });

  const syncWithDB = async (newElements: WhiteboardElement[]) => {
    try {
      await db.transaction('rw', db.elements, async () => {
        await db.elements.clear();
        await db.elements.bulkPut(newElements);
      });
    } catch (err) {
      console.error('Failed to sync with DB:', err);
    }
  };

  // Sync with DB whenever elements change
  // We use a ref to track if the change was from setElements (no history) or saveHistory
  // Actually, we should probably just sync every time elements change to be safe.
  useEffect(() => {
    syncWithDB(state.elements);
  }, [state.elements]);

  const setElements = useCallback((newElements: WhiteboardElement[] | ((prev: WhiteboardElement[]) => WhiteboardElement[])) => {
    setState(prev => {
      const nextElements = typeof newElements === 'function' ? newElements(prev.elements) : newElements;
      return {
        ...prev,
        elements: nextElements,
      };
    });
  }, []);

  const saveHistory = useCallback((newElements: WhiteboardElement[], customPastState?: WhiteboardElement[]) => {
    setState(prev => {
      const pastState = customPastState || prev.elements;
      return {
        past: [...prev.past, pastState],
        elements: newElements,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      const newFuture = [prev.elements, ...prev.future];

      return {
        past: newPast,
        elements: previous,
        future: newFuture,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      const newPast = [...prev.past, prev.elements];

      return {
        past: newPast,
        elements: next,
        future: newFuture,
      };
    });
  }, []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return {
    elements: state.elements,
    setElements,
    saveHistory,
    undo,
    redo,
    canUndo,
    canRedo
  };
}
