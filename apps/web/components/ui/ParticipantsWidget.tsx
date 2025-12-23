'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Users, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

export const ParticipantsWidget: React.FC = () => {
  const store = useStore();
  const storeParticipants = Array.isArray((store as any).participants) ? (store as any).participants as { id: string; name: string; color: string }[] : [];
  const [localParticipants, setLocalParticipants] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Ambil data peserta dari event yang dipancarkan Whiteboard
  useEffect(() => {
    // Init from cached value if available (set by Whiteboard)
    try {
      const cached: any = (window as any).__participants;
      if (Array.isArray(cached)) setLocalParticipants(cached);
    } catch {}

    const onUpdate = (e: any) => {
      const list = Array.isArray(e?.detail) ? e.detail as { id: string; name: string; color: string }[] : [];
      setLocalParticipants(list);
    };
    window.addEventListener('participants:update' as any, onUpdate as any);
    return () => { window.removeEventListener('participants:update' as any, onUpdate as any); };
  }, []);

  const participants = localParticipants.length > 0 ? localParticipants : storeParticipants;

  const handleLocate = (userId: string) => {
    // Kirim sinyal ke Whiteboard untuk mencari user
    window.dispatchEvent(new CustomEvent('whiteboard:locate-user', { detail: userId }));
    // Optional: tutup list di mobile setelah klik
    if (window.innerWidth < 768) setIsOpen(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(p => p.name.toLowerCase().includes(q));
  }, [participants, query]);

  // Selalu render handle/drawer meskipun peserta 0, agar bisa dibuka seperti Sidebar

  return (
    <>
      {/* Toggle Button (Sebelah Kamera) */}
      <div className="fixed top-4 right-14 md:right-24 z-[99999] pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 md:p-3 bg-white/95 backdrop-blur dark:bg-zinc-800/90 text-gray-700 dark:text-gray-200 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 hover:bg-blue-50/80 dark:hover:bg-zinc-700 hover:text-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2 group"
          title="Room Members"
        >
          <Users className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 px-1.5 py-0.5 rounded-md min-w-[20px]">
            {participants.length}
          </span>
        </button>
      </div>

      {/* Mobile Right-edge Handle ("<" when closed, ">" when open) */}
      <button
        className="md:hidden fixed top-1/2 -translate-y-1/2 right-0 z-[100010] pointer-events-auto bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-l-xl shadow-lg px-2 py-2 active:scale-95"
        aria-label="Toggle participants drawer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronRight size={18} className="text-gray-600 dark:text-gray-300" /> : <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />}
      </button>

      {/* Desktop Dropdown (md and up) */}
      {isOpen && (
        <div className="hidden md:block fixed top-16 right-6 z-[100000] w-[22rem] bg-white/95 dark:bg-zinc-800/95 backdrop-blur rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-200 dark:border-zinc-700 bg-gray-50/70 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Users size={16} /> Members
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={16} />
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search participant..."
                className="w-full pl-8 pr-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {filtered.length === 0 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">No participants found</div>
            )}
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg group transition-colors">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className="w-3 h-3 rounded-full border border-white dark:border-zinc-600 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">
                    {p.name}
                  </span>
                </div>
                <button
                  onClick={() => handleLocate(p.id)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Locate on Canvas"
                >
                  <Search size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Right Drawer (hidden off-canvas when closed) */}
      {/* Backdrop for mobile when open */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[99990] bg-black/30 pointer-events-auto" onClick={() => setIsOpen(false)} />
      )}
      <div
        className={`md:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-[100000] w-72 max-w-[85vw] bg-white dark:bg-zinc-800 border-l border-gray-200 dark:border-zinc-700 shadow-2xl transition-transform duration-300 pointer-events-auto`}
      >
        <div className="p-3 border-b border-gray-200 dark:border-zinc-700 bg-gray-50/70 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Users size={16} /> Members
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          </div>
          <div className="relative mt-2">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search participant..."
              className="w-full pl-8 pr-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="h-[calc(100%-64px)] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 && (
            <div className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">No participants found</div>
          )}
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg group transition-colors">
              <div className="flex items-center gap-2 overflow-hidden">
                <div
                  className="w-3 h-3 rounded-full border border-white dark:border-zinc-600 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">
                  {p.name}
                </span>
              </div>
              <button
                onClick={() => handleLocate(p.id)}
                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all opacity-100"
                title="Locate on Canvas"
              >
                <Search size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};