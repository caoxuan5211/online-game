const PLAYER_RADIUS = 18;
const ACCEL = 4200;
const MAX_SPEED = 575;
const ACTIVE_DRAG = 0.018;
const IDLE_DRAG = 0.00002;
const SIDE_GRIP = 0.018;
const REVERSE_GRIP = 0.0008;
const LOOKAHEAD = 0.03;

export function predictLocalState(state, playerId, input) {
  if (!state || state.status !== "running" || !playerId) return state;
  const players = state.players.map(player => (
    player.id === playerId ? predictPlayer(player, input, state.world) : player
  ));
  return { ...state, players, tether: predictTether(players) };
}

function predictPlayer(player, input, world) {
  const next = { ...player };
  const moving = input.x || input.y;
  if (moving) applyTurnGrip(next, input, LOOKAHEAD);
  next.vx += input.x * ACCEL * LOOKAHEAD;
  next.vy += input.y * ACCEL * LOOKAHEAD;
  const damping = moving ? Math.pow(ACTIVE_DRAG, LOOKAHEAD) : Math.pow(IDLE_DRAG, LOOKAHEAD);
  next.vx *= damping;
  next.vy *= damping;
  limitSpeed(next, MAX_SPEED);
  next.x = clamp(next.x + next.vx * LOOKAHEAD, PLAYER_RADIUS, world.width - PLAYER_RADIUS);
  next.y = clamp(next.y + next.vy * LOOKAHEAD, PLAYER_RADIUS, world.height - PLAYER_RADIUS);
  return next;
}

function applyTurnGrip(player, input, dt) {
  const sideX = -input.y;
  const sideY = input.x;
  const sideSpeed = player.vx * sideX + player.vy * sideY;
  const sideGrip = 1 - Math.pow(SIDE_GRIP, dt);
  player.vx -= sideX * sideSpeed * sideGrip;
  player.vy -= sideY * sideSpeed * sideGrip;
  const forward = player.vx * input.x + player.vy * input.y;
  if (forward >= 0) return;
  const reverseGrip = 1 - Math.pow(REVERSE_GRIP, dt);
  player.vx -= input.x * forward * reverseGrip;
  player.vy -= input.y * forward * reverseGrip;
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
