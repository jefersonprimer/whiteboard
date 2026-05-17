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
      <div className="fixed inset-0 z-200 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white dark:bg-[#1C1C1C] rounded-xl shadow-2xl p-6 border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading file...</p>
        </div>
      </div>
    );
  }

  if (!loadedElements) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1C1C1C] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-black dark:text-white">Replace content?</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This will replace your current whiteboard with the content from the {selectedFile ? 'selected file' : 'share link'}.
          </p>

          {selectedFile && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">File:</p>
              <p className="text-sm font-medium text-black dark:text-white">{selectedFile.name}</p>
            </div>
          )}

          {/* Save before replace option */}
          <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveBeforeReplace}
                onChange={(e) => setSaveBeforeReplace(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-500 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-400"
              />
              <span className="text-sm text-black dark:text-white">
                Save current whiteboard to disk before replacing
              </span>
            </label>

            {saveBeforeReplace && (
              <div className="ml-6 space-y-2">
                <label className="block text-sm font-medium text-black dark:text-white">
                  File name:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={saveFilename}
                    onChange={(e) => setSaveFilename(e.target.value)}
                    className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm text-black dark:text-white bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Enter file name"
                  />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">.pwb</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReplace}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
          >
            Replace my content
          </button>
        </div>
      </div>
    </div>
  );
}
