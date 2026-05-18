'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { loadFromFile, openFileDialog, saveToFile, generateDefaultFileName } from '@/lib/fileService';
import type { WhiteboardElement } from '@/lib/db';

interface OpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentElements: WhiteboardElement[];
  onReplace: (elements: WhiteboardElement[]) => void;
  /** When set, show replace modal immediately with these elements (e.g. from share link hash). No file dialog. */
  elementsFromHash?: WhiteboardElement[] | null;
}

export function OpenModal({ isOpen, onClose, currentElements, onReplace, elementsFromHash }: OpenModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadedElements, setLoadedElements] = useState<WhiteboardElement[] | null>(null);
  const [saveBeforeReplace, setSaveBeforeReplace] = useState(false);
  const [saveFilename, setSaveFilename] = useState('');

  const handleFileSelect = useCallback(async () => {
    try {
      const file = await openFileDialog();
      if (!file) {
        onClose();
        return;
      }

      setSelectedFile(file);
      setIsLoading(true);

      try {
        const elements = await loadFromFile(file);
        setLoadedElements(elements);
        setSaveFilename(generateDefaultFileName());
      } catch (error) {
        alert(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        onClose();
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      alert(`Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setLoadedElements(null);
      setSaveBeforeReplace(false);
      setSaveFilename('');
      return;
    }
    if (elementsFromHash != null) {
      setLoadedElements(elementsFromHash);
      setSaveFilename(generateDefaultFileName());
      setSelectedFile(null);
    } else {
      handleFileSelect();
    }
  }, [isOpen, elementsFromHash, handleFileSelect]);

  const handleSaveCurrent = async () => {
    if (!saveFilename.trim()) {
      alert('Please enter a file name');
      return;
    }

    try {
      await saveToFile(currentElements, saveFilename.trim());
      setSaveBeforeReplace(false);
    } catch (error) {
      alert(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReplace = async () => {
    if (!loadedElements) return;

    if (saveBeforeReplace) {
      await handleSaveCurrent();
    }

    onReplace(loadedElements);
    onClose();
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="relative bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl p-6 border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Loading file...</p>
        </div>
      </div>
    );
  }

  if (!loadedElements) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Replace content?</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            This will replace your current whiteboard with the content from the {selectedFile ? 'selected file' : 'share link'}.
          </p>

          {selectedFile && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-md">
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">File:</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{selectedFile.name}</p>
            </div>
          )}

          {/* Save before replace option */}
          <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={saveBeforeReplace}
                onChange={(e) => setSaveBeforeReplace(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-500 border-neutral-300 dark:border-neutral-700 rounded focus:ring-blue-500/50"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                Save current whiteboard to disk before replacing
              </span>
            </label>

            {saveBeforeReplace && (
              <div className="ml-7 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  File name:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      value={saveFilename}
                      onChange={(e) => setSaveFilename(e.target.value)}
                      className="w-full pl-3 pr-12 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-neutral-900 dark:text-neutral-100 transition-all"
                      placeholder="Enter file name"
                    />
                    <span className="absolute right-3 text-xs font-medium text-neutral-400">.pwb</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-neutral-50/50 dark:bg-neutral-800/20 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReplace}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors shadow-sm"
          >
            Replace content
          </button>
        </div>
      </div>
    </div>
  );
}
