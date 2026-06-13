import { drawSplitLine, hexToRgba, line, roundRect, zonePoints } from "./render-utils.js?v=20260613-smooth15";
import { drawStaticScene } from "./render-cache.js?v=20260613-smooth15";
import { prepareCanvas, resolveRenderProfile } from "./render-quality.js?v=20260613-smooth15";

const COLORS = {
  band: "#f0c766",
  danger: "#e6dfd1",
  text: "#f4efe5"
};
const WORLD = { width: 1280, height: 720 };
let gameoverKey = "";
let gameoverAt = 0;

export function drawGame(canvas, state, playerId, prefs = {}) {
  const world = state?.world || WORLD;
  const profile = resolveRenderProfile(prefs);
  const failure = gameoverProgress(state);
  const ctx = prepareCanvas(canvas, world, profile);
  ctx.filter = failure ? `grayscale(${failure}) brightness(${1 - failure * 0.34})` : "none";
  drawStaticScene(ctx, world, profile, prefs.showBackground !== false);
  if (!state) return drawCenter(ctx, canvas, "连接中");
  ctx.save();
  if (prefs.screenShake !== false) applyScreenShake(ctx, state, failure);
  drawTarget(ctx, state.target, profile);
  drawChallenge(ctx, state, profile);
  if (profile.hints) drawDangerHints(ctx, state.obstacles, state.world);
  drawObstacles(ctx, state.obstacles, profile);
  drawBand(ctx, state.players, profile);
  drawPlayers(ctx, state.players, playerId, profile);
  drawTension(ctx, state);
  ctx.restore();
  ctx.filter = "none";
  drawOverlay(ctx, canvas, state, failure);
}

function drawChallenge(ctx, state, profile) {
  if (!state.challenge) return;
  const urgency = 1 - state.challenge.remaining / state.challenge.duration;
  const pulse = 0.28 + Math.sin(performance.now() / (profile.full ? 32 : 58)) * 0.12 + urgency * 0.26;
  state.challenge.assignments.forEach(item => drawZone(ctx, item.zone, state.world, item.color, pulse));
  ctx.strokeStyle = urgency > 0.55 ? "rgba(255,116,95,0.86)" : "rgba(244,239,229,0.62)";
  ctx.lineWidth = urgency > 0.55 ? 10 : 7;
  ctx.setLineDash([18, 10]);
  drawSplitLine(ctx, state.challenge.split, state.world);
  ctx.setLineDash([]);
}

function drawTarget(ctx, target, profile) {
  if (!target) return;
  const progress = target.remaining / target.duration;
  const urgency = 1 - progress;
  const pulse = 0.98 + Math.sin(performance.now() / (profile.full ? 42 : 70)) * 0.045 + urgency * 0.035;
  const color = target.color || "#36c6a7";
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.shadowColor = hexToRgba(color, 0.42);
  ctx.shadowBlur = profile.full ? 22 : 0;
  ctx.fillStyle = hexToRgba(color, 0.12 + progress * 0.16);
  ctx.beginPath();
  ctx.arc(0, 0, target.r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = progress < 0.28 ? "rgba(255,116,95,0.92)" : "rgba(244,239,229,0.72)";
  ctx.lineWidth = progress < 0.28 ? 8 : 6;
  ctx.setLineDash([18, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, target.r * (1.04 + urgency * 0.03), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = hexToRgba(color, 0.9);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, target.r * 0.78, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  ctx.restore();
}

function drawZone(ctx, zone, world, color, alpha) {
  ctx.fillStyle = hexToRgba(color, alpha);
  const points = zonePoints(zone, world);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function drawObstacles(ctx, obstacles, profile) {
  obstacles.forEach(obstacle => {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(obstacle.spin);
    ctx.shadowColor = "rgba(230,223,209,0.55)";
    ctx.shadowBlur = profile.shadows ? 16 : 0;
    drawObstacleCross(ctx, obstacle.r);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(240,90,82,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, obstacle.r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawObstacleCross(ctx, radius) {
  const arm = radius * 1.08;
  const thick = Math.max(7, radius * 0.36);
  ctx.fillStyle = COLORS.danger;
  [Math.PI / 4, -Math.PI / 4].forEach(angle => {
    ctx.save();
    ctx.rotate(angle);
    roundRect(ctx, -arm, -thick / 2, arm * 2, thick, thick / 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawBand(ctx, players, profile) {
  if (players.length < 2) return;
  const edges = connectionEdges(players);
  if (players.length > 2) drawTeamFill(ctx, players);
  edges.forEach(([a, b]) => {
    const strain = clamp((Math.hypot(a.x - b.x, a.y - b.y) - 190) / 200, 0, 1);
    const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    gradient.addColorStop(0, a.color || COLORS.band);
    gradient.addColorStop(0.5, strain > 0.72 ? "#ff7a57" : COLORS.band);
    gradient.addColorStop(1, b.color || COLORS.band);
    ctx.shadowColor = strain > 0.72 ? "rgba(255,100,80,0.48)" : "rgba(240,199,102,0.28)";
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.shadowBlur = profile.bandGlow ? 10 : 0;
    ctx.setLineDash(strain > 0.72 ? [14, 10] : []);
    drawElasticCurve(ctx, a, b, strain);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  });
}

function drawTeamFill(ctx, players) {
  ctx.fillStyle = "rgba(240,199,102,0.08)";
  ctx.beginPath();
  ctx.moveTo(players[0].x, players[0].y);
  players.slice(1).forEach(player => ctx.lineTo(player.x, player.y));
  ctx.closePath();
  ctx.fill();
  const center = teamCenter(players);
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayers(ctx, players, playerId, profile) {
  players.forEach(player => {
    const speed = Math.hypot(player.vx || 0, player.vy || 0);
    if (profile.trails) drawTrail(ctx, player, speed);
    ctx.shadowColor = hexToRgba(player.color, 0.42);
    ctx.shadowBlur = profile.shadows ? 22 : 0;
    ctx.fillStyle = player.color || "#888";
    ctx.strokeStyle = player.id === playerId ? "#fff" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = player.id === playerId ? 5 : 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawFacingDot(ctx, player);
    if (profile.names) drawName(ctx, player);
  });
}

function drawName(ctx, player) {
  ctx.fillStyle = COLORS.text;
  ctx.font = "600 18px Bahnschrift, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.name, player.x, player.y - 30);
}

function drawCenter(ctx, canvas, text) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLORS.text;
  ctx.font = "700 34px Bahnschrift, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.restore();
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
  gradient.addColorStop(0, hexToRgba(player.color, 0.44));
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
  ctx.arc(player.x + Math.cos(angle) * 7, player.y + Math.sin(angle) * 7, 3, 0, Math.PI * 2);
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

function drawOverlay(ctx, canvas, state, failure) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (failure) drawFailureFade(ctx, canvas, failure);
  if (state.challenge) drawChallengeTimer(ctx, canvas, state.challenge);
  if (state.target) drawChallengeTimer(ctx, canvas, state.target);
  if (state.status !== "running" && state.status !== "gameover") drawCenter(ctx, canvas, state.message);
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

function connectionEdges(players) {
  if (players.length === 2) return [[players[0], players[1]]];
  return players.map((player, index) => [player, players[(index + 1) % players.length]]);
}

function teamCenter(players) {
  return {
    x: players.reduce((sum, player) => sum + player.x, 0) / players.length,
    y: players.reduce((sum, player) => sum + player.y, 0) / players.length
  };
}

function applyScreenShake(ctx, state, failure) {
  if (state.status !== "gameover") return;
  const drift = Math.sin(performance.now() / 320) * 3 * (1 - failure * 0.5);
  ctx.translate(drift, -drift * 0.35);
}

function drawFailureFade(ctx, canvas, progress) {
  const alpha = 0.18 + progress * 0.56;
  const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 40, canvas.width / 2, canvas.height / 2, canvas.width * 0.62);
  gradient.addColorStop(0, `rgba(16,18,24,${alpha * 0.44})`);
  gradient.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function gameoverProgress(state) {
  if (state?.status !== "gameover") {
    gameoverKey = "";
    return 0;
  }
  const key = `${state.result?.reason || state.message}:${state.result?.elapsed || state.elapsed}`;
  if (gameoverKey !== key) {
    gameoverKey = key;
    gameoverAt = performance.now();
  }
  return clamp((performance.now() - gameoverAt) / 900, 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
