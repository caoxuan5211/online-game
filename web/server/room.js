const WORLD = { width: 1280, height: 720 };
const COLORS = ["red", "blue"];
const PLAYER_RADIUS = 18;
const REST_LENGTH = 190;
const FAIL_DISTANCE = 390;
const MAX_OBSTACLES = 42;

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
    this.challenge = null;
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

  restart() {
    const current = [...this.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color }));
    this.players.clear();
    this.obstacles = [];
    this.status = "waiting";
    this.challenge = null;
    this.elapsed = 0;
    this.tick = 0;
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
    this.spawnTimer = 1.9;
    this.challenge = null;
    this.nextChallenge = randomBetween(4, 8);
    this.message = "躲避障碍，等待颜色区域";
    this.activePlayers().forEach((p, index) => resetPlayer(p, index));
  }

  activePlayers() {
    return [...this.players.values()].filter(p => COLORS.includes(p.color)).slice(0, 2);
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
    const accel = 1680;
    player.vx += player.input.x * accel * dt;
    player.vy += player.input.y * accel * dt;
    const damping = Math.pow(0.022, dt);
    player.vx *= damping;
    player.vy *= damping;
    limitSpeed(player, 430);
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
  room.spawnTimer -= dt;
  if (room.spawnTimer <= 0) {
    room.obstacles.push(createObstacle(room.elapsed));
    room.spawnTimer = randomBetween(0.38, 0.86);
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
  if (room.nextChallenge <= 0) room.challenge = createChallenge();
}

function finishChallenge(room) {
  const players = room.activePlayers();
  const failed = players.find(p => !playerInZone(p, room.challenge.zones[p.color]));
  if (failed) room.endGame(`${failed.name} 没有及时进入颜色区域`);
  room.challenge = null;
  room.nextChallenge = randomBetween(6, 12);
}

function checkFailures(room, players) {
  if (tetherDistance(players) > FAIL_DISTANCE) room.endGame("弹力带被拉断");
  const hit = players.find(player => room.obstacles.some(o => collide(player, o)));
  if (hit) room.endGame(`${hit.name} 撞上了障碍物`);
}

function createPlayer(id, name, color, index) {
  const player = { id, name, color, ready: false, health: 1, maxHealth: 1, input: { x: 0, y: 0 } };
  return resetPlayer(player, index);
}

function resetPlayer(player, index) {
  player.x = index === 0 ? WORLD.width * 0.42 : WORLD.width * 0.58;
  player.y = WORLD.height * 0.52;
  player.vx = 0;
  player.vy = 0;
  player.ready = false;
  return player;
}

function pickColor(requested, players) {
  const used = new Set(players.map(p => p.color));
  if (!used.has(requested)) return requested;
  return COLORS.find(color => !used.has(color)) || "spectator";
}

function normalizeInput(input) {
  const x = clamp(Number(input.x) || 0, -1, 1);
  const y = clamp(Number(input.y) || 0, -1, 1);
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

function createObstacle(time) {
  const edge = Math.floor(Math.random() * 4);
  const speed = randomBetween(205, 335) + Math.min(time * 3.6, 150);
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

function obstacleStart(edge) {
  if (edge === 0) return { x: randomBetween(0, WORLD.width), y: -40 };
  if (edge === 1) return { x: WORLD.width + 40, y: randomBetween(0, WORLD.height) };
  if (edge === 2) return { x: randomBetween(0, WORLD.width), y: WORLD.height + 40 };
  return { x: -40, y: randomBetween(0, WORLD.height) };
}

function createChallenge() {
  const vertical = Math.random() > 0.5;
  const redFirst = Math.random() > 0.5;
  return {
    duration: 4.5,
    remaining: 4.5,
    vertical,
    zones: makeZones(vertical, redFirst)
  };
}

function makeZones(vertical, redFirst) {
  const first = vertical ? "left" : "top";
  const second = vertical ? "right" : "bottom";
  return redFirst ? { red: first, blue: second } : { red: second, blue: first };
}

function playerInZone(player, zone) {
  if (zone === "left") return player.x < WORLD.width / 2;
  if (zone === "right") return player.x >= WORLD.width / 2;
  if (zone === "top") return player.y < WORLD.height / 2;
  return player.y >= WORLD.height / 2;
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    ready: player.ready,
    x: player.x,
    y: player.y,
    vx: player.vx,
    vy: player.vy,
    health: player.health,
    maxHealth: player.maxHealth
  };
}

function collide(player, obstacle) {
  return Math.hypot(player.x - obstacle.x, player.y - obstacle.y) < PLAYER_RADIUS + obstacle.r * 0.72;
}

function tetherDistance(players) {
  return Math.hypot(players[0].x - players[1].x, players[0].y - players[1].y);
}

function inBounds(o) {
  return o.x > -120 && o.x < WORLD.width + 120 && o.y > -120 && o.y < WORLD.height + 120;
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

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
