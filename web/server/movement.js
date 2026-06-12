import { PLAYER_RADIUS, WORLD, clamp, limitSpeed } from "./physics.js";

const MAX_SPEED = 520;
const RESPONSE = 18;
const STOP_RESPONSE = 22;

export function updatePlayers(players, dt) {
  players.forEach(player => {
    const input = player.input;
    const moving = input.x || input.y;
    const response = moving ? RESPONSE : STOP_RESPONSE;
    const mix = 1 - Math.exp(-response * dt);
    const targetX = input.x * MAX_SPEED;
    const targetY = input.y * MAX_SPEED;
    player.vx += (targetX - player.vx) * mix;
    player.vy += (targetY - player.vy) * mix;
    limitSpeed(player, MAX_SPEED);
    player.x = clamp(player.x + player.vx * dt, PLAYER_RADIUS, WORLD.width - PLAYER_RADIUS);
    player.y = clamp(player.y + player.vy * dt, PLAYER_RADIUS, WORLD.height - PLAYER_RADIUS);
  });
}
