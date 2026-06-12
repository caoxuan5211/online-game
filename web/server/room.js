import { createChallenge, playerInZone } from "./challenge.js";
import { updatePlayers } from "./movement.js";
import {
  DIFFICULTIES, FAIL_DISTANCE, MAX_OBSTACLES, REST_LENGTH, WORLD,
  clamp, collide, createObstacle, createPlayer, inBounds, normalizeInput,
  pickColor, publicPlayer, randomBetween, resetPlayer, tetherDistance
} from "./physics.js";
export function createGameRoom(id) {
  return new GameRoom(id);
}
const FIRST_CHALLENGE_DELAY = [2.6, 4.6];
const REPEAT_CHALLENGE_DELAY = [3.2, 6.2];
const TETHER_PULL = 0.42;
const TETHER_DAMPING = 0.58;

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = new Map();
    this.obstacles = [];
    this.status = "waiting";
    this.elapsed = 0;
    this.tick = 0;
    this.spawnTimer = 1;
    this.settings = { difficulty: "normal" };
    this.challenge = null;
    this.challengeCount = 0;
    this.countdown = 0;
    this.lastResult = null;
    this.nextChallenge = randomBetween(...FIRST_CHALLENGE_DELAY);
    this.message = "等待两名玩家准备";
  }

  addPlayer(id, options) {
    const active = this.activePlayers();
    const color = pickColor(options.color, active);
    const name = defaultName(options.name, active.length);
    const player = createPlayer(id, name, color, active.length);
    this.players.set(id, player);
    this.status = this.status === "gameover" ? "waiting" : this.status;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.status === "countdown") this.cancelCountdown();
    if (this.activePlayers().length < 2 && this.status === "running") {
      this.endGame("玩家断开连接");
    }
  }

  setReady(id, ready) {
    const player = this.players.get(id);
    if (!player || this.status === "running" || this.status === "gameover") return { ok: false };
    if (ready && !this.hasUniqueColor(id)) return { ok: false, message: "两名玩家不能使用相同颜色" };
    if (this.status === "countdown" && !ready) this.cancelCountdown();
    player.ready = ready;
    if (this.canStart()) this.beginCountdown();
    return { ok: true };
  }

  setInput(id, input) {
    const player = this.players.get(id);
    if (!player) return;
    player.input = normalizeInput(input);
  }

  setProfile(id, options) {
    const player = this.players.get(id);
    if (!player || this.status === "running") return;
    const sameColor = this.activePlayers().some(p => p.id !== id && p.color === options.color);
    if (sameColor) return { ok: false, message: "这个颜色已经被队友选择" };
    player.name = defaultName(options.name, this.activePlayers().findIndex(p => p.id === id));
    player.color = pickColor(options.color, this.activePlayers().filter(p => p.id !== id));
    if (this.status === "countdown") this.cancelCountdown();
    return { ok: true };
  }

  setSettings(settings = {}) {
    if (!DIFFICULTIES[settings.difficulty]) return;
    if (this.status === "running") return;
    this.settings.difficulty = settings.difficulty;
  }

  restart() {
    const current = [...this.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color }));
    this.players.clear();
    this.obstacles = [];
    this.status = "waiting";
    this.challenge = null;
    this.elapsed = 0;
    this.tick = 0;
    this.countdown = 0;
    this.challengeCount = 0;
    this.lastResult = null;
    this.nextChallenge = randomBetween(...FIRST_CHALLENGE_DELAY);
    this.message = "等待两名玩家准备";
    current.forEach((p, index) => this.players.set(p.id, createPlayer(p.id, p.name, p.color, index)));
  }

  publicState() {
    return {
      id: this.id,
      world: WORLD,
      status: this.status,
      tick: this.tick,
      elapsed: Math.round(this.elapsed),
      message: this.message,
      settings: { difficulty: this.settings.difficulty, difficultyLabel: DIFFICULTIES[this.settings.difficulty].label },
      nextChallengeIn: Math.max(0, this.nextChallenge),
      countdown: Math.max(0, this.countdown),
      result: this.lastResult,
      challenge: this.challenge,
      tether: this.tetherState(),
      players: this.publicPlayers(),
      obstacles: this.obstacles
    };
  }

  canStart() {
    const active = this.activePlayers();
    return active.length === 2 && uniqueColors(active) && active.every(p => p.ready) && this.status === "waiting";
  }

  canContinueCountdown() {
    const active = this.activePlayers();
    return active.length === 2 && uniqueColors(active) && active.every(p => p.ready);
  }

  beginCountdown() {
    this.status = "countdown";
    this.countdown = 3.2;
    this.message = "准备开始";
  }

  cancelCountdown() {
    this.status = "waiting";
    this.countdown = 0;
    this.message = "等待两名玩家准备";
  }

  start() {
    this.status = "running";
    this.elapsed = 0;
    this.tick = 0;
    this.obstacles = [];
    this.spawnTimer = DIFFICULTIES[this.settings.difficulty].warmup;
    this.challenge = null;
    this.challengeCount = 0;
    this.lastResult = null;
    this.nextChallenge = randomBetween(...FIRST_CHALLENGE_DELAY);
    this.message = "躲避障碍，等待颜色区域";
    this.activePlayers().forEach((p, index) => resetPlayer(p, index));
  }

  activePlayers() { return [...this.players.values()].slice(0, 2); }

  publicPlayers() {
    const hostId = this.activePlayers()[0]?.id;
    return [...this.players.values()].map((player, index) => publicPlayer(player, { index, host: player.id === hostId }));
  }

  canJoin(id) { return this.players.has(id) || (this.status === "waiting" && this.activePlayers().length < 2); }

  endGame(reason) {
    this.status = "gameover";
    this.message = reason;
    this.lastResult = {
      reason,
      elapsed: Math.round(this.elapsed),
      difficulty: DIFFICULTIES[this.settings.difficulty].label
    };
  }

  tetherState() {
    const players = this.activePlayers();
    if (players.length < 2) return { distance: 0, strain: 0 };
    const distance = tetherDistance(players);
    return {
      distance,
      strain: clamp((distance - REST_LENGTH) / (FAIL_DISTANCE - REST_LENGTH), 0, 1)
    };
  }

  publicSummary() {
    const active = this.activePlayers();
    return { id: this.id, status: this.status, players: active.length, capacity: 2, difficulty: DIFFICULTIES[this.settings.difficulty].label };
  }

  hasUniqueColor(id) {
    const player = this.players.get(id);
    return Boolean(player) && !this.activePlayers().some(p => p.id !== id && p.color === player.color);
  }
}

export function updateRoom(room, dt) {
  if (updateCountdown(room, dt)) return;
  if (room.status !== "running") return;
  const players = room.activePlayers();
  if (players.length < 2) return;
  room.tick += 1;
  room.elapsed += dt;
  updatePlayers(players, dt);
  applyElasticBand(players, dt);
  updateObstacles(room, dt);
  updateChallenge(room, dt);
  checkFailures(room, players);
}

function updateCountdown(room, dt) {
  if (room.status !== "countdown") return false;
  if (!room.canContinueCountdown()) {
    room.cancelCountdown();
    return true;
  }
  room.countdown = Math.max(0, room.countdown - dt);
  if (room.countdown <= 0) room.start();
  return true;
}

function applyElasticBand(players, dt) {
  const [a, b] = players;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const stretch = dist - REST_LENGTH;
  if (stretch <= 0) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  const force = (stretch * TETHER_PULL + Math.max(0, relative) * TETHER_DAMPING) * dt;
  a.vx += force * nx;
  a.vy += force * ny;
  b.vx -= force * nx;
  b.vy -= force * ny;
}

function updateObstacles(room, dt) {
  const difficulty = DIFFICULTIES[room.settings.difficulty];
  room.spawnTimer -= dt;
  if (room.spawnTimer <= 0) {
    room.obstacles.push(createObstacle(room.elapsed, difficulty));
    room.spawnTimer = randomBetween(difficulty.spawnMin, difficulty.spawnMax);
  }
  room.obstacles.forEach(o => {
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.spin += o.spinSpeed * dt;
  });
  room.obstacles = room.obstacles.filter(o => inBounds(o)).slice(-MAX_OBSTACLES);
}

function updateChallenge(room, dt) {
  if (room.challenge) {
    room.challenge.remaining = Math.max(0, room.challenge.remaining - dt);
    if (room.challenge.remaining <= 0) finishChallenge(room);
    return;
  }
  room.nextChallenge -= dt;
  if (room.nextChallenge <= 0) {
    room.challengeCount += 1;
    room.challenge = createChallenge(room.activePlayers(), room.challengeCount);
  }
}

function finishChallenge(room) {
  const failed = room.activePlayers().find(p => {
    const assignment = room.challenge.assignments.find(item => item.playerId === p.id);
    return assignment && !playerInZone(p, assignment.zone);
  });
  if (failed) room.endGame(`${failed.name} 没有及时进入颜色区域`);
  room.challenge = null;
  room.nextChallenge = randomBetween(...REPEAT_CHALLENGE_DELAY);
}

function checkFailures(room, players) {
  if (tetherDistance(players) > FAIL_DISTANCE) room.endGame("弹力带被拉断");
  const hit = players.find(player => room.obstacles.some(o => collide(player, o)));
  if (hit) room.endGame(`${hit.name} 撞上了障碍物`);
}

function uniqueColors(players) { return new Set(players.map(p => p.color)).size === players.length; }

function defaultName(name, index) {
  const value = String(name || "").trim();
  return !value || value === "Player" ? `Player ${index + 1}` : value;
}
