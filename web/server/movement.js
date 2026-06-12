import { PLAYER_RADIUS, WORLD, clamp, limitSpeed } from "./physics.js";

const ACCEL = 4200;
const MAX_SPEED = 575;
const ACTIVE_DRAG = 0.018;
const IDLE_DRAG = 0.00002;
const SIDE_GRIP = 0.018;
const REVERSE_GRIP = 0.0008;

export function updatePlayers(players, dt) {
  players.forEach(player => {
    const input = player.input;
    const moving = input.x || input.y;
    if (moving) applyTurnGrip(player, input, dt);
    player.vx += input.x * ACCEL * dt;
    player.vy += input.y * ACCEL * dt;
    const damping = moving ? Math.pow(ACTIVE_DRAG, dt) : Math.pow(IDLE_DRAG, dt);
    player.vx *= damping;
    player.vy *= damping;
    limitSpeed(player, MAX_SPEED);
    player.x = clamp(player.x + player.vx * dt, PLAYER_RADIUS, WORLD.width - PLAYER_RADIUS);
    player.y = clamp(player.y + player.vy * dt, PLAYER_RADIUS, WORLD.height - PLAYER_RADIUS);
  });
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
