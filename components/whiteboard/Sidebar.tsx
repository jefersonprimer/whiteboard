'use client';

import {
  FolderOpen,
  Save,
  Image as ImageIcon,
  Users,
  Command,
  Search,
  HelpCircle,
  Trash2,
  Github,
  Twitter,
  MessageCircle,
  SlidersHorizontal,
  Sun,
  Moon,
  Monitor,
  LogIn,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/contexts/ThemeContext";
import { setLocale } from "@/app/actions/locale";
type SidebarProps = {
  onOpenClick?: () => void;
  onSaveClick?: () => void;
  onResetCanvas?: () => void;
  canvasBackground?: string;
  onCanvasBackgroundChange?: (color: string) => void;
  onLiveCollaborationClick?: () => void;
}

export default function Sidebar({ onOpenClick, onSaveClick, onResetCanvas, canvasBackground = 'bg-gray-50', onCanvasBackgroundChange, onLiveCollaborationClick }: SidebarProps) {
  const { theme, setTheme, resolvedTheme, mounted } = useTheme();
  const t = useTranslations('Sidebar');
  const locale = useLocale();
  const router = useRouter();

  const handleLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as 'en' | 'pt-BR';
    await setLocale(newLocale);
    router.refresh();
  };

  return (
    <div className="w-64 max-h-[calc(100vh-80px)] bg-white dark:bg-[#1C1C1C] border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 flex flex-col text-sm overflow-y-auto shadow-2xl">

      {/* Top Section */}
      <div className="my-1">

        <MenuItem icon={<FolderOpen size={16} />} label={t('open')} shortcut="Ctrl+O" onClick={onOpenClick} />
        <MenuItem icon={<Save size={16} />} label={t('saveTo')} onClick={onSaveClick} />
        <MenuItem icon={<ImageIcon size={16} />} label={t('exportImage')} shortcut="Ctrl+Shift+E" />
        <MenuItem icon={<Users size={16} />} label={t('liveCollaboration')} onClick={onLiveCollaborationClick}/>
        <MenuItem icon={<Command size={16} />} label={t('commandPalette')} shortcut="Ctrl+/" highlight />
        <MenuItem icon={<Search size={16} />} label={t('findOnCanvas')} shortcut="Ctrl+F" />
        <MenuItem icon={<HelpCircle size={16} />} label={t('help')} shortcut="?" />
        <MenuItem icon={<Trash2 size={16} />} label={t('resetCanvas')} isResetCanvas onClick={onResetCanvas} />

      </div>

      <Divider />

      {/* Links */}
      <div>
        <MenuItem icon={<ImageIcon size={16} />} label={t('excalidrawPlus')} />
        <MenuItem icon={<Github size={16} />} label={t('github')} />
        <MenuItem icon={<Twitter size={16} />} label={t('followUs')} />
        <MenuItem icon={<MessageCircle size={16} />} label={t('discordChat')} />
        <MenuItem icon={<LogIn size={16} />} label={t('signUp')} highlight />
      </div>

      <Divider />

      {/* Preferences */}
      <div className="space-y-3">

        <div className="flex items-center justify-between px-2 py-1 rounded-md text-[#1b1b1f] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} />
            <span>{t('preferences')}</span>
          </div>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-[#1b1b1f] dark:text-white mb-2">{t('theme')}</p>

          <div className="flex rounded-xl p-1 border border-[#f1f0ff] dark:border-neutral-800">
            <ThemeButton active={theme === 'light'} icon={<Sun size={16} />} onClick={() => setTheme('light')} />
            <ThemeButton active={theme === 'dark'} icon={<Moon size={16} />} onClick={() => setTheme('dark')} />
            <ThemeButton active={theme === 'system'} icon={<Monitor size={16} />} onClick={() => setTheme('system')} />
          </div>
        </div>

        {/* Language */}
        <div className="px-2">
          <select
            value={locale}
            onChange={handleLocaleChange}
            className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm text-[#1b1b1f] dark:text-white outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="en">{t('english')}</option>
            <option value="pt-BR">{t('portuguese')}</option>
          </select>
        </div>

        {/* Canvas background */}
        <div className="px-2">
          <p className="text-xs text-[#1b1b1f] dark:text-white mb-2">{t('canvasBackground')}</p>
          {mounted && resolvedTheme === 'light' ? (
            <div className="flex gap-2 flex-wrap">
              <ColorSwatch color="bg-white" active={canvasBackground === 'bg-white'} onClick={() => onCanvasBackgroundChange?.('bg-white')} />
              <ColorSwatch color="bg-gray-50" active={canvasBackground === 'bg-gray-50'} onClick={() => onCanvasBackgroundChange?.('bg-gray-50')} />
              <ColorSwatch color="bg-neutral-100" active={canvasBackground === 'bg-neutral-100'} onClick={() => onCanvasBackgroundChange?.('bg-neutral-100')} />
              <ColorSwatch color="bg-neutral-200" active={canvasBackground === 'bg-neutral-200'} onClick={() => onCanvasBackgroundChange?.('bg-neutral-200')} />
              <ColorSwatch color="bg-neutral-300" active={canvasBackground === 'bg-neutral-300'} onClick={() => onCanvasBackgroundChange?.('bg-neutral-300')} />
              <ColorSwatch color="bg-yellow-100" active={canvasBackground === 'bg-yellow-100'} onClick={() => onCanvasBackgroundChange?.('bg-yellow-100')} />
            </div>
          ) : mounted && resolvedTheme === 'dark' ? (
            <div className="flex gap-2 flex-wrap">
              <ColorSwatch color="bg-neutral-900" active={canvasBackground === 'bg-neutral-900'} onClick={() => onCanvasBackgroundChange?.('bg-neutral-900')} />
              <ColorSwatch color="bg-gray-800" active={canvasBackground === 'bg-gray-800'} onClick={() => onCanvasBackgroundChange?.('bg-gray-800')} />
              <ColorSwatch color="bg-slate-900" active={canvasBackground === 'bg-slate-900'} onClick={() => onCanvasBackgroundChange?.('bg-slate-900')} />
              <ColorSwatch color="bg-zinc-900" active={canvasBackground === 'bg-zinc-900'} onClick={() => onCanvasBackgroundChange?.('bg-zinc-900')} />
              <ColorSwatch color="bg-gray-950" active={canvasBackground === 'bg-gray-950'} onClick={() => onCanvasBackgroundChange?.('bg-gray-950')} />
              <ColorSwatch color="bg-stone-950" active={canvasBackground === 'bg-stone-950'} onClick={() => onCanvasBackgroundChange?.('bg-stone-950')} />
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <ColorSwatch color="bg-gray-50" active={canvasBackground === 'bg-gray-50'} onClick={() => onCanvasBackgroundChange?.('bg-gray-50')} />
              <ColorSwatch color="bg-neutral-100" active={canvasBackground === 'bg-neutral-100'} onClick={() => onCanvasBackgroundChange?.('bg-neutral-100')} />
            </div>
          )}
        </div>

      </div>
    </div> 
  )
}

/* ------------------ Components ------------------ */

type MenuItemProps = {
  icon: React.ReactNode
  label: string
  shortcut?: string
  highlight?: boolean
  isResetCanvas?: boolean
  onClick?: () => void
}

function MenuItem({ icon, label, shortcut, highlight, isResetCanvas, onClick }: MenuItemProps) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center justify-between p-2 rounded-md cursor-pointer
        hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#1b1b1f] dark:text-white
        ${highlight ? "text-[#6965db] dark:text-[#6965db] font-bold" : ""}
        ${isResetCanvas ? "hover:text-red-600 font-medium" : ""}
      `}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>

      {shortcut && (
        <span className="text-xs text-neutral-400">{shortcut}</span>
      )}
    </div>
  )
}

type ThemeButtonProps = {
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
}

function ThemeButton({ icon, active, onClick }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-6 h-6 flex items-center justify-center rounded-lg transition
        ${active 
          ? "bg-blue-400 text-white" 
          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
        }
      `}
    >
      {icon}
    </button>
  )
}

function ColorSwatch({ color, active, onClick }: { color: string; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`
        w-6 h-6 rounded-md border cursor-pointer transition-all
        ${color}
        ${active ? "border-purple-600 ring-2 ring-purple-500" : "border-neutral-300 dark:border-neutral-700"}
        ${onClick ? "hover:scale-110" : ""}
      `}
    />
  )
}

function Divider() {
  return <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />
}