const PLAYER_RADIUS = 15;
const MAX_SPEED = 520;
const RESPONSE = 18;
const STOP_RESPONSE = 22;
const SNAP_DISTANCE = 180;
const CORRECTION_DEADZONE = 72;
const MOVE_CORRECTION = 0.018;
const IDLE_CORRECTION = 0.055;
const VELOCITY_CORRECTION = 0.025;
const REST_LENGTH = 190;
const TETHER_PULL = 0.42;
const TETHER_DAMPING = 0.58;

let local = null;
let lastAt = 0;

export function predictLocalState(state, playerId, input) {
  if (!state || state.status !== "running" || !playerId) {
    local = null;
    lastAt = 0;
    return state;
  }
  const source = state.players.find(player => player.id === playerId);
  if (!source) return state;
  const moving = Boolean(input.x || input.y);
  syncLocal(source, state.world, state.tick, moving);
  const dt = stepLocal(input, state.world, moving);
  neighbors(state.players, playerId).forEach(teammate => applyPredictedTether(local, teammate, dt));
  const players = state.players.map(player => (
    player.id === playerId ? { ...player, ...local } : player
  ));
  return { ...state, players, tether: predictTether(players) };
}

function syncLocal(source, world, tick, moving) {
  if (!local || local.id !== source.id) {
    local = { id: source.id, tick, x: source.x, y: source.y, vx: source.vx || 0, vy: source.vy || 0 };
    lastAt = performance.now();
    return;
  }
  if (local.tick === tick) return;
  local.tick = tick;
  const distance = Math.hypot(source.x - local.x, source.y - local.y);
  if (distance > SNAP_DISTANCE) {
    local.x = source.x;
    local.y = source.y;
    local.vx = source.vx || 0;
    local.vy = source.vy || 0;
    return;
  }
  if (distance > CORRECTION_DEADZONE) {
    const correction = moving ? MOVE_CORRECTION : IDLE_CORRECTION;
    const excess = (distance - CORRECTION_DEADZONE) / distance;
    local.x = clamp(local.x + (source.x - local.x) * correction * excess, PLAYER_RADIUS, world.width - PLAYER_RADIUS);
    local.y = clamp(local.y + (source.y - local.y) * correction * excess, PLAYER_RADIUS, world.height - PLAYER_RADIUS);
  }
  if (!moving) {
    local.vx += ((source.vx || 0) - local.vx) * VELOCITY_CORRECTION;
    local.vy += ((source.vy || 0) - local.vy) * VELOCITY_CORRECTION;
  }
}

function stepLocal(input, world, moving) {
  const now = performance.now();
  const dt = clamp((now - lastAt) / 1000, 1 / 240, 1 / 30);
  lastAt = now;
  const mix = 1 - Math.exp(-(moving ? RESPONSE : STOP_RESPONSE) * dt);
  local.vx += (input.x * MAX_SPEED - local.vx) * mix;
  local.vy += (input.y * MAX_SPEED - local.vy) * mix;
  limitSpeed(local, MAX_SPEED);
  local.x = clamp(local.x + local.vx * dt, PLAYER_RADIUS, world.width - PLAYER_RADIUS);
  local.y = clamp(local.y + local.vy * dt, PLAYER_RADIUS, world.height - PLAYER_RADIUS);
  return dt;
}

function applyPredictedTether(player, teammate, dt) {
  const dx = teammate.x - player.x;
  const dy = teammate.y - player.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const stretch = dist - REST_LENGTH;
  if (stretch <= 0) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const relative = ((teammate.vx || 0) - player.vx) * nx + ((teammate.vy || 0) - player.vy) * ny;
  const force = (stretch * TETHER_PULL + Math.max(0, relative) * TETHER_DAMPING) * dt;
  player.vx += force * nx;
  player.vy += force * ny;
  limitSpeed(player, MAX_SPEED);
}

function predictTether(players) {
  if (players.length < 2) return { distance: 0, strain: 0 };
  const distance = Math.max(...connectionEdges(players).map(([a, b]) => Math.hypot(a.x - b.x, a.y - b.y)));
  return { distance, strain: clamp((distance - 190) / 200, 0, 1) };
}

function neighbors(players, playerId) {
  return connectionEdges(players)
    .filter(([a, b]) => a.id === playerId || b.id === playerId)
    .map(([a, b]) => (a.id === playerId ? b : a));
}

function connectionEdges(players) {
  if (players.length <= 1) return [];
  if (players.length === 2) return [[players[0], players[1]]];
  return players.map((player, index) => [player, players[(index + 1) % players.length]]);
}

function limitSpeed(player, max) {
  const speed = Math.hypot(player.vx, player.vy);
  if (speed <= max) return;
  player.vx = (player.vx / speed) * max;
  player.vy = (player.vy / speed) * max;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
