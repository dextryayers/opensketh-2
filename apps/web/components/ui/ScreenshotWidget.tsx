'use client';

import React, { useState, useEffect } from 'react';
import { Camera, X, Download, Share2, Check } from 'lucide-react';

export const ScreenshotWidget: React.FC = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const handleScreenshotReady = (e: CustomEvent) => {
      setPreviewUrl(e.detail);
    };

    window.addEventListener('whiteboard:screenshot-ready', handleScreenshotReady as EventListener);

    return () => {
      window.removeEventListener('whiteboard:screenshot-ready', handleScreenshotReady as EventListener);
    };
  }, []);

  const requestScreenshot = () => {
    window.dispatchEvent(new CustomEvent('whiteboard:request-screenshot'));
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setIsCopied(false);
  };

  const downloadImage = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `opensketch-hanif-${new Date().getTime()}.png`;
    link.href = previewUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareImage = async () => {
    if (!previewUrl) return;
    try {
        const blob = await (await fetch(previewUrl)).blob();
        
        if (navigator.share) {
            const file = new File([blob], 'sketch.png', { type: 'image/png' });
            await navigator.share({
                title: 'My Sketch',
                text: 'Created with OpenSketch by Hanif Abdurrohim',
                files: [file]
            });
        } else {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    } catch (err) {
        console.error("Share failed", err);
    }
  };

  return (
    <>
      {/* Floating Button Top Right (Z-Index tinggi agar tidak tertutup) */}
      <div className="fixed top-4 right-4 z-[99999]">
        <button
          onClick={requestScreenshot}
          // Responsive Classes:
          // Mobile: p-2, icon size 16
          // Desktop: p-3, icon size 20
          className="p-2 md:p-3 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-zinc-700 hover:text-blue-600 transition-all active:scale-95 group flex items-center justify-center"
          title="Take Screenshot"
        >
          <Camera className="w-4 h-4 md:w-5 md:h-5 group-hover:animate-pulse" />
        </button>
      </div>

      {/* Modal Preview */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-zinc-700 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-blue-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">Snapshot Preview</h3>
              </div>
              <button 
                onClick={closePreview}
                className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Image Container */}
            <div className="p-4 bg-gray-100 dark:bg-black/50 overflow-auto flex-1 flex items-center justify-center">
              <img 
                src={previewUrl} 
                alt="Screenshot Preview" 
                className="max-w-full h-auto rounded-lg shadow-md border border-gray-200 dark:border-zinc-700"
              />
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex gap-3 bg-white dark:bg-zinc-900">
              <button
                onClick={shareImage}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                {isCopied ? <Check size={18} className="text-green-500" /> : <Share2 size={18} />}
                {isCopied ? 'Copied!' : 'Share'}
              </button>
              <button
                onClick={downloadImage}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-all active:scale-95"
              >
                <Download size={18} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};