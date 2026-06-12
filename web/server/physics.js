export const WORLD = { width: 1280, height: 720 };
export const PLAYER_RADIUS = 18;
export const REST_LENGTH = 190;
export const FAIL_DISTANCE = 390;
export const MAX_OBSTACLES = 42;
export const DIFFICULTIES = {
  easy: { label: "轻松", speed: 0.82, spawnMin: 0.78, spawnMax: 1.22, warmup: 2.8 },
  normal: { label: "标准", speed: 1, spawnMin: 0.52, spawnMax: 0.94, warmup: 2.1 },
  hard: { label: "高压", speed: 1.18, spawnMin: 0.34, spawnMax: 0.7, warmup: 1.55 }
};

const DEFAULT_COLORS = ["#4f68ff", "#f05a52", "#36c6a7", "#f0c766", "#c56bff", "#ff8a4f"];

export function createPlayer(id, name, color, index) {
  const player = { id, name, color, ready: false, health: 1, maxHealth: 1, input: { x: 0, y: 0 } };
  return resetPlayer(player, index);
}

export function resetPlayer(player, index) {
  player.x = index === 0 ? WORLD.width * 0.42 : WORLD.width * 0.58;
  player.y = WORLD.height * 0.52;
  player.vx = 0;
  player.vy = 0;
  player.ready = false;
  return player;
}

export function pickColor(requested, players) {
  const used = new Set(players.map(p => p.color));
  if (!used.has(requested)) return requested;
  return DEFAULT_COLORS.find(color => !used.has(color)) || requested;
}

export function normalizeInput(input) {
  const x = clamp(Number(input.x) || 0, -1, 1);
  const y = clamp(Number(input.y) || 0, -1, 1);
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

export function createObstacle(time, difficulty) {
  const edge = Math.floor(Math.random() * 4);
  const speed = (randomBetween(205, 335) + Math.min(time * 3.6, 150)) * difficulty.speed;
  const target = { x: randomBetween(280, 1000), y: randomBetween(160, 560) };
  const start = obstacleStart(edge);
  const angle = Math.atan2(target.y - start.y, target.x - start.x);
  return {
    id: `${Date.now()}-${Math.random()}`,
    x: start.x,
    y: start.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: randomBetween(16, 26),
    spin: 0,
    spinSpeed: randomBetween(-5, 5),
    edge
  };
}

export function publicPlayer(player, meta = {}) {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    index: meta.index || 0,
    host: Boolean(meta.host),
    ready: player.ready,
    x: player.x,
    y: player.y,
    vx: player.vx,
    vy: player.vy,
    health: player.health,
    maxHealth: player.maxHealth
  };
}

export function collide(player, obstacle) {
  return Math.hypot(player.x - obstacle.x, player.y - obstacle.y) < PLAYER_RADIUS + obstacle.r * 0.72;
}

export function tetherDistance(players) {
  return Math.hypot(players[0].x - players[1].x, players[0].y - players[1].y);
}

export function inBounds(o) {
  return o.x > -120 && o.x < WORLD.width + 120 && o.y > -120 && o.y < WORLD.height + 120;
}

export function limitSpeed(player, max) {
  const speed = Math.hypot(player.vx, player.vy);
  if (speed <= max) return;
  player.vx = (player.vx / speed) * max;
  player.vy = (player.vy / speed) * max;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function obstacleStart(edge) {
  if (edge === 0) return { x: randomBetween(0, WORLD.width), y: -40 };
  if (edge === 1) return { x: WORLD.width + 40, y: randomBetween(0, WORLD.height) };
  if (edge === 2) return { x: randomBetween(0, WORLD.width), y: WORLD.height + 40 };
  return { x: -40, y: randomBetween(0, WORLD.height) };
}
