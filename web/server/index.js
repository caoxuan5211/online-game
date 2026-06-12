import express from "express";
import http from "http";
import { dirname, join } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { createGameRoom, updateRoom } from "./room.js";

const PORT = Number(process.env.PORT || 3000);
const TICK_RATE = 60;
const STATE_RATE = 60;
const rooms = new Map();
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
let lastTick = Date.now();
let broadcastStep = 0;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(publicDir, { setHeaders: setStaticCache }));

io.on("connection", socket => {
  socket.emit("roomList", publicRooms());
  socket.on("createRoom", data => createRoom(socket, data));
  socket.on("joinRoom", data => joinRoom(socket, data));
  socket.on("setProfile", data => setProfile(socket, data));
  socket.on("setReady", ready => setReady(socket, ready));
  socket.on("setSettings", settings => setSettings(socket, settings));
  socket.on("input", input => setInput(socket, input));
  socket.on("restart", () => restart(socket));
  socket.on("disconnect", () => leaveRoom(socket));
});

setInterval(() => {
  const now = Date.now();
  const dt = clamp((now - lastTick) / 1000, 1 / 120, 1 / 30);
  lastTick = now;
  broadcastStep = (broadcastStep + 1) % (TICK_RATE / STATE_RATE);
  const shouldBroadcast = broadcastStep === 0;
  for (const [roomId, room] of rooms) {
    updateRoom(room, dt);
    if (shouldBroadcast) io.to(roomId).volatile.emit("state", room.publicState());
    if (room.players.size === 0) {
      rooms.delete(roomId);
      emitRooms();
    }
  }
}, 1000 / TICK_RATE);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Elastic Duo server running on http://0.0.0.0:${PORT}`);
});

function joinRoom(socket, data = {}) {
  const roomId = sanitizeRoom(data.roomId);
  const color = sanitizeColor(data.color);
  const name = sanitizeName(data.name);
  const room = getRoom(roomId);
  if (!room.canJoin(socket.id)) {
    socket.emit("joinError", room.status === "waiting" ? "房间已满" : "游戏已经开始");
    return;
  }
  leaveCurrentRoom(socket);
  socket.join(roomId);
  socket.data.roomId = roomId;
  room.addPlayer(socket.id, { color, name });
  room.setSettings(data.settings);
  socket.emit("joined", { playerId: socket.id, roomId });
  io.to(roomId).emit("state", room.publicState());
  emitRooms();
}

function createRoom(socket, data = {}) {
  const roomId = sanitizeRoom(data.roomId || randomRoomId());
  const room = getRoom(roomId);
  room.setSettings(data.settings);
  socket.emit("roomCreated", { roomId });
  emitRooms();
}

function setProfile(socket, data = {}) {
  const room = rooms.get(socket.data.roomId);
  if (!room) return;
  const result = room.setProfile(socket.id, {
    name: sanitizeName(data.name),
    color: sanitizeColor(data.color)
  });
  if (result?.ok === false) socket.emit("profileError", result.message);
  io.to(socket.data.roomId).emit("state", room.publicState());
  emitRooms();
}

function setReady(socket, ready) {
  const room = rooms.get(socket.data.roomId);
  if (!room) return;
  const result = room.setReady(socket.id, Boolean(ready));
  if (result?.ok === false && result.message) socket.emit("profileError", result.message);
  io.to(socket.data.roomId).emit("state", room.publicState());
}

function setSettings(socket, settings = {}) {
  const room = rooms.get(socket.data.roomId);
  if (!room) return;
  room.setSettings(settings);
}

function setInput(socket, input = {}) {
  const room = rooms.get(socket.data.roomId);
  if (!room) return;
  room.setInput(socket.id, input);
}

function restart(socket) {
  const room = rooms.get(socket.data.roomId);
  if (!room || room.status === "countdown") return;
  room.restart();
  io.to(socket.data.roomId).emit("state", room.publicState());
}

function leaveRoom(socket) {
  leaveCurrentRoom(socket);
  emitRooms();
}

function leaveCurrentRoom(socket) {
  const room = rooms.get(socket.data.roomId);
  if (!room) return;
  room.removePlayer(socket.id);
  socket.leave(socket.data.roomId);
  socket.data.roomId = null;
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, createGameRoom(roomId));
  return rooms.get(roomId);
}

function sanitizeRoom(value) {
  return String(value || "default").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "default";
}

function sanitizeName(value) {
  return String(value || "Player").replace(/[<>]/g, "").slice(0, 16) || "Player";
}

function sanitizeColor(value) {
  const color = String(value || "#4f68ff").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "#4f68ff";
}

function randomRoomId() {
  return `ROOM${Math.floor(1000 + Math.random() * 9000)}`;
}

function publicRooms() {
  return [...rooms.values()].map(room => room.publicSummary());
}

function emitRooms() {
  io.emit("roomList", publicRooms());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setStaticCache(res, filePath) {
  if (/[\\/]index\.html$|[\\/]config\.js$|[\\/]sw\.js$/i.test(filePath)) {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    return;
  }
  if (/\.(png|svg|jpg|jpeg|webp|ico)$/i.test(filePath)) {
    res.setHeader("Cache-Control", "public, max-age=86400");
    return;
  }
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
}
