export enum ToolType {
  SELECTION = 'selection',
  RECTANGLE = 'rectangle',
  ROUND_RECT = 'round_rect',
  CIRCLE = 'circle',
  TRIANGLE = 'triangle',
  RHOMBUS = 'rhombus',
  HEXAGON = 'hexagon',
  LINE = 'line',
  ARROW = 'arrow',
  PENCIL = 'pencil',
  TEXT = 'text',
  ERASER = 'eraser',
  HAND = 'hand',
  IMAGE = 'image'
}

export enum GridType {
  NONE = 'none',
  LINES = 'lines',
  DOTS = 'dots'
}

export interface DrawingElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  roughness: number;
  points?: { x: number; y: number }[];
  text?: string;
  version: number;
}

export interface UserCursor {
  id: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

// UPDATE: Tambah 'type' untuk membedakan pesan user vs sistem
export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isMe?: boolean;
  type?: 'text' | 'system'; 
}

export interface RoomState {
  roomId: string;
  users: UserCursor[];
}