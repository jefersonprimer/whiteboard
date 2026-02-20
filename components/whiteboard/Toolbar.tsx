import React from 'react';
import { Hand, MousePointer2, Square, Circle, Type, Minus, Triangle, ArrowRight, Pencil, Image as ImageIcon, Eraser, Diamond } from 'lucide-react';

export type Tool = 'hand' | 'select' | 'rectangle' | 'diamond' | 'triangle' | 'circle' | 'arrow' | 'line' | 'pencil' | 'text' | 'image' | 'eraser';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onClearCanvas: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const tools: { id: Tool; icon: React.ReactNode; label: string; isAction?: boolean }[] = [
  { id: 'hand', icon: <Hand size={18} />, label: 'Pan' },
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select' },
  { id: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
  { id: 'diamond', icon: <Diamond size={18} />, label: 'Diamond' },
  { id: 'triangle', icon: <Triangle size={18} />, label: 'Triangle' },
  { id: 'circle', icon: <Circle size={18} />, label: 'Circle' },
  { id: 'arrow', icon: <ArrowRight size={18} />, label: 'Arrow' },
  { id: 'line', icon: <Minus size={18} />, label: 'Line' },
  { id: 'pencil', icon: <Pencil size={18} />, label: 'Pencil' },
  { id: 'text', icon: <Type size={18} />, label: 'Text' },
  { id: 'image', icon: <ImageIcon size={18} />, label: 'Image' },
  { id: 'eraser', icon: <Eraser size={18} />, label: 'Eraser' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClearCanvas, onImageUpload }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = (toolId: Tool) => {
    if (toolId === 'image') {
      fileInputRef.current?.click();
    } else {
      setActiveTool(toolId);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1 z-50 overflow-x-auto max-w-[95vw]">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => handleClick(tool.id)}
          className={`p-2 rounded-md transition-colors flex-shrink-0 ${
            activeTool === tool.id && !tool.isAction
              ? 'bg-blue-100 text-blue-600'
              : tool.isAction 
                ? 'hover:bg-red-50 text-gray-600 hover:text-red-500'
                : 'hover:bg-gray-100 text-gray-600'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImageUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};
