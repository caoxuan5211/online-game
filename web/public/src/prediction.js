const PLAYER_RADIUS = 18;
const MAX_SPEED = 520;
const RESPONSE = 18;
const STOP_RESPONSE = 22;
const SNAP_DISTANCE = 96;
const CORRECTION = 0.14;

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
  syncLocal(source, state.world, state.tick);
  stepLocal(input, state.world);
  const players = state.players.map(player => (
    player.id === playerId ? { ...player, ...local } : player
  ));
  return { ...state, players, tether: predictTether(players) };
}

function syncLocal(source, world, tick) {
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
  local.x = clamp(local.x + (source.x - local.x) * CORRECTION, PLAYER_RADIUS, world.width - PLAYER_RADIUS);
  local.y = clamp(local.y + (source.y - local.y) * CORRECTION, PLAYER_RADIUS, world.height - PLAYER_RADIUS);
  local.vx += ((source.vx || 0) - local.vx) * 0.08;
  local.vy += ((source.vy || 0) - local.vy) * 0.08;
}

function stepLocal(input, world) {
  const now = performance.now();
  const dt = clamp((now - lastAt) / 1000, 1 / 240, 1 / 30);
  lastAt = now;
  const moving = input.x || input.y;
  const mix = 1 - Math.exp(-(moving ? RESPONSE : STOP_RESPONSE) * dt);
  local.vx += (input.x * MAX_SPEED - local.vx) * mix;
  local.vy += (input.y * MAX_SPEED - local.vy) * mix;
  limitSpeed(local, MAX_SPEED);
  local.x = clamp(local.x + local.vx * dt, PLAYER_RADIUS, world.width - PLAYER_RADIUS);
  local.y = clamp(local.y + local.vy * dt, PLAYER_RADIUS, world.height - PLAYER_RADIUS);
}

function predictTether(players) {
  if (players.length < 2) return { distance: 0, strain: 0 };
  const distance = Math.hypot(players[0].x - players[1].x, players[0].y - players[1].y);
  return { distance, strain: clamp((distance - 190) / 200, 0, 1) };
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
