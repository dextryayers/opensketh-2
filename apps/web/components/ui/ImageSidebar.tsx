'use client';

import React, { useEffect, useState } from 'react';
import { Droplets, Layers, ChevronLeft, ChevronRight, Palette, ArrowUpFromLine, ArrowDownToLine, ArrowUp, ArrowDown } from 'lucide-react';

export const ImageSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageId, setImageId] = useState<string | null>(null);
  const [opacity, setOpacity] = useState<number>(1);
  const [stroke, setStroke] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(0);

  useEffect(() => {
    const onShow = (e: any) => {
      const detail = e?.detail || {};
      setImageId(detail.id || null);
      setOpacity(typeof detail.opacity === 'number' ? detail.opacity : 1);
      setStroke(typeof detail.stroke === 'string' ? detail.stroke : '#000000');
      setStrokeWidth(typeof detail.strokeWidth === 'number' ? detail.strokeWidth : 0);
      setIsOpen(true);
    };
    const onHide = () => { setIsOpen(false); setImageId(null); };

    window.addEventListener('image-sidebar:show' as any, onShow as any);
    window.addEventListener('image-sidebar:hide' as any, onHide as any);
    return () => {
      window.removeEventListener('image-sidebar:show' as any, onShow as any);
      window.removeEventListener('image-sidebar:hide' as any, onHide as any);
    };
  }, []);

  const emit = (name: string, payload: any = {}) => {
    try { window.dispatchEvent(new CustomEvent(name as any, { detail: { id: imageId, ...payload } })); } catch {}
  };

  if (!isOpen || !imageId) return null;

  return (
    <>
      {/* Toggle handle to collapse */}
      <button
        onClick={() => setIsOpen(false)}
        className="fixed top-1/2 -translate-y-1/2 z-[70] w-8 h-12 bg-white dark:bg-zinc-800 border-y border-r border-gray-200 dark:border-zinc-700 rounded-r-lg shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-all duration-300 left-[240px]"
        style={{ touchAction: 'none' }}
        aria-label="Close Image Sidebar"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Panel */}
      <div
        className="fixed top-1/2 -translate-y-1/2 left-0 z-[69] w-[240px] bg-white dark:bg-zinc-800 border-y border-r border-gray-200 dark:border-zinc-700 shadow-xl rounded-r-xl p-4 flex flex-col gap-6 max-h-[90vh] overflow-y-auto no-scrollbar"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <Layers size={16} />
          <span>Image Controls</span>
        </div>

        {/* Opacity */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm font-medium text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Droplets size={16} />
              <span>Opacity</span>
            </div>
            <span className="text-xs">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => { const v = parseFloat(e.target.value); setOpacity(v); emit('image:opacity', { opacity: v }); }}
            className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Edge (Stroke) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Palette size={16} />
            <span>Edge</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={stroke}
              onChange={(e) => { const v = e.target.value; setStroke(v); emit('image:stroke', { stroke: v }); }}
              className="w-8 h-8 rounded border border-gray-200 dark:border-zinc-600"
              title="Edge Color"
            />
            <input
              type="range"
              min={0}
              max={20}
              value={strokeWidth}
              onChange={(e) => { const v = parseInt(e.target.value); setStrokeWidth(v); emit('image:strokeWidth', { strokeWidth: v }); }}
              className="flex-1 h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              title="Edge Width"
            />
            <span className="w-8 text-right text-xs text-gray-500 dark:text-gray-400">{strokeWidth}px</span>
          </div>
        </div>

        {/* Layer Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Layers size={16} />
            <span>Layer</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => emit('image:layer', { action: 'bringToFront' })} className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 flex items-center justify-center gap-1 text-xs">
              <ArrowUpFromLine size={16} /><span>Front</span>
            </button>
            <button onClick={() => emit('image:layer', { action: 'sendToBack' })} className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 flex items-center justify-center gap-1 text-xs">
              <ArrowDownToLine size={16} /><span>Back</span>
            </button>
            <button onClick={() => emit('image:layer', { action: 'bringForward' })} className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 flex items-center justify-center gap-1 text-xs">
              <ArrowUp size={16} /><span>Up</span>
            </button>
            <button onClick={() => emit('image:layer', { action: 'sendBackwards' })} className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 flex items-center justify-center gap-1 text-xs">
              <ArrowDown size={16} /><span>Down</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
