export enum ToolType {
  SELECTION = 'selection',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  LINE = 'line',
  ARROW = 'arrow',
  PENCIL = 'pencil',
  TEXT = 'text',
  ERASER = 'eraser'
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
  points?: { x: number; y: number }[]; // For pencil/lines
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

export interface RoomState {
  roomId: string;
  users: UserCursor[];
}