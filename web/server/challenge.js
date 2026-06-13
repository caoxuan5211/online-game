export function createChallenge(players, count, difficulty) {
  const ordered = shuffle(players);
  const duration = difficulty.challengeDuration;
  const split = createRadialSplit(ordered.length, count);
  return {
    duration,
    remaining: duration,
    split,
    assignments: ordered.map((player, index) => ({
      playerId: player.id,
      color: player.color,
      zone: split.zones[index]
    }))
  };
}

export function playerInZone(player, zone, world) {
  if (zone?.type === "sector") return playerInSector(player, zone, world);
  const cx = world.width / 2;
  const cy = world.height / 2;
  const dx = player.x - cx;
  const dy = player.y - cy;
  const diagonal = (world.height / world.width) * dx;
  if (zone === "left") return player.x < cx;
  if (zone === "right") return player.x >= cx;
  if (zone === "top") return player.y < cy;
  if (zone === "bottom") return player.y >= cy;
  if (zone === "diagDownA") return dy >= diagonal;
  if (zone === "diagDownB") return dy < diagonal;
  if (zone === "diagUpA") return dy <= -diagonal;
  return dy > -diagonal;
}

function createRadialSplit(total, count) {
  const step = (Math.PI * 2) / total;
  const rotation = -Math.PI / 2 + (count % total) * step * 0.5;
  const zones = Array.from({ length: total }, (_, index) => ({
    type: "sector",
    index,
    total,
    start: rotation + step * index,
    end: rotation + step * (index + 1)
  }));
  return { type: "radial", total, rotation, zones };
}

function playerInSector(player, zone, world) {
  const cx = world.width / 2;
  const cy = world.height / 2;
  const angle = normalizeAngle(Math.atan2(player.y - cy, player.x - cx));
  const start = normalizeAngle(zone.start);
  const end = normalizeAngle(zone.end);
  return start < end ? angle >= start && angle < end : angle >= start || angle < end;
}

function normalizeAngle(angle) {
  const full = Math.PI * 2;
  return ((angle % full) + full) % full;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}
