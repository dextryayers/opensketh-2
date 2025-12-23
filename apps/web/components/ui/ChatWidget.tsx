'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface ChatWidgetProps {
  roomId: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ roomId }) => {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [username, setUsername] = useState('Guest');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [pendingSend, setPendingSend] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Force Mount di Client & Debugging
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
        const storedName = localStorage.getItem('opensketch_username');
        if (storedName) {
            setUsername(storedName);
        } else {
            setShowNameModal(true);
        }
        
        try {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3');
            audioRef.current.volume = 0.5;
        } catch (e) {
            console.warn("Audio init warning", e);
        }
    }
  }, []);

  // 2. Setup Socket
  useEffect(() => {
    if (!mounted || !roomId) return;

    try {
        socketRef.current = io(SOCKET_URL, {
            path: '/socket.io',
            // Allow fallback to polling for environments that block raw websockets
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 500,
            timeout: 10000,
            autoConnect: true
        });

        // Join room setelah benar-benar terkoneksi
        socketRef.current.on('connect', () => {
            console.log('Chat socket connected', socketRef.current?.id);
            if (roomId) socketRef.current?.emit('join-room', roomId);
        });

        // Rejoin jika reconnect
        socketRef.current.on('reconnect', () => {
            console.log('Chat socket reconnected');
            if (roomId) socketRef.current?.emit('join-room', roomId);
        });

        socketRef.current.on('chat-message', (msg: ChatMessage) => {
            // Filter out noisy system messages for anonymous 'Guest'
            if (msg?.type === 'system') {
                const uname = (msg.username || '').trim().toLowerCase();
                if (uname === 'guest' || uname === '') {
                    return; // ignore Guest joined/left
                }
            }
            setMessages((prev) => [...prev, { ...msg, isMe: false }]);
            if (!isOpen) {
                setUnreadCount((prev) => prev + 1);
                try { audioRef.current?.play().catch(() => {}); } catch(e){}
            }
        });

        // Debugging error agar mudah diagnosis
        socketRef.current.on('connect_error', (err) => {
            console.error('Chat socket connect_error:', err);
        });
        socketRef.current.on('reconnect_error', (err) => {
            console.error('Chat socket reconnect_error:', err);
        });
    } catch (err) {
        console.error("ChatWidget Socket Error:", err);
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [mounted, roomId, username]);

  // 3. Auto Scroll
  useEffect(() => {
    if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // 4. Focus Input
  useEffect(() => {
    if (isOpen) {
        setUnreadCount(0);
        // Delay sedikit agar animasi buka selesai dulu di HP
        setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    if (!username || username === 'Guest') {
      setPendingSend(newMessage.trim());
      setShowNameModal(true);
      return;
    }

    const msgData: ChatMessage = {
      id: uuidv4(),
      username: username,
      message: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      type: 'text'
    };

    setMessages((prev) => [...prev, msgData]);
    
    if (socketRef.current?.connected) {
        socketRef.current.emit('chat-message', { roomId, ...msgData });
    }
    
    setNewMessage('');
  };

  if (!mounted) return null;

  return (
    // CONTAINER UTAMA
    // Mobile: bottom-24 (Naik ke atas toolbar)
    // Desktop: bottom-6 (Pojok normal)
    <div 
        className="fixed flex flex-col items-end pointer-events-none font-sans bottom-24 right-3 md:bottom-6 md:right-6"
        style={{ zIndex: 99999 }}
    >
      
      {/* Jendela Chat */}
      <div 
        className={`
            pointer-events-auto mb-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden transition-all duration-300 origin-bottom-right transform 
            ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 h-0 mb-0 pointer-events-none'}
            
            /* Responsive Width */
            w-[90vw] md:w-80
        `}
      >
        {/* Header */}
        <div className="p-3 bg-blue-600 flex justify-between items-center text-white shadow-md select-none touch-none">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="fill-current opacity-80" />
            <span className="font-bold text-sm">Live Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const result = await Swal.fire({
                  title: 'Ganti Nama',
                  input: 'text',
                  inputValue: username,
                  inputAttributes: { maxlength: '24', autocapitalize: 'off', autocorrect: 'off' },
                  showCancelButton: true,
                  confirmButtonText: 'Simpan',
                  cancelButtonText: 'Batal',
                  inputValidator: (value) => {
                    if (!value || !value.trim()) return 'Nama tidak boleh kosong';
                    if (value.trim().length > 24) return 'Maksimal 24 karakter';
                    return undefined as any;
                  },
                });
                if (result.isConfirmed) {
                  const clean = (result.value || '').trim().slice(0, 24) || 'Guest';
                  try { localStorage.setItem('opensketch_username', clean); } catch {}
                  setUsername(clean);
                  try { window.dispatchEvent(new CustomEvent('user:name-changed', { detail: clean })); } catch {}
                }
              }}
              className="px-2 py-1 text-xs bg-white/15 hover:bg-white/25 rounded-md"
              title="Ganti Nama"
            >
              {username}
            </button>

      {showNameModal && (
        <div className="pointer-events-auto fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = pendingName.trim().slice(0, 24);
              if (!clean) return;
              try { localStorage.setItem('opensketch_username', clean); } catch {}
              setUsername(clean);
              try { window.dispatchEvent(new CustomEvent('user:name-changed', { detail: clean })); } catch {}
              setShowNameModal(false);
              setPendingName('');
              setIsOpen(true);
              // Auto-send pending message if exists
              if (pendingSend) {
                const text = pendingSend;
                setPendingSend('');
                const msgData: ChatMessage = {
                  id: uuidv4(),
                  username: clean,
                  message: text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isMe: true,
                  type: 'text'
                };
                setMessages((prev) => [...prev, msgData]);
                if (socketRef.current?.connected) {
                  socketRef.current.emit('chat-message', { roomId, ...msgData });
                }
                setNewMessage('');
              }
            }}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-zinc-700"
          >
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-4">
              <h3 className="text-base font-semibold">Masukkan Nama Anda</h3>
              <p className="text-xs opacity-90 mt-0.5">Nama ini akan digunakan di obrolan live.</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5">
              <input
                autoFocus
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder="cth: Hanif"
                className="w-full rounded-xl bg-gray-100 dark:bg-zinc-800 border-none px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNameModal(false); setPendingName(''); }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={!pendingName.trim()}
                >
                  Simpan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List Pesan */}
        <div className="h-[280px] md:h-[320px] overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-zinc-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2 opacity-60 select-none">
              <MessageCircle size={32} />
              <p>Say hello to team!</p>
            </div>
          )}
          
          {messages.map((msg) => {
            if (msg.type === 'system') {
                return (
                    <div key={msg.id} className="flex justify-center my-2">
                        <span className="text-[10px] bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full select-none">
                            {msg.username} {msg.message}
                        </span>
                    </div>
                );
            }
            return (
              <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                <div className={`
                    max-w-[85%] px-3 py-2 text-sm shadow-sm rounded-2xl break-words
                    ${msg.isMe 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'}
                `}>
                  {!msg.isMe && <span className="block text-[10px] font-bold text-blue-500 mb-0.5 select-none">{msg.username}</span>}
                  {msg.message}
                </div>
                <span className="text-[9px] text-gray-400 mt-1 px-1 select-none">{msg.timestamp}</span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-2 bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type here..."
            // text-base di mobile mencegah zoom otomatis
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-zinc-900 border-none rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-base md:text-sm text-gray-900 dark:text-white placeholder-gray-400"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()} 
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center transition-transform active:scale-90"
          >
            <Send size={18} className={newMessage.trim() ? "translate-x-0.5" : ""} />
          </button>
        </form>
      </div>

      {/* Tombol Bulat (Floating) */}
      <button
        onClick={() => {
          if (!username || username === 'Guest') {
            setShowNameModal(true);
            return;
          }
          setIsOpen(!isOpen);
        }}
        className="pointer-events-auto relative w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)' }}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
        
        {/* Badge Merah */}
        {!isOpen && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

    </div>
  );
};