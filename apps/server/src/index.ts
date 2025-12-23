import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const cors = require('cors');

dotenv.config();

const app = express();

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json() as any);

const server = http.createServer(app);
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: false
  }
});

const PORT = process.env.PORT || 3001;

app.get('/', (req: any, res: any) => {
  res.send('OpenSketch Socket Server Running');
});

type Participant = { id: string; name: string; color: string };
const roomParticipants: Map<string, Map<string, Participant>> = new Map();

io.on('connection', (socket: any) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    (socket as any).data = (socket as any).data || {};
    (socket as any).data.roomId = roomId;
    // Ensure room map exists and send current participants to the newcomer
    let roomMap = roomParticipants.get(roomId);
    if (!roomMap) {
      roomMap = new Map();
      roomParticipants.set(roomId, roomMap);
    }
    io.to(socket.id).emit('participants', Array.from(roomMap.values()));
    
    // SYSTEM MESSAGE: Beritahu orang lain ada user baru (tanpa nama dulu/anonymous)
    // Nanti client bisa kirim "I am [Name]" lewat chat-message type system jika mau lebih detail
  });

  socket.on('introduce', (payload: { roomId: string; name: string; color: string }) => {
    const { roomId, name, color } = payload || {};
    if (!roomId) return;
    let roomMap = roomParticipants.get(roomId);
    if (!roomMap) {
      roomMap = new Map();
      roomParticipants.set(roomId, roomMap);
    }
    roomMap.set(socket.id, { id: socket.id, name: name || 'Guest', color: color || '#60a5fa' });
    io.to(roomId).emit('participants', Array.from(roomMap.values()));

    // Notify others with a system chat message
    socket.to(roomId).emit('chat-message', {
      id: `${Date.now()}-${socket.id}`,
      username: name || 'Guest',
      message: 'joined the room',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system'
    });
  });

  // --- FITUR CHAT REAL-TIME ---
  socket.on('chat-message', (data: any) => {
    const { roomId, ...messageData } = data;
    // Broadcast pesan ke user lain di room
    socket.to(roomId).emit('chat-message', messageData);
  });
  // ----------------------------

  socket.on('drawing-data', (data: any) => {
    const { roomId, ...drawingData } = data;
    socket.to(roomId).emit('drawing-data', drawingData);
  });

  socket.on('delete-object', (data: any) => {
      const { roomId, id } = data;
      socket.to(roomId).emit('delete-object', id);
  });

  socket.on('cursor-move', (data: any) => {
    socket.to(data.roomId).emit('cursor-move', {
      userId: socket.id,
      ...data
    });
  });

  socket.on('disconnect', () => {
    const roomId = (socket as any).data?.roomId;
    if (roomId) {
      const roomMap = roomParticipants.get(roomId);
      // Preserve name before deletion
      const name = roomMap?.get(socket.id)?.name || 'Guest';
      if (roomMap && roomMap.has(socket.id)) {
        roomMap.delete(socket.id);
        io.to(roomId).emit('participants', Array.from(roomMap.values()));
      }
      io.to(roomId).emit('user-disconnected', socket.id);

      // Notify others user left
      io.to(roomId).emit('chat-message', {
        id: `${Date.now()}-${socket.id}-left`,
        username: name,
        message: 'left the room',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system'
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
      const filePath = path.join(process.cwd(), 'port.txt');
      fs.writeFileSync(filePath, `PORT=${PORT}`);
      console.log(`[SYSTEM] PORT SAVED TO: ${filePath}`);
  } catch (err) {
      console.error("[SYSTEM] FAILED TO WRITE PORT FILE", err);
  }
});