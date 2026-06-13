import { createChallenge, playerInZone } from "./challenge.js";
import { updatePlayers } from "./movement.js";
import {
  DEFAULT_DIFFICULTY, FAIL_DISTANCE, REST_LENGTH, WORLD,
  clamp, collide, connectionEdges, createObstacle, createPlayer, inBounds,
  normalizeDifficulty, normalizeInput, pickColor, publicPlayer, randomBetween,
  resetPlayer, resolveDifficulty, tetherDistance
} from "./physics.js";

export function createGameRoom(id) {
  return new GameRoom(id);
}

const TETHER_PULL = 0.42;
const TETHER_DAMPING = 0.58;
const TARGET_ATTEMPTS = 18;

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = new Map();
    this.obstacles = [];
    this.status = "waiting";
    this.elapsed = 0;
    this.tick = 0;
    this.spawnTimer = 1;
    this.settings = { difficulty: DEFAULT_DIFFICULTY, mode: "multi", maxPlayers: 2, public: true };
    this.challenge = null;
    this.target = null;
    this.score = 0;
    this.challengeCount = 0;
    this.countdown = 0;
    this.lastResult = null;
    this.nextChallenge = nextChallengeDelay(this.difficulty(), "first");
    this.message = "等待玩家准备";
  }

  configure(settings = {}) {
    if (this.players.size > 0 || this.status !== "waiting") return;
    this.applySettings(settings);
  }

  addPlayer(id, options) {
    const active = this.activePlayers();
    const color = pickColor(options.color, active);
    const name = defaultName(options.name, active.length);
    this.players.set(id, createPlayer(id, name, color, active.length));
    this.status = this.status === "gameover" ? "waiting" : this.status;
    if (this.status === "waiting") this.message = this.waitingMessage();
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.status === "countdown") this.cancelCountdown();
    if (this.status === "running" && this.activePlayers().length < this.requiredPlayers()) this.endGame("玩家断开连接");
  }

  setReady(id, ready) {
    const player = this.players.get(id);
    if (!player || this.status === "running" || this.status === "gameover") return { ok: false };
    if (ready && !this.hasUniqueColor(id)) return { ok: false, message: "玩家不能使用相同颜色" };
    if (this.status === "countdown" && !ready) this.cancelCountdown();
    player.ready = ready;
    if (this.canStart()) this.beginCountdown();
    else if (this.status === "waiting") this.message = this.waitingMessage();
    return { ok: true };
  }

  setInput(id, input) {
    const player = this.players.get(id);
    if (player) player.input = normalizeInput(input);
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

  setSettings(id, settings = {}) {
    if (!this.isHost(id)) return { ok: false, message: "只有房主可以修改房间设置" };
    if (this.status === "running") return;
    const nextMode = settings.mode === "solo" ? "solo" : this.settings.mode;
    const nextMax = nextMode === "solo" ? 1 : normalizeMaxPlayers(settings.maxPlayers ?? this.settings.maxPlayers);
    if (this.players.size > nextMax) return { ok: false, message: "当前人数超过房间人数上限" };
    this.applySettings(settings);
    this.nextChallenge = nextChallengeDelay(this.difficulty(), "first");
    this.message = this.waitingMessage();
    return { ok: true };
  }

  restart() {
    const current = [...this.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color }));
    this.players.clear();
    this.resetRound();
    this.status = "waiting";
    this.message = this.isSolo() ? "单人挑战准备" : "等待玩家准备";
    current.forEach((p, index) => this.players.set(p.id, createPlayer(p.id, p.name, p.color, index)));
    if (this.isSolo()) {
      this.activePlayers().forEach(player => { player.ready = true; });
      this.start();
    }
  }

  publicState() {
    const players = this.publicPlayers();
    return {
      id: this.id,
      gameId: "elastic-duo",
      mode: this.settings.mode,
      maxPlayers: this.settings.maxPlayers,
      world: WORLD,
      status: this.status,
      tick: this.tick,
      elapsed: Math.round(this.elapsed),
      score: this.score,
      message: this.message,
      settings: publicSettings(this.difficulty(), this.settings),
      nextChallengeIn: Math.max(0, this.nextChallenge),
      countdown: Math.max(0, this.countdown),
      result: this.lastResult,
      challenge: this.challenge,
      target: this.target,
      tether: this.tetherState(),
      players,
      obstacles: this.obstacles
    };
  }

  canStart() {
    const active = this.activePlayers();
    return active.length >= this.requiredPlayers() && uniqueColors(active) && active.every(p => p.ready) && this.status === "waiting";
  }

  canContinueCountdown() {
    const active = this.activePlayers();
    return active.length >= this.requiredPlayers() && uniqueColors(active) && active.every(p => p.ready);
  }

  beginCountdown() {
    this.status = "countdown";
    this.countdown = this.isSolo() ? 0.8 : 3.2;
    this.message = "准备开始";
  }

  cancelCountdown() {
    this.status = "waiting";
    this.countdown = 0;
    this.message = "等待玩家准备";
  }

  start() {
    this.resetRound();
    this.status = "running";
    this.spawnTimer = this.difficulty().warmup;
    this.message = this.isSolo() ? "进入目标区域，避开障碍" : "保持队形，避开障碍";
    this.activePlayers().forEach((p, index) => resetPlayer(p, index));
    if (this.isSolo()) this.target = createTarget(this.activePlayers()[0], this.obstacles, this.difficulty());
  }

  activePlayers() { return [...this.players.values()].slice(0, this.settings.maxPlayers); }

  publicPlayers() {
    const hostId = this.activePlayers()[0]?.id;
    return this.activePlayers().map((player, index) => publicPlayer(player, { index, host: player.id === hostId }));
  }

  canJoin(id) {
    return this.players.has(id) || (this.status === "waiting" && this.activePlayers().length < this.settings.maxPlayers);
  }

  publicSummary() {
    const active = this.activePlayers();
    const statusLabel = this.status === "waiting" && active.length >= this.settings.maxPlayers ? "已满" : statusText(this.status);
    return {
      id: this.id,
      status: this.status,
      statusLabel,
      players: active.length,
      capacity: this.settings.maxPlayers,
      mode: this.settings.mode,
      modeLabel: this.isSolo() ? "单人" : `${this.settings.maxPlayers} 人协作`,
      difficulty: this.difficulty().label,
      host: active[0]?.name || ""
    };
  }

  endGame(reason) {
    this.status = "gameover";
    this.message = reason;
    this.lastResult = {
      reason,
      score: this.score,
      elapsed: Math.round(this.elapsed),
      difficulty: this.difficulty().label,
      mode: this.isSolo() ? "单人挑战" : `${this.activePlayers().length} 人协作`
    };
  }

  tetherState() {
    const players = this.activePlayers();
    if (players.length < 2) return { distance: 0, strain: 0 };
    const distance = tetherDistance(players);
    return { distance, strain: clamp((distance - REST_LENGTH) / (FAIL_DISTANCE - REST_LENGTH), 0, 1) };
  }

  hasUniqueColor(id) {
    const player = this.players.get(id);
    return Boolean(player) && !this.activePlayers().some(p => p.id !== id && p.color === player.color);
  }

  difficulty() { return resolveDifficulty(this.settings.difficulty); }
  isHost(id) { return this.activePlayers()[0]?.id === id; }
  isSolo() { return this.settings.mode === "solo"; }
  requiredPlayers() { return this.isSolo() ? 1 : this.settings.maxPlayers; }
  waitingMessage() {
    if (this.isSolo()) return "单人挑战准备";
    const active = this.activePlayers();
    if (active.length < this.settings.maxPlayers) return `等待玩家加入 ${active.length}/${this.settings.maxPlayers}`;
    if (!uniqueColors(active)) return "等待玩家调整颜色";
    return "等待所有玩家准备";
  }

  applySettings(settings = {}) {
    this.settings.difficulty = normalizeDifficulty(settings.difficulty ?? this.settings.difficulty);
    this.settings.mode = settings.mode === "solo" ? "solo" : "multi";
    this.settings.maxPlayers = this.isSolo() ? 1 : normalizeMaxPlayers(settings.maxPlayers ?? this.settings.maxPlayers);
    this.settings.public = settings.public !== false && !this.isSolo();
  }

  resetRound() {
    this.obstacles = [];
    this.elapsed = 0;
    this.tick = 0;
    this.countdown = 0;
    this.score = 0;
    this.challenge = null;
    this.target = null;
    this.challengeCount = 0;
    this.lastResult = null;
    this.nextChallenge = nextChallengeDelay(this.difficulty(), "first");
  }
}

export function updateRoom(room, dt) {
  if (updateCountdown(room, dt)) return;
  if (room.status !== "running") return;
  const players = room.activePlayers();
  if (players.length < room.requiredPlayers()) return;
  room.tick += 1;
  room.elapsed += dt;
  updatePlayers(players, dt);
  if (!room.isSolo()) applyElasticBand(players, dt);
  updateObstacles(room, dt);
  if (room.isSolo()) updateSoloTarget(room, dt);
  else updateChallenge(room, dt);
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
  connectionEdges(players).forEach(([a, b]) => {
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
  });
}

function updateObstacles(room, dt) {
  const difficulty = room.difficulty();
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
  room.obstacles = room.obstacles.filter(o => inBounds(o)).slice(-difficulty.maxObstacles);
}

function updateSoloTarget(room, dt) {
  const player = room.activePlayers()[0];
  if (!room.target) room.target = createTarget(player, room.obstacles, room.difficulty());
  room.target.remaining = Math.max(0, room.target.remaining - dt);
  if (Math.hypot(player.x - room.target.x, player.y - room.target.y) <= room.target.r) {
    room.score += 1;
    room.target = createTarget(player, room.obstacles, room.difficulty());
  } else if (room.target.remaining <= 0) {
    room.endGame("没有及时进入目标区域");
  }
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
    room.challenge = createChallenge(room.activePlayers(), room.challengeCount, room.difficulty());
  }
}

function finishChallenge(room) {
  const failed = room.activePlayers().find(p => {
    const assignment = room.challenge.assignments.find(item => item.playerId === p.id);
    return assignment && !playerInZone(p, assignment.zone, WORLD);
  });
  if (failed) room.endGame(`${failed.name} 没有及时进入颜色区域`);
  room.challenge = null;
  room.nextChallenge = nextChallengeDelay(room.difficulty(), "repeat");
}

function checkFailures(room, players) {
  if (!room.isSolo() && tetherDistance(players) > FAIL_DISTANCE) room.endGame("弹力连接被拉断");
  const hit = players.find(player => room.obstacles.some(o => collide(player, o)));
  if (hit) room.endGame(`${hit.name} 撞上了障碍物`);
}

function createTarget(player, obstacles, difficulty) {
  const t = (difficulty.level - 1) / 9;
  const radius = 86 - t * 28;
  const duration = difficulty.challengeDuration + 1.15;
  for (let i = 0; i < TARGET_ATTEMPTS; i += 1) {
    const target = {
      x: randomBetween(120, WORLD.width - 120),
      y: randomBetween(110, WORLD.height - 110),
      r: radius,
      color: player.color,
      duration,
      remaining: duration
    };
    if (validTarget(target, player, obstacles)) return target;
  }
  return { x: WORLD.width * 0.5, y: WORLD.height * 0.34, r: radius, color: player.color, duration, remaining: duration };
}

function validTarget(target, player, obstacles) {
  const playerDistance = Math.hypot(target.x - player.x, target.y - player.y);
  if (playerDistance < 160 || playerDistance > 760) return false;
  return !obstacles.some(o => Math.hypot(target.x - o.x, target.y - o.y) < target.r + o.r + 42);
}

function uniqueColors(players) { return new Set(players.map(player => player.color)).size === players.length; }

function defaultName(name, index) {
  const value = String(name || "").trim();
  return !value || value === "Player" ? `Player ${index + 1}` : value;
}

function nextChallengeDelay(difficulty, mode) {
  if (mode === "first") return randomBetween(difficulty.firstChallengeMin, difficulty.firstChallengeMax);
  return randomBetween(difficulty.repeatChallengeMin, difficulty.repeatChallengeMax);
}

function publicSettings(difficulty, settings) {
  return {
    difficulty: difficulty.level,
    difficultyLabel: difficulty.label,
    mode: settings.mode,
    maxPlayers: settings.maxPlayers,
    speed: Number(difficulty.speed.toFixed(2)),
    spawnMin: Number(difficulty.spawnMin.toFixed(2)),
    spawnMax: Number(difficulty.spawnMax.toFixed(2)),
    maxObstacles: difficulty.maxObstacles,
    challengeDuration: Number(difficulty.challengeDuration.toFixed(2))
  };
}

function normalizeMaxPlayers(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 2;
  return Math.round(clamp(number, 2, 4));
}

function statusText(status) {
  if (status === "running") return "游戏中";
  if (status === "gameover") return "已结束";
  if (status === "countdown") return "倒计时";
  return "等待中";
}
