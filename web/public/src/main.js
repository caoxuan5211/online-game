import { drawGame } from "./render.js";
import { createInput } from "./input.js";
import { finishLoader, preloadReady, setLoaderStatus } from "./preload.js";
import { createSettings } from "./settings.js";
import { createStateBuffer } from "./smoothing.js";
import { setupUi } from "./ui.js";

const config = window.GAME_CONFIG || {};
const canvas = document.querySelector("#gameCanvas");
const settings = createSettings();
const socket = io(config.serverUrl || location.origin, { transports: ["websocket", "polling"] });
const input = createInput(() => sendInput(true));
const buffer = createStateBuffer();
const session = { playerId: null, color: "#4f68ff", state: null, joined: false };
let lastInput = { x: null, y: null };
let lastInputAt = 0;

const ui = setupUi({
  session,
  settings,
  onJoin: joinRoom,
  onProfile: data => socket.emit("setProfile", data),
  onReady: ready => socket.emit("setReady", ready),
  onRestart: () => socket.emit("restart"),
  onSettings: next => {
    settings.update(next);
    if (session.joined) socket.emit("setSettings", { difficulty: settings.values.difficulty });
  }
});
const loaderFallback = setTimeout(() => finishLoader("进入游戏"), 4500);

preloadReady.then(() => setLoaderStatus("连接服务器"));

socket.on("connect", () => {
  clearTimeout(loaderFallback);
  ui.setStatus("已连接，进入房间后开始");
  finishLoader("进入游戏");
});
socket.on("disconnect", () => ui.setStatus("连接断开"));
socket.on("joined", data => {
  session.playerId = data.playerId;
  session.joined = true;
  ui.afterJoin(data.roomId);
});
socket.on("roomList", rooms => ui.updateRooms(rooms));
socket.on("profileError", message => ui.showProfileError(message));
socket.on("joinError", message => ui.showJoinError(message));
socket.on("state", state => {
  session.state = state;
  buffer.push(state);
  ui.update(state);
});

setInterval(() => sendInput(false), 1000 / 20);

function sendInput(force = false) {
  if (!session.joined || !socket.connected) return;
  const vector = input.vector();
  const now = performance.now();
  const changed = Math.abs(vector.x - lastInput.x) > 0.01 || Math.abs(vector.y - lastInput.y) > 0.01;
  if (!force && !changed && now - lastInputAt < 250) return;
  socket.volatile.emit("input", vector);
  lastInput = vector;
  lastInputAt = now;
}

function joinRoom(options) {
  session.color = options.color;
  socket.emit("joinRoom", { ...options, settings: { difficulty: settings.values.difficulty } });
}

function frame() {
  drawGame(canvas, buffer.current() || session.state, session.playerId, settings.values);
  requestAnimationFrame(frame);
}

frame();
