"use client";

import React from "react";
import { FolderOpen, HelpCircle, Users, LogIn } from "lucide-react";
import { useTranslations } from "@/lib/i18n-hooks";

type EmptyCanvasWelcomeProps = {
  onOpenClick: () => void;
  onHelpClick: () => void;
  onLiveCollaborationClick: () => void;
};

function WelcomeRow({
  icon,
  label,
  shortcut,
  highlight,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        pointer-events-auto flex w-full max-w-xs items-center justify-between gap-4 rounded-md px-2 py-1.5
        text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5
        ${highlight ? "text-blue-500 font-semibold" : "text-gray-700 dark:text-neutral-200"}
      `}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-gray-500 dark:text-neutral-400">{icon}</span>
        <span className="text-sm">{label}</span>
      </span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-neutral-500 tabular-nums">
          {shortcut}
        </span>
      )}
    </button>
  );
}

export function EmptyCanvasWelcome({
  onOpenClick,
  onHelpClick,
  onLiveCollaborationClick,
}: EmptyCanvasWelcomeProps) {
  const t = useTranslations("EmptyCanvasWelcome");
  const tSidebar = useTranslations("Sidebar");

  return (
    <div className="fixed inset-x-0 top-1 bottom-0 z-40 flex flex-col items-center justify-center pointer-events-none px-4">
      <div className="flex flex-col items-center max-w-md text-center pointer-events-none">
        <div className="flex flex-col mb-6">
          <h1>Libredraw</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 leading-relaxed">
            {t("storageNotice")}
          </p>
        </div>
        <div className="flex flex-col items-stretch w-full max-w-xs gap-0.5 pointer-events-auto">
          <WelcomeRow
            icon={<FolderOpen size={18} />}
            label={tSidebar("open")}
            shortcut="Ctrl+O"
            onClick={onOpenClick}
          />
          <WelcomeRow
            icon={<HelpCircle size={18} />}
            label={tSidebar("help")}
            shortcut="?"
            onClick={onHelpClick}
          />
          <WelcomeRow
            icon={<Users size={18} />}
            label={tSidebar("liveCollaboration")}
            onClick={onLiveCollaborationClick}
          />
          <WelcomeRow
            icon={<LogIn size={18} />}
            label={tSidebar("signUp")}
            highlight
          />
        </div>
      </div>
    </div>
  );
}
