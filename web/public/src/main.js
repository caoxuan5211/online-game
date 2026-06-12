import { drawGame } from "./render.js?v=20260613-smooth6";
import { createInput } from "./input.js?v=20260613-smooth6";
import { predictLocalState } from "./prediction.js?v=20260613-smooth6";
import { finishLoader, preloadReady, setLoaderStatus } from "./preload.js?v=20260613-smooth6";
import { createSettings } from "./settings.js?v=20260613-smooth6";
import { createStateBuffer } from "./smoothing.js?v=20260613-smooth6";
import { setupUi } from "./ui.js?v=20260613-smooth6";

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

setInterval(() => sendInput(false), 1000 / 30);

function sendInput(force = false) {
  if (!session.joined || !socket.connected) return;
  const vector = input.vector();
  const now = performance.now();
  const changed = Math.abs(vector.x - lastInput.x) > 0.01 || Math.abs(vector.y - lastInput.y) > 0.01;
  if (force && !changed && now - lastInputAt < 34) return;
  if (!force && !changed && now - lastInputAt < 160) return;
  if (force) socket.emit("input", vector);
  else socket.volatile.emit("input", vector);
  lastInput = vector;
  lastInputAt = now;
}

function joinRoom(options) {
  session.color = options.color;
  socket.emit("joinRoom", { ...options, settings: { difficulty: settings.values.difficulty } });
}

function frame() {
  const state = buffer.current() || session.state;
  const predicted = predictLocalState(state, session.playerId, input.vector());
  drawGame(canvas, predicted, session.playerId, settings.values);
  requestAnimationFrame(frame);
}

frame();
