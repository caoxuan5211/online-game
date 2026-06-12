const PLAYER_RADIUS = 18;
const ACCEL = 3400;
const MAX_SPEED = 560;
const LOOKAHEAD = 0.036;

export function predictLocalState(state, playerId, input) {
  if (!state || state.status !== "running" || !playerId) return state;
  const players = state.players.map(player => (
    player.id === playerId ? predictPlayer(player, input, state.world) : player
  ));
  return { ...state, players, tether: predictTether(players) };
}

function predictPlayer(player, input, world) {
  const next = { ...player };
  next.vx += input.x * ACCEL * LOOKAHEAD;
  next.vy += input.y * ACCEL * LOOKAHEAD;
  const damping = input.x || input.y ? Math.pow(0.026, LOOKAHEAD) : Math.pow(0.00002, LOOKAHEAD);
  next.vx *= damping;
  next.vy *= damping;
  limitSpeed(next, MAX_SPEED);
  next.x = clamp(next.x + next.vx * LOOKAHEAD, PLAYER_RADIUS, world.width - PLAYER_RADIUS);
  next.y = clamp(next.y + next.vy * LOOKAHEAD, PLAYER_RADIUS, world.height - PLAYER_RADIUS);
  return next;
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
