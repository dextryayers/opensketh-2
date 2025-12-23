'use client';

import React, { useEffect, useRef, useState, memo, forwardRef } from 'react';
import { 
  Canvas, 
  Rect, 
  Ellipse, 
  Triangle, 
  Polygon, 
  Line, 
  Path, 
  Text, 
  IText,
  PencilBrush, 
  Point, 
  Pattern, 
  util,
  FabricObject, 
  Group,
  Circle,
  FabricImage
} from 'fabric';
import { useStore } from '../../store/useStore';
import { ToolType, GridType } from '../../types';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import { Search, User } from 'lucide-react';
import Swal from 'sweetalert2';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface WhiteboardProps {
  roomId: string;
}

// --- STATIC CANVAS (PENTING: Jangan Dihapus) ---
// Mencegah React me-render ulang elemen <canvas> secara langsung
// Ini memperbaiki error "NotFoundError: Failed to execute 'insertBefore'"
const StaticCanvas = memo(forwardRef<HTMLCanvasElement>((props, ref) => {
  return <canvas ref={ref} className="block w-full h-full" />;
}), () => true);
StaticCanvas.displayName = 'StaticCanvas';

// Helper Throttle untuk performa kursor
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

const getRandomColor = () => {
  const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#a78bfa', '#f472b6'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const Whiteboard: React.FC<WhiteboardProps> = ({ roomId }) => {
  // --- REFS ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const socketRef = useRef<any>(null);
  
  // State untuk List Anggota
  const [participants, setParticipants] = useState<{ id: string; name: string; color: string }[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Ref untuk logic internal (Anti Re-render)
  const initDone = useRef(false); // <--- INI PERBAIKANNYA
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastClientX = useRef(0);
  const lastClientY = useRef(0);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const currentObject = useRef<any>(null);
  
  // Refs untuk sinkronisasi state React -> Fabric
  const activeToolRef = useRef<ToolType>(ToolType.SELECTION);
  const strokeColorRef = useRef<string>('#000000');
  const strokeWidthRef = useRef<number>(2);
  const opacityRef = useRef<number>(1);
  const cornerRadiusRef = useRef<number>(0);

  const myColor = useRef<string>(getRandomColor());
  const cursors = useRef<Map<string, FabricObject>>(new Map());
  const lastPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const participantsRef = useRef<Map<string, { id: string; name: string; color: string }>>(new Map());
  const myNameRef = useRef<string>('Guest');

  const history = useRef<string[]>([]);
  const historyStep = useRef<number>(-1);
  const isHistoryProcessing = useRef<boolean>(false);

  // Store
  const { activeTool, strokeColor, strokeWidth, fillColor, roughness, opacity, cornerRadius, isDarkMode, gridType, setRoomId, roomHost } = useStore();

  useEffect(() => {
    setRoomId(roomId);
  }, [roomId, setRoomId]);

  useEffect(() => { setMounted(true); }, []);

  // Load name from localStorage so host/user is not always 'Guest'
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('opensketch_username');
        if (stored && stored.trim()) {
          myNameRef.current = stored.trim().slice(0, 24);
        }
      }
    } catch {}
  }, []);

  // Respond to runtime name changes triggered by ChatWidget
  useEffect(() => {
    const onNameChanged = (e: any) => {
      const val = (e?.detail || '').toString().trim().slice(0, 24);
      if (!val) return;
      myNameRef.current = val;
      try { socketRef.current?.emit('introduce', { roomId, name: myNameRef.current, color: myColor.current }); } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('user:name-changed' as any, onNameChanged as any);
      return () => window.removeEventListener('user:name-changed' as any, onNameChanged as any);
    }
    return;
  }, [roomId]);

  // --- CURSOR HELPERS ---
  const shapeIndexFor = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % 3;
  };

  const buildCursorGroup = (idx: number, color: string, name: string) => {
    let pointer: any;
    // Variasi bentuk kursor agar unik
    if (idx === 0) {
      pointer = new Path('M 0 0 L 22 11 L 11 22 Z', { fill: color, stroke: 'white', strokeWidth: 1, selectable: false, evented: false, originX: 'left', originY: 'top' } as any);
    } else if (idx === 1) {
      pointer = new Path('M 11 0 L 22 11 L 11 22 L 0 11 Z', { fill: color, stroke: 'white', strokeWidth: 1, selectable: false, evented: false, originX: 'left', originY: 'top' } as any);
    } else {
      const outer = new Circle({ left: 2, top: 2, radius: 10, fill: 'transparent', stroke: color, strokeWidth: 3, selectable: false, evented: false } as any);
      const inner = new Circle({ left: 7, top: 7, radius: 5, fill: color, stroke: 'white', strokeWidth: 1, selectable: false, evented: false } as any);
      pointer = new Group([outer, inner], { selectable: false, evented: false, originX: 'left', originY: 'top' } as any);
    }

    // Label Nama di atas kursor
    const label = new Text(name, { 
        fontSize: 14, 
        fontFamily: 'sans-serif',
        fill: '#ffffff', 
        backgroundColor: color, 
        selectable: false, 
        evented: false, 
        originX: 'left', 
        originY: 'bottom', 
        left: 20, 
        top: -5,
        rx: 4,
        ry: 4,
        padding: 4
    } as any);

    return new Group([pointer, label], { selectable: false, evented: false, opacity: 0.9, subTargetCheck: false } as any);
  };

  // --- UPDATE REF DARI STATE ---
  useEffect(() => {
    activeToolRef.current = activeTool;
    strokeColorRef.current = strokeColor;
    strokeWidthRef.current = strokeWidth;
    opacityRef.current = opacity;
    cornerRadiusRef.current = cornerRadius;
    updateCanvasInteraction();

    if (fabricCanvasRef.current) {
        const activeObj = fabricCanvasRef.current.getActiveObject();
        if (activeObj) {
            let needsRender = false;
            if (activeObj.opacity !== opacity) { activeObj.set('opacity', opacity); needsRender = true; }
            
            if (activeObj.type === 'rect') {
                (activeObj as Rect).set({ rx: cornerRadius, ry: cornerRadius });
                needsRender = true;
            } else if (activeObj.type === 'image') {
                const img = activeObj as FabricImage;
                if (cornerRadius > 0) {
                    const clipRect = new Rect({
                        width: img.width,
                        height: img.height,
                        rx: cornerRadius,
                        ry: cornerRadius,
                        originX: 'center',
                        originY: 'center',
                    });
                    img.clipPath = clipRect;
                } else {
                    img.clipPath = undefined;
                }
                needsRender = true;
            }

            if (needsRender) {
                fabricCanvasRef.current.requestRenderAll();
                const json = activeObj.toObject(['id', 'opacity']);
                socketRef.current?.emit('drawing-data', { roomId, ...json });
            }
        }
    }
  }, [activeTool, strokeColor, strokeWidth, opacity, cornerRadius]);

  // ... (Helper geometry functions: getArrowPath, hexToRgba, dll sama seperti sebelumnya) ...
  const getClientPos = (evt: any) => {
    if (!evt) return { x: 0, y: 0 };
    const touches = (evt as any).touches;
    if (touches && typeof touches.length === 'number' && touches.length > 0) {
      const t = touches[0] || {};
      return { x: t.clientX ?? t.pageX ?? 0, y: t.clientY ?? t.pageY ?? 0 };
    }
    const cx = (evt as any).clientX ?? (evt as any).pageX ?? 0;
    const cy = (evt as any).clientY ?? (evt as any).pageY ?? 0;
    return { x: cx, y: cy };
  };

  // Build centered arrow path so rotation works correctly (tail moves with head)
  const getArrowPathCentered = (x1: number, y1: number, x2: number, y2: number) => {
    const headLength = 20;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const p3 = { x: x2 - headLength * Math.cos(angle - Math.PI / 6), y: y2 - headLength * Math.sin(angle - Math.PI / 6) };
    const p4 = { x: x2 - headLength * Math.cos(angle + Math.PI / 6), y: y2 - headLength * Math.sin(angle + Math.PI / 6) };
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const s = (p: {x:number;y:number}) => ({ x: p.x - cx, y: p.y - cy });
    const a1 = s({ x: x1, y: y1 });
    const a2 = s({ x: x2, y: y2 });
    const a3 = s(p3);
    const a4 = s(p4);
    const d = `M ${a1.x} ${a1.y} L ${a2.x} ${a2.y} M ${a2.x} ${a2.y} L ${a3.x} ${a3.y} M ${a2.x} ${a2.y} L ${a4.x} ${a4.y}`;
    return { d, left: cx, top: cy };
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})` : hex;
  };

  // --- CORE CANVAS LOGIC ---
  const applyBackground = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const baseColor = isDarkMode ? '#18181b' : '#ffffff';
    const gridColor = isDarkMode ? '#3f3f46' : '#e5e7eb';
    
    if (gridType === GridType.NONE) {
        canvas.backgroundColor = baseColor;
        canvas.requestRenderAll();
        return;
    }

    const size = 20;
    const svg = gridType === GridType.LINES 
        ? `<defs><pattern id="grid" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="${gridColor}" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" />`
        : `<defs><pattern id="dots" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${gridColor}" /></pattern></defs><rect width="100%" height="100%" fill="url(#dots)" />`;

    const url = `data:image/svg+xml;base64,${btoa(`<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`)}`;
    
    const img = new Image();
    img.src = url;
    img.onload = () => {
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.backgroundColor = new Pattern({ source: img, repeat: 'repeat' });
            fabricCanvasRef.current.requestRenderAll();
        }
    };
  };

  const saveHistory = () => {
    if (isHistoryProcessing.current || !fabricCanvasRef.current) return;
    if (historyStep.current < history.current.length - 1) {
      history.current = history.current.slice(0, historyStep.current + 1);
    }
    const json = fabricCanvasRef.current.toObject(['id', 'selectable', 'evented', 'opacity']);
    const objs = Array.isArray((json as any).objects) ? (json as any).objects : [];
    (json as any).objects = objs.filter((obj: any) => {
      const id = obj?.id;
      return !(typeof id === 'string' && id.startsWith('cursor-'));
    });
    delete (json as any).background;
    delete (json as any).backgroundColor;
    delete (json as any).backgroundImage;
    const jsonString = JSON.stringify(json);
    history.current.push(jsonString);
    historyStep.current = history.current.length - 1;
    if (history.current.length > 50) {
      history.current.shift();
      historyStep.current--;
    }
  };

  const undo = () => {
    if (historyStep.current > 0) {
      isHistoryProcessing.current = true;
      historyStep.current--;
      const state = history.current[historyStep.current];
      loadCanvasState(state);
    }
  };

  const redo = () => {
    if (historyStep.current < history.current.length - 1) {
      isHistoryProcessing.current = true;
      historyStep.current++;
      const state = history.current[historyStep.current];
      loadCanvasState(state);
    }
  };

  // --- EXPORT & TOOLS HANDLERS ---
  const handleExportPng = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    setCursorsVisibility(false);
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2, enableRetinaScaling: true });
    setCursorsVisibility(true);
    const link = document.createElement('a');
    link.download = `opensketch-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSvg = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    setCursorsVisibility(false);
    const svg = canvas.toSVG();
    setCursorsVisibility(true);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `opensketch-${new Date().toISOString().slice(0, 10)}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    setCursorsVisibility(false);
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    setCursorsVisibility(true);
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(dataURL);
    const ratio = imgProps.width / imgProps.height;
    let imgWidth = pageWidth;
    let imgHeight = pageWidth / ratio;
    if (imgHeight > pageHeight) { imgHeight = pageHeight; imgWidth = pageHeight * ratio; }
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    pdf.addImage(dataURL, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(`opensketch-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleCopyClipboard = async () => {
    if (!fabricCanvasRef.current) return;
    try {
        setCursorsVisibility(false);
        const canvas = fabricCanvasRef.current;
        const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const blob = await (await fetch(dataURL)).blob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCursorsVisibility(true);
        await Swal.fire({ toast: true, position: 'bottom-start', icon: 'success', timer: 1600, showConfirmButton: false, title: 'Gambar berhasil disalin' });
    } catch (err) {
        setCursorsVisibility(true);
        console.error('Failed to copy image:', err);
        await Swal.fire({ icon: 'error', title: 'Gagal menyalin', text: 'Tidak bisa menyalin gambar ke clipboard.' });
    }
  };

  const handleImageInsert = (e: CustomEvent) => {
      const dataUrl = e.detail;
      FabricImage.fromURL(dataUrl).then((img) => {
          if (!fabricCanvasRef.current) return;
          const canvas = fabricCanvasRef.current;
          
          const maxWidth = canvas.width! * 0.5;
          if (img.width! > maxWidth) {
              img.scaleToWidth(maxWidth);
          }

          img.set({
              left: (canvas.width! - (img.width! * img.scaleX!)) / 2,
              top: (canvas.height! - (img.height! * img.scaleY!)) / 2,
              id: uuidv4(),
              opacity: opacityRef.current,
              selectable: true,
              evented: true,
              cornerStyle: 'circle',
              cornerColor: 'white',
              borderColor: '#3b82f6',
              transparentCorners: false
          });

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
          
          const json = img.toObject(['id', 'opacity']);
          socketRef.current?.emit('drawing-data', { roomId, ...json });
          saveHistory();
      });
  };

  const handleLayer = (direction: 'up' | 'down') => {
      if (!fabricCanvasRef.current) return;
      const activeObj = fabricCanvasRef.current.getActiveObject();
      if (!activeObj) return;

      if (direction === 'up') activeObj.bringToFront();
      else activeObj.sendBackwards();
      
      fabricCanvasRef.current.requestRenderAll();
      saveHistory();
      const json = activeObj.toObject(['id', 'opacity']);
      socketRef.current?.emit('drawing-data', { roomId, ...json });
  };

  const loadCanvasState = async (json: string) => {
    if (!fabricCanvasRef.current) return;
    const data = JSON.parse(json);
    const currentCursors = new Map(cursors.current);
    await fabricCanvasRef.current.loadFromJSON(data);
    applyBackground();
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.getObjects().forEach(obj => {
          if (!(obj as any).id?.startsWith('cursor-')) {
            applyToolRules(obj);
          }
      });
      currentCursors.forEach((cursorObj) => {
          if (!canvas.contains(cursorObj)) {
              canvas.add(cursorObj);
          }
      });
    }
    fabricCanvasRef.current?.requestRenderAll();
    isHistoryProcessing.current = false;
  };

  const zoomIn = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      let zoom = canvas.getZoom();
      zoom *= 1.1; 
      if (zoom > 5) zoom = 5;
      const width = canvas.width || 0;
      const height = canvas.height || 0;
      canvas.zoomToPoint(new Point(width / 2, height / 2), zoom);
      canvas.requestRenderAll();
  };

  const zoomOut = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      let zoom = canvas.getZoom();
      zoom /= 1.1; 
      if (zoom < 0.2) zoom = 0.2;
      const width = canvas.width || 0;
      const height = canvas.height || 0;
      canvas.zoomToPoint(new Point(width / 2, height / 2), zoom);
      canvas.requestRenderAll();
  };

  const setCursorsVisibility = (visible: boolean) => {
    cursors.current.forEach((cursor) => {
      cursor.visible = visible;
    });
    fabricCanvasRef.current?.requestRenderAll();
  };

  const handleScreenshotWithWatermark = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    setCursorsVisibility(false);
    const rawDataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2, enableRetinaScaling: true });
    const img = new Image();
    img.src = rawDataUrl;
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const fontSize = Math.max(20, img.width * 0.02); 
        const padding = fontSize * 1.5; 
        const iconSize = fontSize * 1.4;
        const x = padding;
        const y = img.height - padding;
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = "#ffffff"; 
        ctx.strokeStyle = "#ffffff"; 
        ctx.save();
        ctx.translate(x + iconSize/2, y - iconSize/2 - (fontSize * 0.1)); 
        ctx.rotate(-45 * Math.PI / 180); 
        ctx.fillRect(-iconSize/6, -iconSize/2, iconSize/3, iconSize * 0.6);
        ctx.beginPath();
        ctx.moveTo(-iconSize/6, iconSize * 0.1);
        ctx.lineTo(0, iconSize * 0.5); 
        ctx.lineTo(iconSize/6, iconSize * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.font = `bold ${fontSize}px 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic'; 
        ctx.fillText("Powered by Hanif Abdurrohim | OpenSketch", x + iconSize * 1.2, y);
        const finalUrl = tempCanvas.toDataURL('image/png');
        window.dispatchEvent(new CustomEvent('whiteboard:screenshot-ready', { detail: finalUrl }));
        setCursorsVisibility(true);
    };
  };

  // --- GLOBAL EVENT LISTENERS ---
  useEffect(() => {
    const handleUndoEvent = () => undo();
    const handleRedoEvent = () => redo();
    const handleZoomInEvent = () => zoomIn();
    const handleZoomOutEvent = () => zoomOut();
    const handleExportEvent = () => handleExportPng();
    const handleSvgEvent = () => handleExportSvg();
    const handlePdfEvent = () => handleExportPdf();
    const handleCopyEvent = () => handleCopyClipboard();
    const handleScreenshotRequest = () => handleScreenshotWithWatermark();
    const handleImageInsertEvent = (e: Event) => handleImageInsert(e as CustomEvent);
    const handleLayerUpEvent = () => handleLayer('up');
    const handleLayerDownEvent = () => handleLayer('down');
    const handleLocateUserEvent = (e: Event) => {
      const userId = (e as CustomEvent<string>).detail;
      const canvas = fabricCanvasRef.current;
      if (!canvas || !userId) return;
      const pos = lastPositions.current.get(userId);
      if (!pos) return;

      // Center viewport to user's last known position
      const vt = (canvas.viewportTransform || [1,0,0,1,0,0]).slice() as any[];
      const z = canvas.getZoom();
      vt[4] = canvas.getWidth()/2 - pos.x * z;
      vt[5] = canvas.getHeight()/2 - pos.y * z;
      canvas.setViewportTransform(vt as any);

      // Blink marker
      const marker = new Circle({ left: pos.x - 20, top: pos.y - 20, radius: 20, fill: 'rgba(59,130,246,0.2)', stroke: '#2563eb', strokeWidth: 3, selectable: false, evented: false, opacity: 0 } as any);
      canvas.add(marker);
      canvas.requestRenderAll();
      let visible = true;
      const blink = setInterval(() => {
        marker.set('opacity', visible ? 0.9 : 0);
        visible = !visible;
        canvas.requestRenderAll();
      }, 200);
      setTimeout(() => { clearInterval(blink); canvas.remove(marker); canvas.requestRenderAll(); }, 2000);
    };

    window.addEventListener('whiteboard:undo', handleUndoEvent);
    window.addEventListener('whiteboard:redo', handleRedoEvent);
    window.addEventListener('whiteboard:zoom-in', handleZoomInEvent);
    window.addEventListener('whiteboard:zoom-out', handleZoomOutEvent);
    window.addEventListener('whiteboard:export-png', handleExportEvent);
    window.addEventListener('whiteboard:export-svg', handleSvgEvent);
    window.addEventListener('whiteboard:export-pdf', handlePdfEvent);
    window.addEventListener('whiteboard:copy-img', handleCopyEvent);
    window.addEventListener('whiteboard:request-screenshot', handleScreenshotRequest);
    window.addEventListener('whiteboard:insert-image', handleImageInsertEvent);
    window.addEventListener('whiteboard:layer-up', handleLayerUpEvent);
    window.addEventListener('whiteboard:layer-down', handleLayerDownEvent);
    window.addEventListener('whiteboard:locate-user', handleLocateUserEvent);

    return () => {
      window.removeEventListener('whiteboard:undo', handleUndoEvent);
      window.removeEventListener('whiteboard:redo', handleRedoEvent);
      window.removeEventListener('whiteboard:zoom-in', handleZoomInEvent);
      window.removeEventListener('whiteboard:zoom-out', handleZoomOutEvent);
      window.removeEventListener('whiteboard:export-png', handleExportEvent);
      window.removeEventListener('whiteboard:export-svg', handleSvgEvent);
      window.removeEventListener('whiteboard:export-pdf', handlePdfEvent);
      window.removeEventListener('whiteboard:copy-img', handleCopyEvent);
      window.removeEventListener('whiteboard:request-screenshot', handleScreenshotRequest);
      window.removeEventListener('whiteboard:insert-image', handleImageInsertEvent);
      window.removeEventListener('whiteboard:layer-up', handleLayerUpEvent);
      window.removeEventListener('whiteboard:layer-down', handleLayerDownEvent);
      window.removeEventListener('whiteboard:locate-user', handleLocateUserEvent);
    };
  }, []);

  const emitCursorMove = useRef(throttle((data: any) => {
    socketRef.current?.emit('cursor-move', data);
  }, 50)).current;

  // Eraser size (px) managed via Sidebar
  const eraserSizeRef = useRef<number>(30);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('opensketch_eraser_size');
      const v = raw ? parseInt(raw) : 30;
      if (!isNaN(v) && v > 0 && v <= 200) eraserSizeRef.current = v;
    } catch {}
    const onSize = (e: any) => {
      const v = typeof e?.detail === 'number' ? e.detail : NaN;
      if (!isNaN(v) && v > 0 && v <= 200) eraserSizeRef.current = v;
    };
    window.addEventListener('whiteboard:eraser-size' as any, onSize as any);
    return () => window.removeEventListener('whiteboard:eraser-size' as any, onSize as any);
  }, []);

  // --- SOCKET IO ---
  useEffect(() => {
    try {
      const stored = localStorage.getItem('opensketch_username');
      if (stored) myNameRef.current = stored;
    } catch {}

    socketRef.current = io(SOCKET_URL, { path: '/socket.io' });
    if (roomId) socketRef.current.emit('join-room', roomId);

    socketRef.current.on('drawing-data', (data: any) => {
      if (!fabricCanvasRef.current) return;
      const existingObj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === data.id);
      isHistoryProcessing.current = true;
      if (!existingObj) {
        util.enlivenObjects([data]).then((objs: any[]) => {
          objs.forEach((o) => {
            (o as any).id = data.id;
            applyToolRules(o);
            fabricCanvasRef.current?.add(o);
          });
          fabricCanvasRef.current?.requestRenderAll();
          isHistoryProcessing.current = false;
          saveHistory();
        });
      } else {
        existingObj.set(data);
        existingObj.setCoords();
        fabricCanvasRef.current.requestRenderAll();
        isHistoryProcessing.current = false;
        saveHistory();
      }
    });

    socketRef.current.on('delete-object', (id: string) => {
        if (!fabricCanvasRef.current) return;
        const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === id);
        if (obj) {
            isHistoryProcessing.current = true;
            fabricCanvasRef.current.remove(obj);
            fabricCanvasRef.current.requestRenderAll();
            isHistoryProcessing.current = false;
            saveHistory();
        }
    });

    // Handle Cursor Move (Draw Cursor on Canvas)
    socketRef.current.on('cursor-move', (data: { userId: string, x: number, y: number, color: string }) => {
        if (!fabricCanvasRef.current) return;
        const { userId, x, y, color } = data;
        lastPositions.current.set(userId, { x, y });
        const p = participantsRef.current.get(userId);
        let name = p?.name;
        if (!name && socketRef.current?.id === userId) name = myNameRef.current; // pastikan self bukan Guest
        const isAnon = !name || name.trim() === '' || name.trim().toLowerCase() === 'guest';
        
        let cursor = cursors.current.get(userId) as any;
        if (!cursor) {
            // Jangan membuat cursor untuk 'Guest' anonim
            if (isAnon) return;
            const idx = shapeIndexFor(userId);
            const group = buildCursorGroup(idx, color, name);
            (group as any).left = x;
            (group as any).top = y;
            (group as any).id = `cursor-${userId}`;
            fabricCanvasRef.current.add(group);
            cursors.current.set(userId, group as any);
        } else {
            // Update posisi & nama
            const objects = (cursor as Group).getObjects();
            const labelObj = objects[1] as Text;
            if (isAnon) {
              // Hapus cursor anonim 'Guest'
              fabricCanvasRef.current.remove(cursor);
              cursors.current.delete(userId);
              fabricCanvasRef.current.requestRenderAll();
              return;
            }
            if (labelObj && labelObj.text !== name) labelObj.set({ text: name });
            (cursor as Group).set({ left: x, top: y });
            (cursor as Group).setCoords();
        }
        // Aggregate participants from traffic if server hasn't sent the list yet
        if (!participantsRef.current.has(userId)) {
          participantsRef.current.set(userId, { id: userId, name, color });
          const arr = Array.from(participantsRef.current.values());
          setParticipants(arr);
          try { (window as any).__participants = arr; } catch {}
          try { window.dispatchEvent(new CustomEvent('participants:update', { detail: arr })); } catch {}
        }
        fabricCanvasRef.current.requestRenderAll();
    });

    socketRef.current.on('user-disconnected', (userId: string) => {
        const cursor = cursors.current.get(userId);
        if (cursor && fabricCanvasRef.current) {
            fabricCanvasRef.current.remove(cursor);
            cursors.current.delete(userId);
            fabricCanvasRef.current.requestRenderAll();
        }
    });

    socketRef.current.on('participants', (arr: { id: string; name: string; color: string }[]) => {
      const cleaned = Array.isArray(arr) ? arr.filter(p => p && typeof p.name === 'string' && p.name.trim() && p.name.trim().toLowerCase() !== 'guest') : [];
      setParticipants(cleaned);
      const map = new Map<string, { id: string; name: string; color: string }>();
      cleaned.forEach(p => map.set(p.id, p));
      participantsRef.current = map;
      try { (window as any).__participants = cleaned; } catch {}
      try { window.dispatchEvent(new CustomEvent('participants:update', { detail: cleaned })); } catch {}
    });

    setTimeout(() => {
      try {
        socketRef.current?.emit('introduce', { roomId, name: myNameRef.current, color: myColor.current });
        // Ensure self is present in participants cache while waiting for server list
        const selfId = socketRef.current?.id;
        if (selfId && !participantsRef.current.has(selfId)) {
          participantsRef.current.set(selfId, { id: selfId, name: myNameRef.current, color: myColor.current });
          const arr = Array.from(participantsRef.current.values());
          setParticipants(arr);
          try { (window as any).__participants = arr; } catch {}
          try { window.dispatchEvent(new CustomEvent('participants:update', { detail: arr })); } catch {}
        }
      } catch {}
    }, 300);

    // ImageSidebar event handlers
    const onImageOpacity = (e: any) => {
      const id = e?.detail?.id; const v = e?.detail?.opacity;
      if (!fabricCanvasRef.current || typeof v !== 'number') return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => (o as any).id === id) as any;
      if (obj && obj.type === 'image') { obj.set({ opacity: v }); obj.setCoords(); fabricCanvasRef.current.requestRenderAll(); saveHistory(); }
    };
    const onImageStroke = (e: any) => {
      const id = e?.detail?.id; const color = e?.detail?.stroke;
      if (!fabricCanvasRef.current || !color) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => (o as any).id === id) as any;
      if (obj && obj.type === 'image') { obj.set({ stroke: color }); obj.setCoords(); fabricCanvasRef.current.requestRenderAll(); saveHistory(); }
    };
    const onImageStrokeWidth = (e: any) => {
      const id = e?.detail?.id; const w = e?.detail?.strokeWidth;
      if (!fabricCanvasRef.current || typeof w !== 'number') return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => (o as any).id === id) as any;
      if (obj && obj.type === 'image') { obj.set({ strokeWidth: w }); obj.setCoords(); fabricCanvasRef.current.requestRenderAll(); saveHistory(); }
    };
    const onImageLayer = (e: any) => {
      const id = e?.detail?.id; const action = e?.detail?.action;
      if (!fabricCanvasRef.current || !action) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => (o as any).id === id) as any;
      if (obj) {
        if (action === 'bringToFront') (obj as any).bringToFront?.();
        else if (action === 'sendToBack') (obj as any).sendToBack?.();
        else if (action === 'bringForward') (obj as any).bringForward?.();
        else if (action === 'sendBackwards') (obj as any).sendBackwards?.();
        fabricCanvasRef.current.requestRenderAll(); saveHistory();
      }
    };
    window.addEventListener('image:opacity' as any, onImageOpacity as any);
    window.addEventListener('image:stroke' as any, onImageStroke as any);
    window.addEventListener('image:strokeWidth' as any, onImageStrokeWidth as any);
    window.addEventListener('image:layer' as any, onImageLayer as any);

    // Selection events to toggle sidebar
    const handleSelection = () => {
      if (!fabricCanvasRef.current) return;
      const active = fabricCanvasRef.current.getActiveObject() as any;
      if (active && active.type === 'image') {
        try {
          const detail = { id: (active as any).id, opacity: active.opacity ?? 1, stroke: active.stroke || '#000000', strokeWidth: active.strokeWidth || 0 };
          window.dispatchEvent(new CustomEvent('image-sidebar:show', { detail }));
        } catch {}
      } else {
        try { window.dispatchEvent(new CustomEvent('image-sidebar:hide')); } catch {}
      }
    };
    fabricCanvasRef.current?.on('selection:created', handleSelection);
    fabricCanvasRef.current?.on('selection:updated', handleSelection);
    fabricCanvasRef.current?.on('selection:cleared', handleSelection);

    return () => { 
      socketRef.current?.disconnect(); 
      window.removeEventListener('image:opacity' as any, onImageOpacity as any);
      window.removeEventListener('image:stroke' as any, onImageStroke as any);
      window.removeEventListener('image:strokeWidth' as any, onImageStrokeWidth as any);
      window.removeEventListener('image:layer' as any, onImageLayer as any);
      fabricCanvasRef.current?.off('selection:created', handleSelection);
      fabricCanvasRef.current?.off('selection:updated', handleSelection);
      fabricCanvasRef.current?.off('selection:cleared', handleSelection);
    };
  }, [roomId]);

  // --- INIT CANVAS (RUN ONCE) ---
  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    if (initDone.current) return; // Prevent double init
    
    let disposed = false;
    const init = () => {
      if (disposed || !canvasRef.current) return;
      const canvas = new Canvas(canvasRef.current, {
        width: window.innerWidth,
        height: window.innerHeight,
        selection: true,
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
        preserveObjectStacking: true,
        stopContextMenu: true,
        fireRightClick: true,
      });

      fabricCanvasRef.current = canvas;
      initDone.current = true;
      saveHistory();
      
      updateCanvasInteraction();

      // Image selection listeners to toggle ImageSidebar
      const onSelectionChange = () => {
        const active: any = canvas.getActiveObject();
        if (active && active.type === 'image') {
          try {
            const detail = {
              id: (active as any).id,
              opacity: typeof active.opacity === 'number' ? active.opacity : 1,
              stroke: active.stroke || '#000000',
              strokeWidth: typeof active.strokeWidth === 'number' ? active.strokeWidth : 0,
            };
            window.dispatchEvent(new CustomEvent('image-sidebar:show', { detail }));
          } catch {}
        } else {
          try { window.dispatchEvent(new CustomEvent('image-sidebar:hide')); } catch {}
        }
      };
      canvas.on('selection:created', onSelectionChange);
      canvas.on('selection:updated', onSelectionChange);
      canvas.on('selection:cleared', onSelectionChange);
      canvas.on('mouse:down', onSelectionChange);

      const handleResize = () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
          });
        }
      };
      window.addEventListener('resize', handleResize);

      canvas.on('mouse:wheel', function(opt: any) {
        if (!opt || !opt.e) return;
        const ev = opt.e as any;
        const delta = typeof ev.deltaY === 'number' ? ev.deltaY : 0;
        let zoom = canvas.getZoom();
        zoom *= Math.pow(0.999, delta);
        if (zoom > 5) zoom = 5;
        if (zoom < 0.2) zoom = 0.2;
        const ox = typeof ev.offsetX === 'number' ? ev.offsetX : (typeof ev.clientX === 'number' ? ev.clientX : 0);
        const oy = typeof ev.offsetY === 'number' ? ev.offsetY : (typeof ev.clientY === 'number' ? ev.clientY : 0);
        const point = new Point(ox, oy);
        canvas.zoomToPoint(point, zoom);
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
        if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
      });

      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
      canvas.on('path:created', handlePathCreated);

      canvas.on('object:modified', (e: any) => {
          saveHistory();
          const obj = e.target;
          if (!obj) return;
          const json = obj.toObject(['id','opacity','stroke','strokeWidth','fill','left','top','scaleX','scaleY','angle','width','height']);
          socketRef.current?.emit('drawing-data', { roomId, ...json });
      });
    };
    
    const raf = requestAnimationFrame(init);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        try {
          canvas.off('selection:created');
          canvas.off('selection:updated');
          canvas.off('selection:cleared');
          canvas.off('mouse:down');
        } catch {}
      }
      if (canvas) canvas.dispose();
      fabricCanvasRef.current = null;
      initDone.current = false;
    };
  }, [mounted]);

  useEffect(() => { applyBackground(); }, [isDarkMode, gridType]);

  const applyToolRules = (obj: any) => {
      if (obj.id && obj.id.startsWith('cursor-')) return;
      const tool = activeToolRef.current;
      const isSelection = tool === ToolType.SELECTION;
      if (isSelection) {
          obj.evented = true;
          obj.selectable = true;
      } else {
          obj.evented = false;
          obj.selectable = false;
      }
  };

  const updateCanvasInteraction = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const tool = activeToolRef.current;
    const isPencil = tool === ToolType.PENCIL;

    canvas.selection = tool === ToolType.SELECTION;
    canvas.isDrawingMode = isPencil;

    if (isPencil) {
      const brush = new PencilBrush(canvas);
      brush.width = strokeWidthRef.current;
      brush.color = hexToRgba(strokeColorRef.current, opacityRef.current);
      brush.decimate = 2.5; 
      canvas.freeDrawingBrush = brush;
    }

    canvas.getObjects().forEach(obj => applyToolRules(obj));

    if (tool === ToolType.HAND) {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
    } else if (tool === ToolType.ERASER) {
      canvas.defaultCursor = 'cell'; 
      canvas.hoverCursor = 'cell';
    } else if (tool === ToolType.SELECTION) {
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
    } else {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
    }
    canvas.requestRenderAll();
  };

  // --- MOUSE HANDLERS (Drawing) ---
  const handleMouseDown = (opt: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const evt = opt.e;
    const pointer = canvas.getPointer(evt);
    const tool = activeToolRef.current;

    if (tool === ToolType.HAND) {
      if(evt.preventDefault) evt.preventDefault();
      isPanning.current = true;
      lastClientX.current = getClientPos(evt).x;
      lastClientY.current = getClientPos(evt).y;
      canvas.setCursor('grabbing');
      return;
    }

    if (tool === ToolType.ERASER) {
      if(evt.preventDefault) evt.preventDefault();
      isDrawing.current = true;
      eraseObjectsAtPoint(pointer);
      return;
    }

    if (tool === ToolType.SELECTION || tool === ToolType.PENCIL) return;

    isDrawing.current = true;
    startPoint.current = { x: pointer.x, y: pointer.y };
    const id = uuidv4();

    const commonProps = {
      left: pointer.x,
      top: pointer.y,
      fill: fillColor === 'transparent' ? '' : fillColor, 
      stroke: strokeColorRef.current,
      strokeWidth: strokeWidthRef.current,
      opacity: opacityRef.current,
      selectable: false,
      evented: false,
      originX: 'left' as const,
      originY: 'top' as const,
      id: id,
      strokeUniform: true,
      cornerStyle: 'circle' as const,
      cornerColor: 'white',
      borderColor: '#3b82f6',
      transparentCorners: false,
    };

    let shape: any = null;

    if (tool === ToolType.RECTANGLE) shape = new Rect({ ...commonProps, width: 0, height: 0 });
    else if (tool === ToolType.ROUND_RECT) shape = new Rect({ ...commonProps, width: 0, height: 0, rx: 10, ry: 10 });
    else if (tool === ToolType.CIRCLE) shape = new Ellipse({ ...commonProps, rx: 0, ry: 0 });
    else if (tool === ToolType.TRIANGLE) shape = new Triangle({ ...commonProps, width: 0, height: 0 });
    else if (tool === ToolType.RHOMBUS) shape = new Polygon([{ x: 0.5, y: 0 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }], { ...commonProps, scaleX: 0, scaleY: 0 });
    else if (tool === ToolType.HEXAGON) shape = new Polygon([{ x: 0.25, y: 0 }, { x: 0.75, y: 0 }, { x: 1, y: 0.5 }, { x: 0.75, y: 1 }, { x: 0.25, y: 1 }, { x: 0, y: 0.5 }], { ...commonProps, scaleX: 0, scaleY: 0 });
    else if (tool === ToolType.LINE) shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], commonProps);
    else if (tool === ToolType.ARROW) {
      const a = getArrowPathCentered(pointer.x, pointer.y, pointer.x, pointer.y);
      shape = new Path(a.d, { ...commonProps, left: a.left, top: a.top, originX: 'center', originY: 'center', fill: '', stroke: strokeColorRef.current });
      (shape as any).centeredRotation = true;
    }
    else if (tool === ToolType.TEXT) {
      const text = new IText('Type here', { ...commonProps, fontFamily: 'Inter, sans-serif', fontSize: 24, fill: strokeColorRef.current });
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectable = true;
      text.evented = true;
      isDrawing.current = false;
      saveHistory(); 
      return;
    }

    if (shape) {
      canvas.add(shape);
      currentObject.current = shape;
    }
  };

  const handleMouseMove = (opt: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const evt = opt.e;
    const pointer = canvas.getPointer(evt);
    emitCursorMove({ roomId, x: pointer.x, y: pointer.y, color: myColor.current });

    const tool = activeToolRef.current;

    if (tool === ToolType.HAND && isPanning.current) {
      if(evt.preventDefault) evt.preventDefault();
      const pos = getClientPos(evt);
      const deltaX = pos.x - lastClientX.current;
      const deltaY = pos.y - lastClientY.current;
      canvas.relativePan(new Point(deltaX, deltaY));
      lastClientX.current = pos.x;
      lastClientY.current = pos.y;
      return;
    }

    if (tool === ToolType.ERASER && isDrawing.current) {
        eraseObjectsAtPoint(pointer);
        return;
    }

    if (!isDrawing.current || !currentObject.current || !startPoint.current) return;

    const startX = startPoint.current.x;
    const startY = startPoint.current.y;
    const shape = currentObject.current;
    const newLeft = Math.min(startX, pointer.x);
    const newTop = Math.min(startY, pointer.y);
    const width = Math.abs(startX - pointer.x);
    const height = Math.abs(startY - pointer.y);

    if (['rectangle', 'round_rect', 'triangle'].includes(tool)) {
        shape.set({ left: newLeft, top: newTop, width, height });
    } else if (tool === ToolType.CIRCLE) {
        shape.set({ left: newLeft, top: newTop, rx: width / 2, ry: height / 2 });
    } else if (tool === ToolType.RHOMBUS || tool === ToolType.HEXAGON) {
        shape.set({ left: newLeft, top: newTop, scaleX: width, scaleY: height });
    } else if (tool === ToolType.LINE) {
        shape.set({ x2: pointer.x, y2: pointer.y });
    } else if (tool === ToolType.ARROW) {
        const a = getArrowPathCentered(startX, startY, pointer.x, pointer.y);
        const prev = shape as any;
        const keep = prev ? prev.toObject() : {} as any;
        const id = (prev && (prev as any).id) || uuidv4();
        canvas.remove(shape);
        const newArrow = new Path(a.d, { ...keep, id, left: a.left, top: a.top, originX: 'center', originY: 'center', fill: '', stroke: strokeColorRef.current });
        (newArrow as any).centeredRotation = true;
        canvas.add(newArrow);
        currentObject.current = newArrow;
    }
    canvas.requestRenderAll();
  };

  const handleMouseUp = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const tool = activeToolRef.current;

    if (tool === ToolType.HAND) {
      isPanning.current = false;
      canvas.setCursor('grab');
      return;
    }

    isDrawing.current = false;
    if (currentObject.current) {
      const shape = currentObject.current;
      shape.setCoords();
      const json = shape.toObject(['id', 'opacity']);
      socketRef.current?.emit('drawing-data', { roomId, ...json });
      saveHistory(); 
      currentObject.current = null;
    }
  };

  const handlePathCreated = (e: any) => {
    if (!e || !e.path) return;
    const path = e.path;
    path.set({ 
        id: uuidv4(), 
        opacity: opacityRef.current,
        selectable: activeToolRef.current === ToolType.SELECTION,
        evented: activeToolRef.current === ToolType.SELECTION
    });
    const json = path.toObject(['id', 'opacity']);
    socketRef.current?.emit('drawing-data', { roomId, ...json });
    saveHistory(); 
  };

  const eraseObjectsAtPoint = (pointer: { x: number, y: number }) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const zoom = canvas.getZoom();
      const brushSize = eraserSizeRef.current / zoom; 
      const objects = canvas.getObjects();
      let erasedSomething = false;
      for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i];
          if ((obj as any).id && (obj as any).id.startsWith('cursor-')) continue;
          const isIntersecting = obj.intersectsWithRect(
              new Point(pointer.x - brushSize/2, pointer.y - brushSize/2),
              new Point(pointer.x + brushSize/2, pointer.y + brushSize/2)
          );
          const containsPoint = obj.containsPoint(new Point(pointer.x, pointer.y));
          if (isIntersecting || containsPoint) {
              // If it's an image, fade it gradually instead of deleting immediately
              if ((obj as any).type === 'image') {
                  const current = typeof (obj as any).opacity === 'number' ? (obj as any).opacity : 1;
                  // Fade step scales with eraser size (bigger eraser => faster fade), clamped 0.04 - 0.22 per hit
                  const normalized = Math.max(6, Math.min(120, eraserSizeRef.current));
                  const step = Math.min(0.22, Math.max(0.04, normalized / 600));
                  const next = Math.max(0, current - step);
                  (obj as any).set({ opacity: next });
                  obj.setCoords();
                  canvas.requestRenderAll();
                  erasedSomething = true;
                  // If nearly invisible, remove it fully
                  if (next <= 0.02) {
                      canvas.remove(obj);
                      socketRef.current?.emit('delete-object', { roomId, id: (obj as any).id });
                  } else {
                      const json = (obj as any).toObject(['id','opacity']);
                      socketRef.current?.emit('drawing-data', { roomId, ...json });
                  }
              } else {
                  // Non-image objects: also fade gradually
                  const current = typeof (obj as any).opacity === 'number' ? (obj as any).opacity : 1;
                  const normalized = Math.max(6, Math.min(120, eraserSizeRef.current));
                  const step = Math.min(0.22, Math.max(0.04, normalized / 600));
                  const next = Math.max(0, current - step);
                  (obj as any).set({ opacity: next });
                  obj.setCoords();
                  canvas.requestRenderAll();
                  erasedSomething = true;
                  if (next <= 0.02) {
                      fabricCanvasRef.current.remove(obj);
                      socketRef.current?.emit('delete-object', { roomId, id: (obj as any).id });
                  } else {
                      const json = (obj as any).toObject(['id','opacity']);
                      socketRef.current?.emit('drawing-data', { roomId, ...json });
                  }
              }
          }
      }
      if (erasedSomething) saveHistory();
  };

  if (!mounted) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-neutral-100 dark:bg-zinc-900">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">Initializing...</div>
      </div>
    );
  }

  // --- RETURN STATEMENT ---
  return (
    <div 
      className="w-full h-full relative overflow-hidden bg-neutral-100 dark:bg-zinc-900" 
      style={{ touchAction: 'none' }} 
    >
      {/* 1. Static Canvas Wrapper */}
      <div className="absolute inset-0 w-full h-full z-0">
         <StaticCanvas ref={canvasRef} />
      </div>

      {/* 2. UI Overlay (Participants & Locator) */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        {participants.length > 0 && (
            <div className="hidden md:block absolute top-20 right-4 md:top-6 md:right-24 z-[9999] bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl p-3 w-64 max-h-48 overflow-auto text-xs pointer-events-auto">
            <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200 mb-2 pb-2 border-b border-gray-200 dark:border-zinc-700">
                <User size={14} />
                <span>Anggota ({participants.length})</span>
            </div>
            <div className="space-y-2">
                {participants.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 group">
                    <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-white/50" style={{ backgroundColor: p.color }} />
                    <span className="truncate text-gray-700 dark:text-gray-300 font-medium">{p.name}</span>
                    </div>
                    {/* Tombol Cari / Locate */}
                    <button
                    className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900/50 dark:hover:bg-blue-800 dark:text-blue-200 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Temukan Lokasi"
                    onClick={() => {
                        const canvas = fabricCanvasRef.current;
                        const pos = lastPositions.current.get(p.id);
                        if (!canvas || !pos) return;
                        
                        // Efek Marker Kedip
                        const marker = new Circle({ 
                            left: pos.x - 20, 
                            top: pos.y - 20, 
                            radius: 20, 
                            fill: 'rgba(59,130,246,0.2)', 
                            stroke: '#2563eb', 
                            strokeWidth: 3, 
                            selectable: false, 
                            evented: false,
                            opacity: 0
                        } as any);
                        
                        canvas.add(marker);
                        
                        // Animasi Zoom & Pan ke user
                        const vpt = canvas.viewportTransform || [1,0,0,1,0,0];
                        const zoom = canvas.getZoom();
                        vpt[4] = (canvas.getWidth()/2) - (pos.x * zoom);
                        vpt[5] = (canvas.getHeight()/2) - (pos.y * zoom);
                        canvas.setViewportTransform(vpt as any);
                        canvas.requestRenderAll();

                        // Animasi Kedip Marker
                        let visible = true;
                        const blinkInterval = setInterval(() => {
                            marker.set('opacity', visible ? 0.8 : 0);
                            visible = !visible;
                            canvas.requestRenderAll();
                        }, 200);

                        // Hapus marker setelah 2 detik
                        setTimeout(() => { 
                            clearInterval(blinkInterval);
                            canvas.remove(marker); 
                            canvas.requestRenderAll(); 
                        }, 2000);
                    }}
                    >
                        <Search size={14} />
                    </button>
                </div>
                ))}
            </div>
            </div>
        )}
      </div>
    </div>
  );
};