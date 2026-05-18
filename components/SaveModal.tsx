'use client';

import React, { useState, useEffect } from 'react';
import { Download, Link, X } from 'lucide-react';
import { useTranslations } from '@/lib/i18n-hooks';
import { saveToFile, generateDefaultFileName, getShareableLink } from '@/lib/fileService';
import type { WhiteboardElement } from '@/lib/db';
import { ShareLinkModal } from './ShareLinkModal';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: WhiteboardElement[];
}

export function SaveModal({ isOpen, onClose, elements }: SaveModalProps) {
  const t = useTranslations('SaveModal');
  const [filename, setFilename] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [shareLinkModalOpen, setShareLinkModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFilename(generateDefaultFileName());
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!filename.trim()) {
      alert(t('alerts.enterFileName'));
      return;
    }

    setIsSaving(true);
    try {
      await saveToFile(elements, filename.trim());
      onClose();
    } catch (error) {
      alert(t('alerts.saveFailed', { message: error instanceof Error ? error.message : t('alerts.unknownError') }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportToLink = () => {
    setShareLink(getShareableLink(elements));
    setShareLinkModalOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-[360px] border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{t('title')}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Save to disk */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-500">
                <Download size={18} />
                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {t('saveToDisk.title')}
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-3 pr-12 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-neutral-900 dark:text-neutral-100"
                    placeholder={t('saveToDisk.fileNamePlaceholder')}
                    autoFocus
                  />
                  <span className="absolute right-3 text-xs font-medium text-neutral-400">
                    .pwb
                  </span>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || !filename.trim()}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('saveToDisk.saving') : t('saveToDisk.saveButton')}
              </button>
            </section>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">OR</span>
              <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
            </div>

            {/* Shareable link */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-blue-500">
                <Link size={18} />
                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {t('shareableLink.title')}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('shareableLink.description')}
              </p>
              <button
                onClick={handleExportToLink}
                className="w-full px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-md transition-colors"
              >
                {t('shareableLink.exportButton')}
              </button>
            </section>
          </div>
        </div>
      </div>

      <ShareLinkModal
        isOpen={shareLinkModalOpen}
        onClose={() => setShareLinkModalOpen(false)}
        link={shareLink}
      />
    </>
  );
}
