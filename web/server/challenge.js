export function createChallenge(players, count, difficulty) {
  const split = pickSplit(count);
  const ordered = shuffle(players);
  const duration = difficulty.challengeDuration;
  return {
    duration,
    remaining: duration,
    split,
    assignments: ordered.map((player, index) => ({
      playerId: player.id,
      color: player.color,
      zone: split.zones[index % split.zones.length]
    }))
  };
}

export function playerInZone(player, zone, world) {
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

function pickSplit(count) {
  const splits = [
    { type: "vertical", zones: ["left", "right"] },
    { type: "horizontal", zones: ["top", "bottom"] },
    { type: "diagonalDown", zones: ["diagDownA", "diagDownB"] },
    { type: "diagonalUp", zones: ["diagUpA", "diagUpB"] }
  ];
  return count === 1 ? splits[0] : splits[Math.floor(Math.random() * splits.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}
