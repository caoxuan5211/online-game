import { io } from "socket.io-client";
import { drawGame } from "./render.js";
import { createInput } from "./input.js";
import { createStateBuffer } from "./smoothing.js";
import { setupUi } from "./ui.js";

const DEFAULT_SERVER = import.meta.env.VITE_GAME_SERVER || "http://160.25.134.111:3000";
const canvas = document.querySelector("#gameCanvas");
const input = createInput();
const buffer = createStateBuffer();
const session = { playerId: null, color: "red", state: null, joined: false };
let socket = null;

const ui = setupUi({
  session,
  defaultServer: DEFAULT_SERVER,
  onJoin: joinRoom,
  onReady: ready => socket?.emit("setReady", ready),
  onRestart: () => socket?.emit("restart")
});

setInterval(() => {
  if (!session.joined) return;
  socket?.emit("input", input.vector());
}, 1000 / 60);

function joinRoom(options) {
  session.color = options.color;
  connect(options.serverUrl);
  socket.emit("joinRoom", options);
}

function connect(serverUrl) {
  if (socket) socket.disconnect();
  socket = io(serverUrl, { transports: ["websocket", "polling"] });
  socket.on("connect", () => ui.setStatus("已连接，等待准备"));
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
}

function frame() {
  drawGame(canvas, buffer.current() || session.state, session.playerId);
  requestAnimationFrame(frame);
}

frame();
