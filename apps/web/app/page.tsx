'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PenTool, LogIn, Plus, User } from 'lucide-react';
import Swal from 'sweetalert2';

interface LandingPageProps {
  onJoin?: (id: string) => void;
}

export default function LandingPage({ onJoin }: LandingPageProps) {
  const [joinId, setJoinId] = useState('');
  const [username, setUsername] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  let router: any = null;
  try {
    router = useRouter();
  } catch (e) {
    // Ignore
  }

  const generateRoomCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleStartClick = () => {
    setShowNameModal(true);
  };

  const navigateToRoom = (roomId: string) => {
      setTimeout(() => {
        setIsLoading(false);
        // FIX: Arahkan ke Query Param URL yang aman untuk cPanel
        const targetUrl = `/room?id=${roomId}`;
        
        if (onJoin) {
            onJoin(roomId);
        } else if (router) {
            router.push(targetUrl);
        } else {
            window.location.href = targetUrl;
        }
    }, 500);
  };

  const confirmCreateRoom = async () => {
    if (!username.trim()) {
      await Swal.fire({ icon: 'warning', title: 'Nama diperlukan', text: 'Masukkan nama Anda sebelum membuat room.' });
      return;
    }

    setIsLoading(true);
    const roomId = generateRoomCode();
    const hostName = username.trim();

    try {
      const body = new URLSearchParams({ room_id: roomId, host_name: hostName });
      const resp = await fetch('/bakends/create-room.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        cache: 'no-store',
        credentials: 'same-origin',
      });

      let ok = resp.ok;
      try { const j = await resp.clone().json(); if (typeof j.success === 'boolean') ok = ok && j.success; } catch {}
      if (!ok) {
        const g = await fetch(`/bakends/create-room.php?room_id=${encodeURIComponent(roomId)}&host_name=${encodeURIComponent(hostName)}&_=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
        if (!g.ok) throw new Error('Create room failed');
      }

      await Swal.fire({ icon: 'success', title: 'Room dibuat', html: `Kode Room: <b>${roomId}</b>`, confirmButtonText: 'Masuk' });
      localStorage.setItem('opensketch_username', hostName);
      navigateToRoom(roomId);
    } catch (error) {
      await Swal.fire({ icon: 'error', title: 'Gagal membuat room', text: 'Server PHP tidak mencatat room. Coba lagi.' });
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    const raw = joinId.trim().toUpperCase();
    if (!raw) return;
    if (raw.length !== 6) {
      await Swal.fire({ icon: 'warning', title: 'Kode tidak valid', text: 'Kode room harus 6 karakter.' });
      return;
    }
    const cleanId = raw;
    setIsLoading(true);

    const parseExists = async (resp: Response): Promise<{ ok: boolean; host?: string }> => {
      try {
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const j = await resp.json();
          return { ok: !!(j && (j.exists === true || j.exists === 'true' || j.exists === 1)), host: j?.host_name };
        }
        const t = (await resp.text()).trim().toLowerCase();
        // Heuristik umum untuk backend PHP sederhana
        if (t === '1' || t === 'true' || t.includes('exists') || t.includes('ada')) return { ok: true };
        if (t.includes('not found') || t === '0' || t === 'false' || t.includes('tidak')) return { ok: false };
        // Jika 200 tapi konten tak dikenal, jangan langsung terima
        return { ok: false };
      } catch {
        return { ok: false };
      }
    };

    const promptNameAndEnter = async (hostNameHint?: string) => {
      const nameRes = await Swal.fire({
        title: 'Masukkan Nama Anda',
        input: 'text',
        inputAttributes: { maxlength: '24', autocapitalize: 'off', autocorrect: 'off' },
        inputValidator: (v) => {
          if (!v || !v.trim()) return 'Nama tidak boleh kosong';
          if (v.trim().length > 24) return 'Maksimal 24 karakter';
          return undefined as any;
        },
        confirmButtonText: 'Masuk',
        showCancelButton: true,
        cancelButtonText: 'Batal',
      });
      if (!nameRes.isConfirmed) { setIsLoading(false); return; }
      const cleanName = (nameRes.value || '').trim().slice(0, 24);
      localStorage.setItem('opensketch_username', cleanName);
      navigateToRoom(cleanId);
    };

    try {
      // 1) Coba endpoint bakends langsung (no-store)
      const r1 = await fetch(`/bakends/cekroom.php?room_id=${encodeURIComponent(cleanId)}&_=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
      if (r1.ok) {
        const ex1 = await parseExists(r1);
        if (ex1.ok) { await promptNameAndEnter(); return; }
      }
      // 2) Fallback ke API proxy jika ada
      const r2 = await fetch(`/api/check-room.php?room_id=${encodeURIComponent(cleanId)}&_=${Date.now()}`, { cache: 'no-store' });
      if (r2.ok) {
        const ex2 = await parseExists(r2);
        if (ex2.ok) { await promptNameAndEnter(); return; }
      }

      await Swal.fire({ icon: 'error', title: 'Ditolak', text: 'Kode room tidak terdaftar atau server tidak memberikan jawaban yang valid.' });
      setIsLoading(false);
    } catch (err) {
      await Swal.fire({ icon: 'error', title: 'Tidak bisa terhubung', text: 'Cek koneksi internet atau server validasi.' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-4 relative">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex flex-col items-center">
          <div className="bg-blue-600 p-4 rounded-full mb-4 shadow-lg">
            <PenTool size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">OpenSketch</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 font-medium">
            Collaborative whiteboard. Draw together in real-time.
          </p>
        </div>

        {!showNameModal ? (
            <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl border border-gray-200 dark:border-neutral-700 space-y-6">
            <button
                onClick={handleStartClick}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <Plus size={20} />
                <span>Start New Drawing</span>
            </button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-neutral-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-neutral-800 text-gray-500">OR JOIN EXISTING</span>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <input 
                type="text" 
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                placeholder="Enter Room Code"
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase tracking-widest text-center font-mono placeholder:normal-case placeholder:tracking-normal disabled:opacity-50 transition-all"
                maxLength={6}
                />
                <button
                onClick={handleJoin}
                disabled={!joinId || isLoading}
                className={`w-full py-3 px-6 font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-2
                    ${joinId && !isLoading
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white transform hover:scale-[1.02]' 
                    : 'bg-gray-200 dark:bg-neutral-700 text-gray-400 cursor-not-allowed'
                    }`}
                >
                {isLoading && joinId ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <LogIn size={20} />
                )}
                {isLoading && joinId ? 'Checking...' : 'Join Room'}
                </button>
            </div>
            </div>
        ) : (
            <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl border border-gray-200 dark:border-neutral-700 space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="text-left">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <User size={24} className="text-blue-500" />
                        Enter Your Name
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Others will see you as the host.</p>
                </div>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Saiful, Alex..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && confirmCreateRoom()}
                />
                <div className="flex gap-3">
                    <button onClick={() => setShowNameModal(false)} className="flex-1 py-3 px-4 bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium">Cancel</button>
                    <button onClick={confirmCreateRoom} disabled={isLoading || !username.trim()} className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-all">{isLoading ? 'Creating...' : 'Enter Room'}</button>
                </div>
            </div>
        )}

        <div className="pt-8 text-center space-y-1">
            <p className="text-xs text-gray-400 font-medium px-4">
                © 2025 haniipp.space | OpenSketch. All rights reserved.
            </p>
        </div>
      </div>
    </div>
  );
}