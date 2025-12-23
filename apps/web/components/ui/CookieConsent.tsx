"use client";

import React, { useEffect, useMemo, useState } from "react";

type ConsentLevel = "all" | "essential";

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  const setConsent = (_level: ConsentLevel) => {
    // No persistence to force banner on every page load/refresh per request
  };

  useEffect(() => {
    // Always show on mount; user requested showing it every time
    setVisible(true);
  }, []);

  const acceptAll = () => {
    setConsent("all");
    setVisible(false);
  };

  const policyHref = useMemo(() => {
    // Pakai rute standar; jika belum ada halaman, pengguna bisa menambahkannya nanti
    return "/kebijakan-privasi";
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-5"
      role="dialog"
      aria-live="polite"
      aria-label="Pemberitahuan Cookie"
    >
      <div
        className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] bg-gradient-to-br from-white/95 to-white/80 dark:from-zinc-800/95 dark:to-zinc-800/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-800/70 translate-y-2 animate-[slideUp_.28s_ease-out_forwards]"
      >
        <div className="p-4 md:p-6">
          <div className="flex items-start gap-3 md:gap-4">
            {/* Icon */}
            <div className="shrink-0 mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              {/* Cookie icon (SVG) */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M11.99 2a1 1 0 0 0-1 1c0 .89-.72 1.61-1.61 1.61a1 1 0 0 0-1 1c0 .89-.72 1.61-1.61 1.61a1 1 0 0 0-1 1C4.77 12.91 8.94 17 14 17c3.86 0 7-3.14 7-7 0-.55-.45-1-1-1-1.33 0-2.41-1.08-2.41-2.41 0-.55-.45-1-1-1-1.33 0-2.41-1.08-2.41-2.41 0-.55-.45-1-1-1h-1.19Z"/>
                <path d="M9 20.5a.75.75 0 1 1 0-1.5 3.5 3.5 0 0 0 3.5-3.5.75.75 0 0 1 1.5 0 5 5 0 0 1-5 5Z"/>
              </svg>
            </div>

            <div className="flex-1">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                Persetujuan Cookie
              </h2>
              <p className="mt-1.5 text-sm md:text-[13px] text-gray-700 dark:text-gray-200 leading-relaxed">
                Halo, saya <strong>Hanif</strong> selaku developer. Mohon maaf mengganggu sejenak 🙏. Situs ini memakai cookie esensial agar aplikasi
                berjalan dengan baik, serta cookie opsional untuk analitik demi meningkatkan kualitas layanan.
                Dengan menekan tombol <strong>“Mengerti”</strong>, Anda menyetujui penggunaan cookie sesuai
                <a className="underline hover:opacity-80 ml-1" href={policyHref} target="_blank" rel="noopener noreferrer">Kebijakan Privasi</a> kami.
              </p>
            </div>

            {/* Close (opsional) */}
            <button
              onClick={acceptAll}
              aria-label="Tutup pemberitahuan cookie"
              className="ml-1 hidden md:inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700/70 hover:text-gray-700 dark:text-gray-300 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={acceptAll}
              className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition shadow-sm"
              autoFocus
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
