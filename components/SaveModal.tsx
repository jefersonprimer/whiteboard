'use client';

import React, { useState, useEffect } from 'react';
import { Download, Link } from 'lucide-react';
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
      <div className="fixed inset-0 z-200 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-[#1C1C1C] rounded-xl shadow-2xl w-full max-w-[300px] md:max-w-[700px] mx-4 border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-black dark:text-white">{t('title')}</h2>
          
          </div>

          <div className="flex flex-col md:flex-row items-stretch justify-center p-6 gap-8">
            {/* Save to disk */}
            <section className="flex flex-col items-center justify-center space-y-2 w-full md:w-1/2">

              <div className="flex flex-col items-center justify-center">
                <span className="p-4 bg-blue-400 rounded-full">
                  <Download size={32}/>
                </span>
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white">{t('saveToDisk.title')}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('saveToDisk.description')}
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-black dark:text-white">
                  {t('saveToDisk.fileNameLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm text-black dark:text-white bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder={t('saveToDisk.fileNamePlaceholder')}
                    autoFocus
                  />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">.pwb</span>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving || !filename.trim()}
                className=" px-4 py-2 mt-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('saveToDisk.saving') : t('saveToDisk.saveButton')}
              </button>
            </section>

            {/* Shareable link */}
            <section className="flex flex-col items-center p-6 space-y-2 w-full md:w-1/2">

              <div className="flex flex-col items-center justify-center">
                <span className="p-4 bg-blue-400 rounded-full">
                  <Link size={32}/>
                </span>
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white">{t('shareableLink.title')}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('shareableLink.description')}
              </p>
              <button
                onClick={handleExportToLink}
                className="w-full px-4 py-2 mt-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
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
