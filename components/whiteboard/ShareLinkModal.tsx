'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: string;
}

export function ShareLinkModal({ isOpen, onClose, link }: ShareLinkModalProps) {
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
    <div className="fixed inset-0 z-210 flex items-center justify-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-[#1C1C1C] rounded-xl shadow-2xl w-full max-w-137.5 mx-4 border border-neutral-200 dark:border-neutral-800">
        <div className="p-6 space-y-3 ">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1b1b1f] dark:text-white">Shareable link</h2>
          </div>
          <p className="text-sm font-medium text-[#1b1b1f] dark:text-white">Link</p>
          <div className="flex items-center gap-2 border-b border-[#ebebeb] pb-4">
            <input
              type="text"
              readOnly
              value={link}
              className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm text-[#1b1b1f] dark:text-white bg-neutral-50 dark:bg-neutral-800 truncate"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-blue-400 hover:bg-blue-500 text-sm font-medium text-white flex items-center gap-2 transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-sm">
            🔒 The upload has been secured with end-to-end encryption, which means that Excalidraw server and third parties can't read the content.
          </p>
        </div>
      </div>
    </div>
  );
}
