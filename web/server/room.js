import { createChallenge, playerInZone } from "./challenge.js";
import {
  DIFFICULTIES,
  FAIL_DISTANCE,
  MAX_OBSTACLES,
  PLAYER_RADIUS,
  REST_LENGTH,
  WORLD,
  clamp,
  collide,
  createObstacle,
  createPlayer,
  inBounds,
  limitSpeed,
  normalizeInput,
  pickColor,
  publicPlayer,
  randomBetween,
  resetPlayer,
  tetherDistance
} from "./physics.js";
export function createGameRoom(id) {
  return new GameRoom(id);
}
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
    this.nextChallenge = randomBetween(5, 10);
    this.message = "等待两名玩家准备";
  }

  addPlayer(id, options) {
    const active = this.activePlayers();
    const color = pickColor(options.color, active);
    const player = createPlayer(id, options.name, color, active.length);
    this.players.set(id, player);
    this.status = this.status === "gameover" ? "waiting" : this.status;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.activePlayers().length < 2 && this.status === "running") {
      this.endGame("玩家断开连接");
    }
  }

  setReady(id, ready) {
    const player = this.players.get(id);
    if (!player) return;
    player.ready = ready;
    if (this.canStart()) this.start();
  }

  setInput(id, input) {
    const player = this.players.get(id);
    if (!player) return;
    player.input = normalizeInput(input);
  }

  setProfile(id, options) {
    const player = this.players.get(id);
    if (!player || this.status === "running") return;
    player.name = options.name;
    player.color = pickColor(options.color, this.activePlayers().filter(p => p.id !== id));
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
    this.challengeCount = 0;
    this.nextChallenge = randomBetween(4, 8);
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
      settings: {
        difficulty: this.settings.difficulty,
        difficultyLabel: DIFFICULTIES[this.settings.difficulty].label
      },
      nextChallengeIn: Math.max(0, this.nextChallenge),
      challenge: this.challenge,
      tether: this.tetherState(),
      players: [...this.players.values()].map(publicPlayer),
      obstacles: this.obstacles
    };
  }

  canStart() {
    const active = this.activePlayers();
    return active.length === 2 && active.every(p => p.ready) && this.status !== "running";
  }

  start() {
    this.status = "running";
    this.elapsed = 0;
    this.tick = 0;
    this.obstacles = [];
    this.spawnTimer = DIFFICULTIES[this.settings.difficulty].warmup;
    this.challenge = null;
    this.challengeCount = 0;
    this.nextChallenge = randomBetween(4, 8);
    this.message = "躲避障碍，等待颜色区域";
    this.activePlayers().forEach((p, index) => resetPlayer(p, index));
  }

  activePlayers() {
    return [...this.players.values()].slice(0, 2);
  }

  endGame(reason) {
    this.status = "gameover";
    this.message = reason;
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
    return {
      id: this.id,
      status: this.status,
      players: active.length,
      capacity: 2,
      difficulty: DIFFICULTIES[this.settings.difficulty].label
    };
  }
}

export function updateRoom(room, dt) {
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

function updatePlayers(players, dt) {
  players.forEach(player => {
    const accel = 2600;
    player.vx += player.input.x * accel * dt;
    player.vy += player.input.y * accel * dt;
    const damping = player.input.x || player.input.y ? Math.pow(0.035, dt) : Math.pow(0.0008, dt);
    player.vx *= damping;
    player.vy *= damping;
    limitSpeed(player, 520);
    player.x = clamp(player.x + player.vx * dt, PLAYER_RADIUS, WORLD.width - PLAYER_RADIUS);
    player.y = clamp(player.y + player.vy * dt, PLAYER_RADIUS, WORLD.height - PLAYER_RADIUS);
  });
}

function applyElasticBand(players, dt) {
  const [a, b] = players;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const stretch = dist - REST_LENGTH;
  if (stretch <= -60) return;
  const force = stretch * 0.66 * dt;
  const nx = dx / dist;
  const ny = dy / dist;
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
  room.nextChallenge = randomBetween(6, 12);
}

function checkFailures(room, players) {
  if (tetherDistance(players) > FAIL_DISTANCE) room.endGame("弹力带被拉断");
  const hit = players.find(player => room.obstacles.some(o => collide(player, o)));
  if (hit) room.endGame(`${hit.name} 撞上了障碍物`);
}
