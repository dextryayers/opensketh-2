
'use client';

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useStore } from '../../store/useStore';
import { GridType, ToolType } from '../../types';
import { 
  Palette, Grid3x3, ChevronLeft, ChevronRight, Hash, 
  CircleDashed, Droplets, PenLine, Download, Copy, Image as ImageIcon,
  FileText, Users, Pencil, Pen, Highlighter, Paintbrush,
  Share2, Link2, MessageCircle, Instagram, User, FileCode
} from 'lucide-react';
import { Eraser } from 'lucide-react';

const COLORS = [
  '#000000', // Black
  '#ef4444', // Red
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#f97316', // Orange
  '#ffffff', // White
];

export const Sidebar: React.FC = () => {
  const { 
    strokeColor, setStrokeColor, 
    strokeWidth, setStrokeWidth,
    opacity, setOpacity,
    gridType, setGridType,
    isSidebarOpen, toggleSidebar,
    setActiveTool,
    roomId,
    roomHost // Ambil data host dari store
  } = useStore();

  const handleExportPng = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:export-png'));
  };

// Local component: Eraser size control
const EraserSizeSlider: React.FC = () => {
  const [value, setValue] = useState<number>(30);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('opensketch_eraser_size');
      const v = raw ? parseInt(raw) : 30;
      if (!isNaN(v) && v > 0 && v <= 200) setValue(v);
    } catch {}
  }, []);
  const emit = (v: number) => {
    try { localStorage.setItem('opensketch_eraser_size', String(v)); } catch {}
    try { window.dispatchEvent(new CustomEvent('whiteboard:eraser-size', { detail: v })); } catch {}
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm font-medium text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Eraser size={16} />
          <span>Eraser Size</span>
        </div>
        <span className="text-xs">{value}px</span>
      </div>
      <input
        type="range"
        min={6}
        max={120}
        value={value}
        onChange={(e) => { const v = parseInt(e.target.value); setValue(v); emit(v); }}
        className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
};

  const handleExportPdf = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:export-pdf'));
  };

  const handleExportSvg = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:export-svg'));
  };

  const handleCopyClipboardImage = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:copy-img'));
  };

  // Helper untuk Copy Text yang lebih kuat (Support HTTP & Browser Lama)
  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        await Swal.fire({ toast: true, position: 'bottom-start', icon: 'success', timer: 1600, showConfirmButton: false, title: `${label} berhasil disalin` });
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      // Fallback: Create hidden textarea
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Ensure it's not visible but part of DOM
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          await Swal.fire({ toast: true, position: 'bottom-start', icon: 'success', timer: 1600, showConfirmButton: false, title: `${label} berhasil disalin` });
        } else {
          await Swal.fire({ icon: 'info', title: `${label}`, text: text });
        }
      } catch (err) {
        await Swal.fire({ icon: 'info', title: `${label}`, text: text });
      }
      
      document.body.removeChild(textArea);
    }
  };

  const handleCopyRoomId = () => {
    if (roomId) {
        copyToClipboard(roomId, 'Room ID');
    }
  };

  // Logic untuk Share Link Sosial Media
  const handleNativeShare = async () => {
    const url = window.location.href;
    const shareData = {
        title: 'OpenSketch Room',
        text: `Join me on OpenSketch room ${roomId} and let's draw together!`,
        url: url
    };

    // Jika di HP/Browser support Native Share
    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share dismissed');
        }
    } else {
        // Fallback ke copy link
        copyToClipboard(url, 'Public link');
    }
  };

  const handleSocialShare = async (platform: 'whatsapp' | 'instagram') => {
    const url = window.location.href;
    const text = "Come draw with me on OpenSketch! 🎨🖌️";

    if (platform === 'whatsapp') {
        // Universal link for WhatsApp (works on Web & Mobile)
        const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}%20${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank');
    } else if (platform === 'instagram') {
        // 1. Copy Link dulu agar user tinggal paste di story
        await copyToClipboard(url, 'Link');

        // 2. Deteksi Mobile vs Desktop
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // Deep link langsung ke Story Camera
            window.location.href = 'instagram://story-camera';
        } else {
            // Fallback ke website
            window.open('https://instagram.com', '_blank');
        }
    }
  };

  const handleCopyLink = () => {
      copyToClipboard(window.location.href, 'Public link');
  };

  const applyPreset = (preset: 'sketch' | 'ink' | 'marker' | 'highlighter') => {
    setActiveTool(ToolType.PENCIL);
    switch (preset) {
        case 'sketch':
            setStrokeWidth(2);
            setOpacity(0.6);
            setStrokeColor('#000000');
            break;
        case 'ink':
            setStrokeWidth(3);
            setOpacity(1);
            setStrokeColor('#000000');
            break;
        case 'marker':
            setStrokeWidth(10);
            setOpacity(0.9);
            setStrokeColor('#3b82f6');
            break;
        case 'highlighter':
            setStrokeWidth(30);
            setOpacity(0.4);
            setStrokeColor('#eab308');
            break;
    }
  };

  return (
    <>
      {/* Toggle Button (Always Visible) */}
      <button
        onClick={toggleSidebar}
        className={`
          fixed top-1/2 -translate-y-1/2 z-[60]
          w-8 h-12 bg-white dark:bg-zinc-800 
          border-y border-r border-gray-200 dark:border-zinc-700 
          rounded-r-lg shadow-md flex items-center justify-center
          text-gray-600 dark:text-gray-300 hover:text-blue-500
          transition-all duration-300
          ${isSidebarOpen ? 'left-[240px]' : 'left-0'}
        `}
        style={{ touchAction: 'none' }}
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Sidebar Content */}
      <div 
        className={`
          fixed top-1/2 -translate-y-1/2 left-0 z-50
          w-[240px] bg-white dark:bg-zinc-800 
          border-y border-r border-gray-200 dark:border-zinc-700 
          shadow-xl rounded-r-xl p-4 flex flex-col gap-6
          transition-transform duration-300
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          max-h-[90vh] overflow-y-auto no-scrollbar
        `}
        // ENABLE VERTICAL SCROLLING (pan-y) for Sidebar content
        style={{ touchAction: 'pan-y' }}
      >
        
        {/* Room Info Section */}
        {roomId && (
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <Users size={16} />
                    <span>Collab Room</span>
                </div>
                
                {/* Host Info */}
                {roomHost && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium px-1 overflow-hidden">
                        <User size={12} className="flex-shrink-0" />
                        <span className="truncate max-w-[150px]" title={roomHost}>Host: {roomHost}</span>
                    </div>
                )}

                <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-700/50 p-2 rounded-lg border border-gray-200 dark:border-zinc-600">
                    <span className="font-mono text-sm font-bold tracking-widest text-gray-800 dark:text-gray-200 flex-1 text-center">
                        {roomId.slice(0, 6)}
                    </span>
                    <button 
                        onClick={handleCopyRoomId}
                        className="p-1.5 hover:bg-white dark:hover:bg-zinc-600 rounded text-gray-500 dark:text-gray-400 transition-colors"
                        title="Copy Room ID"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            </div>
        )}

        {roomId && <div className="w-full h-px bg-gray-200 dark:bg-zinc-700" />}

        {/* Brush Presets Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Paintbrush size={16} />
            <span>Brush Presets</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button 
                onClick={() => applyPreset('sketch')}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 transition-all group"
                title="Sketch Pencil"
            >
                <Pencil size={18} className="text-gray-600 dark:text-gray-300 group-hover:text-blue-500" />
            </button>
            <button 
                onClick={() => applyPreset('ink')}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 transition-all group"
                title="Ink Pen"
            >
                <Pen size={18} className="text-gray-600 dark:text-gray-300 group-hover:text-blue-500" />
            </button>
            <button 
                onClick={() => applyPreset('marker')}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 transition-all group"
                title="Marker"
            >
                <PenLine size={18} className="text-gray-600 dark:text-gray-300 group-hover:text-blue-500" />
            </button>
            <button 
                onClick={() => applyPreset('highlighter')}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 transition-all group"
                title="Highlighter"
            >
                <Highlighter size={18} className="text-gray-600 dark:text-gray-300 group-hover:text-blue-500" />
            </button>
          </div>
        </div>

        <div className="w-full h-px bg-gray-200 dark:bg-zinc-700" />

        {/* Color Picker Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Palette size={16} />
            <span>Stroke Color</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                className={`w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-600 transition-transform hover:scale-110 ${
                  strokeColor === color ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-800' : ''
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-zinc-600">
                <input 
                type="color" 
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 m-0 border-0"
                title="Custom Color"
                />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-gray-200 dark:bg-zinc-700" />
        
        {/* Opacity & Width Section */}
        <div className="flex flex-col gap-4">
            {/* Opacity Slider */}
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
                    step="0.1"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            {/* Stroke Width Slider */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm font-medium text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <PenLine size={16} />
                        <span>Thickness</span>
                    </div>
                    <span className="text-xs">{strokeWidth}px</span>
                </div>
                <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            {/* Eraser Control */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <Eraser size={16} />
                <span>Eraser</span>
              </div>
              <button
                onClick={() => setActiveTool(ToolType.ERASER)}
                className="px-3 py-1 text-xs rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300"
                title="Activate Eraser"
              >
                Use
              </button>
            </div>

            {/* Eraser Size Slider */}
            <EraserSizeSlider />
        </div>

        <div className="w-full h-px bg-gray-200 dark:bg-zinc-700" />

        {/* Grid Mode Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Grid3x3 size={16} />
            <span>Canvas Grid</span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setGridType(GridType.NONE)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                gridType === GridType.NONE 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="w-4 h-4 rounded border border-current opacity-50" />
              Blank
            </button>
            <button
              onClick={() => setGridType(GridType.LINES)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                gridType === GridType.LINES 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Hash size={16} />
              Grid Lines
            </button>
            <button
              onClick={() => setGridType(GridType.DOTS)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                gridType === GridType.DOTS 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <CircleDashed size={16} />
              Dots
            </button>
          </div>
        </div>

        <div className="w-full h-px bg-gray-200 dark:bg-zinc-700" />

        {/* Share & Social Section */}
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <Share2 size={16} />
                <span>Share Public Link</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <button
                    onClick={handleNativeShare}
                    className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all text-xs font-medium"
                    title="Share via App/Mobile"
                >
                    <Share2 size={16} />
                    <span>Share App</span>
                </button>
                <button
                    onClick={handleCopyLink}
                    className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 transition-all text-xs"
                    title="Copy Link"
                >
                    <Link2 size={16} />
                    <span>Copy URL</span>
                </button>
                <button
                    onClick={() => handleSocialShare('whatsapp')}
                    className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 transition-all text-xs"
                    title="Share to WhatsApp"
                >
                    <MessageCircle size={16} />
                    <span>WhatsApp</span>
                </button>
                <button
                    onClick={() => handleSocialShare('instagram')}
                    className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-lg bg-pink-50 hover:bg-pink-100 dark:bg-pink-900/30 dark:hover:bg-pink-900/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition-all text-xs"
                    title="Share to Instagram Story"
                >
                    <Instagram size={16} />
                    <span>Instagram</span>
                </button>
            </div>
        </div>

        <div className="w-full h-px bg-gray-200 dark:bg-zinc-700" />

        {/* Export Section */}
        <div className="flex flex-col gap-3 pb-8">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <ImageIcon size={16} />
            <span>Export & Save</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <button
              onClick={handleExportPng}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 transition-all text-xs"
              title="Download PNG"
            >
              <Download size={18} />
              <span>Save PNG</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 transition-all text-xs"
              title="Download PDF"
            >
              <FileText size={18} />
              <span>Save PDF</span>
            </button>
            <button
              onClick={handleExportSvg}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 transition-all text-xs"
              title="Download SVG"
            >
              <FileCode size={18} />
              <span>Save SVG</span>
            </button>
            <button
              onClick={handleCopyClipboardImage}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 transition-all text-xs"
              title="Copy to Clipboard"
            >
              <Copy size={18} />
              <span>Copy Image</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
