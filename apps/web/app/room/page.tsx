'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Swal from 'sweetalert2';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Toolbar } from '../../components/ui/Toolbar';
import { Sidebar } from '../../components/ui/Sidebar';
import { HistoryControls } from '../../components/ui/HistoryControls';
import { ChatWidget } from '../../components/ui/ChatWidget';
import { ParticipantsWidget } from '../../components/ui/ParticipantsWidget';
import { ImageSidebar } from '../../components/ui/ImageSidebar';
import { ScreenshotWidget } from '../../components/ui/ScreenshotWidget';
import { useStore } from '../../store/useStore';

// Dynamic Import Whiteboard agar tidak error di server
const Whiteboard = dynamic(
  () => import('../../components/canvas/Whiteboard').then((mod) => mod.Whiteboard),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-zinc-900 text-gray-400 animate-pulse">
        Preparing Canvas...
      </div>
    )
  }
);

function RoomContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('id');
  const { setRoomHost } = useStore();
  // Baca nilai host saat ini dari store untuk mencegah overwrite ke 'Guest Room'
  const currentHost = useStore.getState().roomHost;

  // Optimistic host name from localStorage so it matches the name entered when starting a room
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('opensketch_username');
        if (stored && stored.trim()) setRoomHost(stored.trim().slice(0, 24));
      }
    } catch {}
  }, [setRoomHost]);

  useEffect(() => {
    if (!roomId) return;
    const fetchRoomInfo = async () => {
      try {
        const res = await fetch(`/api/check-room.php?room_id=${roomId}`);
        if (!res.ok) return; // jangan overwrite
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.exists && typeof data.host_name === 'string' && data.host_name.trim()) {
            setRoomHost(data.host_name.trim().slice(0, 24));
          } else {
            // Hanya set 'Guest Room' jika belum ada host sama sekali
            if (!useStore.getState().roomHost) setRoomHost('Guest Room');
          }
        } else {
          if (!useStore.getState().roomHost) setRoomHost('Guest Room');
        }
      } catch (e) {
        console.error('Failed to fetch PHP room info', e);
        if (!useStore.getState().roomHost) setRoomHost('Guest Room');
      }
    };
    fetchRoomInfo();
  }, [roomId, setRoomHost, currentHost]);

  if (!roomId) {
    return (
        <div className="flex items-center justify-center w-screen h-screen bg-neutral-50 dark:bg-zinc-900 flex-col gap-4">
            <div className="text-xl font-bold text-gray-500">No Room ID Detected</div>
            <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Go Back Home</a>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-neutral-100 dark:bg-zinc-900 overscroll-none">
      
      {/* LAYER 1: CANVAS (Background) */}
      <div className="absolute inset-0 z-0">
        <Whiteboard roomId={roomId} />
      </div>

      {/* LAYER 2: UI CONTROLS (Floating) */}
      {/* Gunakan pointer-events-none pada container agar klik tembus ke kanvas di area kosong */}
      <div className="absolute inset-0 z-[100] pointer-events-none">
        
        {/* Aktifkan kembali pointer-events pada elemen UI */}
        <div className="pointer-events-auto">
            <Sidebar />
        </div>
        
        <div className="pointer-events-auto">
            <HistoryControls />
        </div>
        
        <div className="pointer-events-auto">
            <Toolbar />
        </div>
        
        <div className="pointer-events-auto">
            <ChatWidget roomId={roomId} />
        </div>
        
        <div className="pointer-events-auto">
            <ScreenshotWidget />
        </div>

        <div className="pointer-events-auto">
            <ParticipantsWidget />
        </div>

        {/* Image-specific Sidebar (appears when an image is selected) */}
        <div className="pointer-events-auto">
            <ImageSidebar />
        </div>

        <button
          className="absolute bottom-24 left-4 md:bottom-4 md:left-4 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 bg-white/80 dark:bg-zinc-800/80 border border-gray-200/70 dark:border-zinc-700/70 rounded-lg px-2 py-1 shadow-sm backdrop-blur hidden md:inline-flex items-center gap-1 opacity-80 hover:opacity-100 transition pointer-events-auto"
          title="Copy Room ID"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(roomId);
              await Swal.fire({
                toast: true,
                position: 'bottom-start',
                timer: 1800,
                showConfirmButton: false,
                icon: 'success',
                title: 'ID room berhasil disalin',
              });
            } catch (e) {
              await Swal.fire({ icon: 'info', title: 'Room ID', text: roomId });
            }
          }}
        >
           OpenSketch • {roomId.slice(0, 8)}...
        </button>
      </div>

    </div>
  );
}

// WRAPPER UTAMA: Wajib pakai Suspense untuk halaman yang pakai useSearchParams di Next.js Static Export
export default function RoomPage() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center w-screen h-screen bg-neutral-50 dark:bg-zinc-900">
            <div className="animate-pulse text-gray-500">Loading OpenSketch...</div>
        </div>
    }>
        <RoomContent />
    </Suspense>
  );
}