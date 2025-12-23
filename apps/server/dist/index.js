"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cors = require('cors');
dotenv_1.default.config();
const app = (0, express_1.default)();
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ["*"]);
app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    },
    pingTimeout: 25000,
    pingInterval: 20000,
    maxHttpBufferSize: 1e6
});
const PORT = process.env.PORT || 3001;
// Note: Logic Room PHP ada di php-backend, Node.js hanya handle Socket
app.get('/', (req, res) => {
    res.send('OpenSketch Socket Server Running');
});
const validRoom = (roomId) => typeof roomId === 'string' && /^[A-Z0-9]{4,10}$/.test(roomId);
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.on('join-room', (roomId) => {
        if (!validRoom(roomId))
            return;
        socket.join(roomId);
    });
    socket.on('drawing-data', (data) => {
        if (!data || typeof data !== 'object')
            return;
        const { roomId, ...drawingData } = data;
        if (!validRoom(roomId))
            return;
        socket.to(roomId).emit('drawing-data', drawingData);
    });
    socket.on('delete-object', (data) => {
        if (!data || typeof data !== 'object')
            return;
        const { roomId, id } = data;
        if (!validRoom(roomId) || typeof id !== 'string')
            return;
        socket.to(roomId).emit('delete-object', id);
    });
    socket.on('cursor-move', (data) => {
        if (!data || typeof data !== 'object')
            return;
        const { roomId, x, y, color } = data;
        if (!validRoom(roomId))
            return;
        socket.to(roomId).emit('cursor-move', {
            userId: socket.id,
            x,
            y,
            color
        });
    });
    socket.on('disconnect', () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                socket.to(room).emit('user-disconnected', socket.id);
            }
        }
    });
});
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Tulis PORT ke file text agar bisa dibaca di File Manager cPanel
    try {
        const filePath = path_1.default.join(__dirname, '../port.txt');
        fs_1.default.writeFileSync(filePath, `PORT=${PORT}`);
        console.log(`[SYSTEM] PORT SAVED TO: ${filePath}`);
    }
    catch (err) {
        console.error("[SYSTEM] FAILED TO WRITE PORT FILE", err);
    }
});
