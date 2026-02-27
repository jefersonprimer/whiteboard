'use client';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'H', action: 'Hand (Pan)' },
  { key: 'S', action: 'Select' },
  { key: 'R', action: 'Rectangle' },
  { key: 'D', action: 'Diamond' },
  { key: 'G', action: 'Triangle' },
  { key: 'C', action: 'Circle' },
  { key: 'A', action: 'Arrow' },
  { key: 'L', action: 'Line' },
  { key: 'P', action: 'Pencil' },
  { key: 'T', action: 'Text' },
  { key: 'I', action: 'Image' },
  { key: 'E', action: 'Eraser' },
  { key: '1-0', action: 'Same tools (number keys)' },
  { key: 'Ctrl+D', action: 'Dark theme' },
  { key: 'Ctrl+L', action: 'Light theme' },
  { key: 'cc', action: 'Clear canvas (press C twice)' },
  { key: '?', action: 'Show shortcuts' },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-[#1C1C1C] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-[#1b1b1f] dark:text-white">
            Keyboard Shortcuts
          </h2>
        </div>
        <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map(({ key, action }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
            >
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {action}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-700 dark:text-neutral-300">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Press the number key or letter to switch tools quickly.
          </p>
        </div>
      </div>
    </div>
  );
}
