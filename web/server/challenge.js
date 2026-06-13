export function createChallenge(players, count, difficulty) {
  const split = pickSplit(count);
  const firstPlayer = Math.random() > 0.5 ? players[0] : players[1];
  const secondPlayer = players.find(player => player.id !== firstPlayer.id);
  const duration = difficulty.challengeDuration;
  return {
    duration,
    remaining: duration,
    split,
    assignments: [
      { playerId: firstPlayer.id, color: firstPlayer.color, zone: split.zones[0] },
      { playerId: secondPlayer.id, color: secondPlayer.color, zone: split.zones[1] }
    ]
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
