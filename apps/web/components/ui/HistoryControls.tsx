
'use client';

import React from 'react';
import { Undo2, Redo2, ZoomIn, ZoomOut } from 'lucide-react';

export const HistoryControls: React.FC = () => {
  const handleUndo = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:undo'));
  };

  const handleRedo = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:redo'));
  };

  const handleZoomIn = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:zoom-in'));
  };

  const handleZoomOut = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:zoom-out'));
  };

  // Helper untuk class button agar konsisten dan responsif (kecil di HP, normal di Desktop)
  const btnClass = "p-1.5 md:p-2.5 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-lg shadow-md border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors active:scale-95 flex items-center justify-center";

  return (
    <div 
      className="fixed z-[60] flex gap-2
        top-4 left-4 
        md:top-auto md:bottom-4 md:left-4"
      style={{ touchAction: 'none' }}
    >
      <div className="flex gap-1 md:gap-2 bg-white/50 dark:bg-zinc-900/50 p-1 md:p-0 rounded-xl md:bg-transparent md:dark:bg-transparent backdrop-blur-sm md:backdrop-blur-none">
        <button
          onClick={handleUndo}
          className={btnClass}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button
          onClick={handleRedo}
          className={btnClass}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        
        {/* Separator kecil di mobile */}
        <div className="w-px h-auto bg-gray-300 dark:bg-zinc-600 mx-0.5 md:hidden"></div>

        <button
          onClick={handleZoomOut}
          className={btnClass}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button
          onClick={handleZoomIn}
          className={btnClass}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  );
};
