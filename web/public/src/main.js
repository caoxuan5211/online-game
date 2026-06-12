import { drawGame } from "./render.js";
import { createInput } from "./input.js";
import { createStateBuffer } from "./smoothing.js";
import { setupUi } from "./ui.js";

const config = window.GAME_CONFIG || {};
const canvas = document.querySelector("#gameCanvas");
const input = createInput();
const socket = io(config.serverUrl || location.origin, { transports: ["websocket", "polling"] });
const buffer = createStateBuffer();
const session = { playerId: null, color: "red", state: null, joined: false };

const ui = setupUi({
  session,
  onJoin: joinRoom,
  onReady: ready => socket.emit("setReady", ready),
  onRestart: () => socket.emit("restart")
});

socket.on("connect", () => ui.setStatus("已连接，进入房间后开始"));
socket.on("disconnect", () => ui.setStatus("连接断开"));
socket.on("joined", data => {
  session.playerId = data.playerId;
  session.joined = true;
  ui.afterJoin(data.roomId);
});
socket.on("state", state => {
  session.state = state;
  buffer.push(state);
  ui.update(state);
});

setInterval(() => {
  if (!session.joined) return;
  socket.emit("input", input.vector());
}, 1000 / 60);

function joinRoom(options) {
  session.color = options.color;
  socket.emit("joinRoom", options);
}

function frame() {
  drawGame(canvas, buffer.current() || session.state, session.playerId);
  requestAnimationFrame(frame);
}

frame();
