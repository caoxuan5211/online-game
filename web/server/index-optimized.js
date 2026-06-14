import express from "express";
import http from "http";
import { dirname, join } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { createGameRoom, updateRoom } from "./room.js";

const PORT = Number(process.env.PORT || 3000);
const TICK_RATE = 60;
const STATE_RATE = 30;
const rooms = new Map();
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
let lastTick = Date.now();
let broadcastStep = 0;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ============================================
// 🚀 优化: 启用 Gzip/Brotli 压缩
// ============================================
// 注意: 需要运行 npm install compression
// 取消下面两行注释来启用压缩:
// import compression from "compression";
// app.use(compression());

app.use(express.static(publicDir, { setHeaders: setStaticCache }));
