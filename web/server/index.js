import express from "express";
import http from "http";
import { dirname, join } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { createGameRoom, updateRoom } from "./room.js";

const PORT = Number(process.env.PORT || 3000);
const TICK_RATE = 60;
const rooms = new Map();
const __dirname = dirname(fileURLToPath(import.meta.url));
let lastTick = Date.now();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
app.use(express.static(join(__dirname, "../public")));

io.on("connection", socket => {
  socket.on("joinRoom", data => joinRoom(socket, data));
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
  for (const [roomId, room] of rooms) {
    updateRoom(room, dt);
    io.to(roomId).emit("state", room.publicState());
    if (room.players.size === 0) rooms.delete(roomId);
  }
}, 1000 / TICK_RATE);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Elastic Duo server running on http://0.0.0.0:${PORT}`);
});

function joinRoom(socket, data = {}) {
  const roomId = sanitizeRoom(data.roomId);
  const color = data.color === "blue" ? "blue" : "red";
  const name = sanitizeName(data.name);
  const room = getRoom(roomId);
  socket.join(roomId);
  socket.data.roomId = roomId;
  room.addPlayer(socket.id, { color, name });
  room.setSettings(data.settings);
  socket.emit("joined", { playerId: socket.id, roomId });
  io.to(roomId).emit("state", room.publicState());
}

function setReady(socket, ready) {
  const room = rooms.get(socket.data.roomId);
  if (!room) return;
  room.setReady(socket.id, Boolean(ready));
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
  if (!room) return;
  room.restart();
}

function leaveRoom(socket) {
  const room = rooms.get(socket.data.roomId);
  if (!room) return;
  room.removePlayer(socket.id);
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
