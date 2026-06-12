const DELAY_MS = 24;

export function createStateBuffer() {
  const frames = [];

  return {
    push(state) {
      frames.push({ at: performance.now(), state });
      if (frames.length > 8) frames.shift();
    },
    current() {
      if (frames.length === 0) return null;
      if (frames.length === 1) return frames[0].state;
      const renderAt = performance.now() - DELAY_MS;
      const nextIndex = frames.findIndex(frame => frame.at >= renderAt);
      if (nextIndex <= 0) return frames[frames.length - 1].state;
      const prev = frames[nextIndex - 1];
      const next = frames[nextIndex];
      const mix = clamp((renderAt - prev.at) / Math.max(1, next.at - prev.at), 0, 1);
      return interpolateState(prev.state, next.state, mix);
    }
  };
}

function interpolateState(a, b, mix) {
  return {
    ...b,
    elapsed: b.elapsed,
    players: b.players.map(player => interpolateEntity(findById(a.players, player.id), player, mix)),
    obstacles: b.obstacles.map(obstacle => interpolateEntity(findById(a.obstacles, obstacle.id), obstacle, mix)),
    challenge: interpolateChallenge(a.challenge, b.challenge, mix),
    tether: interpolateTether(a.tether, b.tether, mix)
  };
}

function interpolateEntity(a, b, mix) {
  if (!a) return b;
  return {
    ...b,
    x: lerp(a.x, b.x, mix),
    y: lerp(a.y, b.y, mix),
    spin: lerp(a.spin ?? 0, b.spin ?? 0, mix)
  };
}

function interpolateChallenge(a, b, mix) {
  if (!a || !b) return b;
  return {
    ...b,
    remaining: lerp(a.remaining, b.remaining, mix)
  };
}

function interpolateTether(a = {}, b = {}, mix) {
  return {
    distance: lerp(a.distance || 0, b.distance || 0, mix),
    strain: lerp(a.strain || 0, b.strain || 0, mix)
  };
}

function findById(list, id) {
  return list.find(item => item.id === id);
}

function lerp(a, b, mix) {
  return a + (b - a) * mix;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
