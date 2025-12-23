'use client';

import React, { useEffect, useState } from 'react';
import { PenTool } from 'lucide-react';

export const SplashLoader: React.FC = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] grid place-items-center bg-white dark:bg-zinc-900"
      aria-label="Loading"
      role="status"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-16 w-16">
          <span className="absolute inset-0 rounded-full border-4 border-blue-500/30"></span>
          <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin [animation-duration:900ms]"></span>
          <span className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 opacity-10"></span>
          <span className="absolute inset-0 grid place-items-center text-blue-600 dark:text-blue-400">
            <PenTool size={20} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold tracking-wide text-gray-800 dark:text-gray-100">OpenSketch</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Preparing workspace...</div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
      `}</style>
    </div>
  );
};
