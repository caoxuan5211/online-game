export const WORLD = { width: 1280, height: 720 };
export const PLAYER_RADIUS = 15;
export const REST_LENGTH = 190;
export const FAIL_DISTANCE = 390;
export const DEFAULT_DIFFICULTY = 5;
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 10;

const DEFAULT_COLORS = ["#4f68ff", "#f05a52", "#36c6a7", "#f0c766", "#c56bff", "#ff8a4f"];

export function createPlayer(id, name, color, index, total = 2) {
  const player = { id, name, color, ready: false, health: 1, maxHealth: 1, input: { x: 0, y: 0 } };
  return resetPlayer(player, index, total);
}

export function resetPlayer(player, index, total = 2) {
  const positions = formationPositions(total);
  const [x, y] = positions[index] || [0.5, 0.52];
  player.x = WORLD.width * x;
  player.y = WORLD.height * y;
  player.vx = 0;
  player.vy = 0;
  player.ready = false;
  return player;
}

function formationPositions(total) {
  if (total === 1) return [[0.5, 0.52]];
  if (total === 2) return [[0.42, 0.52], [0.58, 0.52]];
  if (total === 3) return [[0.5, 0.38], [0.59, 0.6], [0.41, 0.6]];
  return [[0.43, 0.39], [0.57, 0.39], [0.57, 0.64], [0.43, 0.64]];
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

export function normalizeDifficulty(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_DIFFICULTY;
  return Math.round(clamp(number, DIFFICULTY_MIN, DIFFICULTY_MAX));
}

export function resolveDifficulty(value) {
  const level = normalizeDifficulty(value);
  const t = (level - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN);
  return {
    level,
    label: `难度 ${level}`,
    speed: lerp(0.78, 1.42, t),
    spawnMin: lerp(0.9, 0.3, t),
    spawnMax: lerp(1.34, 0.68, t),
    warmup: lerp(3.2, 1.1, t),
    maxObstacles: Math.round(18 + 20 * t),
    challengeDuration: lerp(4.4, 2.05, t),
    firstChallengeMin: lerp(4.8, 2, t),
    firstChallengeMax: lerp(7.2, 3.4, t),
    repeatChallengeMin: lerp(5.6, 2.2, t),
    repeatChallengeMax: lerp(8.2, 4.2, t)
  };
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
  return Math.hypot(player.x - obstacle.x, player.y - obstacle.y) < PLAYER_RADIUS * 0.92 + obstacle.r * 0.66;
}

export function tetherDistance(players) {
  return Math.max(0, ...connectionEdges(players).map(([a, b]) => Math.hypot(a.x - b.x, a.y - b.y)));
}

export function connectionEdges(players) {
  if (players.length <= 1) return [];
  if (players.length === 2) return [[players[0], players[1]]];
  return players.map((player, index) => [player, players[(index + 1) % players.length]]);
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

function lerp(a, b, mix) {
  return a + (b - a) * mix;
}

function obstacleStart(edge) {
  if (edge === 0) return { x: randomBetween(0, WORLD.width), y: -40 };
  if (edge === 1) return { x: WORLD.width + 40, y: randomBetween(0, WORLD.height) };
  if (edge === 2) return { x: randomBetween(0, WORLD.width), y: WORLD.height + 40 };
  return { x: -40, y: randomBetween(0, WORLD.height) };
}
