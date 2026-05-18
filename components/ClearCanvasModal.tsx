import { X, AlertTriangle } from "lucide-react";
import { useTranslations } from "@/lib/i18n-hooks";

interface ClearCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ClearCanvasModal({
  isOpen,
  onClose,
  onConfirm,
}: ClearCanvasModalProps) {
  const t = useTranslations("ClearCanvasModal");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-[360px] border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {t("title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t("description")}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-neutral-50/50 dark:bg-neutral-800/20 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors shadow-sm"
          >
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
