'use client';

import { useState } from 'react';
import { Copy, Check, X, ShieldCheck } from 'lucide-react';
import { useTranslations } from '@/lib/i18n-hooks';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: string;
}

export function ShareLinkModal({ isOpen, onClose, link }: ShareLinkModalProps) {
  const t = useTranslations('ShareLinkModal');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
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

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {t('linkLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={link}
                className="flex-1 px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-sm font-medium text-white flex items-center gap-2 transition-colors shadow-sm"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t('copied') : t('copy')}
              </button>
            </div>
          </div>

          <div className="flex gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100/50 dark:border-blue-900/20">
            <ShieldCheck className="shrink-0 text-blue-500" size={18} />
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t('encryptionNotice')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
