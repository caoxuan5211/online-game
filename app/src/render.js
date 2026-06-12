const COLORS = {
  red: "#f05a52",
  redGlow: "rgba(240,90,82,0.34)",
  blue: "#4aa8e8",
  blueGlow: "rgba(74,168,232,0.34)",
  band: "#f0c766",
  danger: "#e6dfd1",
  text: "#f4efe5"
};
const WORLD = { width: 1280, height: 720 };

export function drawGame(canvas, state, playerId) {
  const ctx = prepareCanvas(canvas, state?.world || WORLD);
  const world = state?.world || WORLD;
  clear(ctx, world);
  drawArena(ctx, world);
  if (!state) return drawCenter(ctx, canvas, "连接中");
  ctx.save();
  applyScreenShake(ctx, state);
  drawChallenge(ctx, state);
  drawDangerHints(ctx, state.obstacles, state.world);
  drawObstacles(ctx, state.obstacles);
  drawBand(ctx, state.players);
  drawPlayers(ctx, state.players, playerId);
  drawTension(ctx, state);
  ctx.restore();
  drawOverlay(ctx, canvas, state);
}

function prepareCanvas(canvas, world) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(width / world.width, 0, 0, height / world.height, 0, 0);
  return ctx;
}

function clear(ctx, world) {
  const gradient = ctx.createRadialGradient(world.width * 0.5, world.height * 0.44, 40, world.width * 0.5, world.height * 0.5, world.width * 0.76);
  gradient.addColorStop(0, "#202026");
  gradient.addColorStop(0.58, "#14171d");
  gradient.addColorStop(1, "#0b0d11");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawArena(ctx, world) {
  ctx.strokeStyle = "rgba(240,239,230,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < world.width; x += 48) line(ctx, x, 0, x, world.height);
  for (let y = 0; y < world.height; y += 48) line(ctx, 0, y, world.width, y);
  ctx.strokeStyle = "rgba(240,239,230,0.22)";
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, world.width - 32, world.height - 32);
}

function drawChallenge(ctx, state) {
  if (!state.challenge) return;
  const urgency = 1 - state.challenge.remaining / state.challenge.duration;
  const pulse = 0.18 + Math.sin(performance.now() / 58) * 0.09 + urgency * 0.16;
  drawZone(ctx, state.challenge.zones.red, state.world, COLORS.red, pulse);
  drawZone(ctx, state.challenge.zones.blue, state.world, COLORS.blue, pulse);
  ctx.strokeStyle = "rgba(244,239,229,0.52)";
  ctx.lineWidth = 6;
  ctx.setLineDash([24, 16]);
  if (state.challenge.vertical) line(ctx, state.world.width / 2, 0, state.world.width / 2, state.world.height);
  else line(ctx, 0, state.world.height / 2, state.world.width, state.world.height / 2);
  ctx.setLineDash([]);
}

function drawZone(ctx, zone, world, color, alpha) {
  const rect = zoneRect(zone, world);
  ctx.fillStyle = hexToRgba(color, alpha);
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function drawObstacles(ctx, obstacles) {
  obstacles.forEach(obstacle => {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(obstacle.spin);
    ctx.shadowColor = "rgba(230,223,209,0.55)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = COLORS.danger;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    line(ctx, -obstacle.r, -obstacle.r, obstacle.r, obstacle.r);
    line(ctx, obstacle.r, -obstacle.r, -obstacle.r, obstacle.r);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(240,90,82,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, obstacle.r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawBand(ctx, players) {
  if (players.length < 2) return;
  const [a, b] = players;
  const strain = clamp((Math.hypot(a.x - b.x, a.y - b.y) - 190) / 200, 0, 1);
  const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  gradient.addColorStop(0, COLORS[a.color] || COLORS.band);
  gradient.addColorStop(0.5, strain > 0.72 ? "#ff7a57" : COLORS.band);
  gradient.addColorStop(1, COLORS[b.color] || COLORS.band);
  ctx.shadowColor = strain > 0.72 ? "rgba(255,100,80,0.62)" : "rgba(240,199,102,0.38)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.setLineDash(strain > 0.72 ? [14, 10] : []);
  drawElasticCurve(ctx, a, b, strain);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}

function drawPlayers(ctx, players, playerId) {
  players.forEach(player => {
    const speed = Math.hypot(player.vx || 0, player.vy || 0);
    drawTrail(ctx, player, speed);
    ctx.shadowColor = player.color === "red" ? COLORS.redGlow : COLORS.blueGlow;
    ctx.shadowBlur = 26;
    ctx.fillStyle = COLORS[player.color] || "#888";
    ctx.strokeStyle = player.id === playerId ? "#fff" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = player.id === playerId ? 6 : 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawFacingDot(ctx, player);
    drawName(ctx, player);
  });
}

function drawName(ctx, player) {
  ctx.fillStyle = COLORS.text;
  ctx.font = "600 18px Bahnschrift, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.name, player.x, player.y - 30);
}

function drawCenter(ctx, canvas, text) {
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLORS.text;
  ctx.font = "700 34px Bahnschrift, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function drawDangerHints(ctx, obstacles, world) {
  obstacles.forEach(obstacle => {
    if (obstacle.x > 0 && obstacle.x < world.width && obstacle.y > 0 && obstacle.y < world.height) return;
    const x = clamp(obstacle.x, 28, world.width - 28);
    const y = clamp(obstacle.y, 28, world.height - 28);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(obstacle.vy, obstacle.vx));
    ctx.fillStyle = "rgba(240,90,82,0.68)";
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawTrail(ctx, player, speed) {
  if (speed < 28) return;
  const length = clamp(speed / 7, 12, 58);
  const angle = Math.atan2(player.vy || 0, player.vx || 0);
  const gradient = ctx.createLinearGradient(player.x, player.y, player.x - Math.cos(angle) * length, player.y - Math.sin(angle) * length);
  gradient.addColorStop(0, player.color === "red" ? "rgba(240,90,82,0.44)" : "rgba(74,168,232,0.44)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  line(ctx, player.x, player.y, player.x - Math.cos(angle) * length, player.y - Math.sin(angle) * length);
}

function drawFacingDot(ctx, player) {
  const angle = Math.atan2(player.vy || 0, player.vx || 1);
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(angle) * 9, player.y + Math.sin(angle) * 9, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawElasticCurve(ctx, a, b, strain) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const wobble = Math.sin(performance.now() / 80) * 18 * strain;
  const cx = mx + (-dy / dist) * wobble;
  const cy = my + (dx / dist) * wobble;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(cx, cy, b.x, b.y);
  ctx.stroke();
}

function drawTension(ctx, state) {
  if (!state.tether || state.players.length < 2) return;
  const [a, b] = state.players;
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2 + 28;
  const width = 130;
  ctx.fillStyle = "rgba(12,14,18,0.58)";
  ctx.fillRect(x - width / 2, y, width, 8);
  ctx.fillStyle = state.tether.strain > 0.72 ? "#ff745f" : COLORS.band;
  ctx.fillRect(x - width / 2, y, width * state.tether.strain, 8);
}

function drawOverlay(ctx, canvas, state) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (state.challenge) drawChallengeTimer(ctx, canvas, state.challenge);
  if (state.status !== "running") drawCenter(ctx, canvas, state.message);
}

function drawChallengeTimer(ctx, canvas, challenge) {
  const x = canvas.width - 58;
  const y = 58;
  const radius = 28;
  const progress = challenge.remaining / challenge.duration;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = progress < 0.35 ? "#ff745f" : COLORS.band;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
}

function applyScreenShake(ctx, state) {
  if (state.status !== "gameover") return;
  const shake = Math.sin(performance.now() / 24) * 3;
  ctx.translate(shake, -shake * 0.5);
}

function zoneRect(zone, world) {
  if (zone === "left") return { x: 0, y: 0, w: world.width / 2, h: world.height };
  if (zone === "right") return { x: world.width / 2, y: 0, w: world.width / 2, h: world.height };
  if (zone === "top") return { x: 0, y: 0, w: world.width, h: world.height / 2 };
  return { x: 0, y: world.height / 2, w: world.width, h: world.height / 2 };
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
