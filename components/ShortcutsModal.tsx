'use client';

import { useTranslations } from '@/lib/i18n-hooks';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'H', actionKey: 'handPan' },
  { key: 'S', actionKey: 'select' },
  { key: 'R', actionKey: 'rectangle' },
  { key: 'D', actionKey: 'diamond' },
  { key: 'G', actionKey: 'triangle' },
  { key: 'C', actionKey: 'circle' },
  { key: 'A', actionKey: 'arrow' },
  { key: 'L', actionKey: 'line' },
  { key: 'P', actionKey: 'pencil' },
  { key: 'T', actionKey: 'text' },
  { key: 'I', actionKey: 'image' },
  { key: 'E', actionKey: 'eraser' },
  { key: '1-0', actionKey: 'sameToolsNumberKeys' },
  { key: 'Ctrl+D', actionKey: 'darkTheme' },
  { key: 'Ctrl+L', actionKey: 'lightTheme' },
  { key: 'cc', actionKey: 'clearCanvasDoubleC' },
  { key: '?', actionKey: 'showShortcuts' },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const t = useTranslations('ShortcutsModal');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-[#1C1C1C] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {t('title')}
          </h2>
        </div>
        <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map(({ key, actionKey }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
            >
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {t(`shortcuts.${actionKey}`)}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-700 dark:text-neutral-300">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('footerHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
