import { create } from 'zustand';
import { ToolType, GridType } from '../types';

interface AppState {
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  roughness: number;
  opacity: number;
  isDarkMode: boolean;
  scale: number;
  gridType: GridType;
  isSidebarOpen: boolean;
  roomId: string | null;
  roomHost: string | null; // Nama pemilik ruangan
  
  // Actions
  setActiveTool: (tool: ToolType) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillColor: (color: string) => void;
  setRoughness: (roughness: number) => void;
  setOpacity: (opacity: number) => void;
  toggleDarkMode: () => void;
  setScale: (scale: number) => void;
  setGridType: (type: GridType) => void;
  toggleSidebar: () => void;
  setRoomId: (id: string) => void;
  setRoomHost: (name: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTool: ToolType.SELECTION,
  strokeColor: '#000000',
  strokeWidth: 2,
  fillColor: 'transparent',
  roughness: 1,
  opacity: 1, // Default opacity 100%
  isDarkMode: false,
  scale: 1,
  gridType: GridType.NONE,
  isSidebarOpen: false,
  roomId: null,
  roomHost: null,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setFillColor: (color) => set({ fillColor: color }),
  setRoughness: (roughness) => set({ roughness }),
  setOpacity: (opacity) => set({ opacity }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setScale: (scale) => set({ scale }),
  setGridType: (type) => set({ gridType: type }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setRoomId: (id) => set({ roomId: id }),
  setRoomHost: (name) => set({ roomHost: name }),
}));