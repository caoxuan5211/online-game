const WORLD = { width: 1280, height: 720 };

export function createChallenge(players, count) {
  const split = pickSplit(count);
  const firstPlayer = Math.random() > 0.5 ? players[0] : players[1];
  const secondPlayer = players.find(player => player.id !== firstPlayer.id);
  return {
    duration: 4.5,
    remaining: 4.5,
    split,
    assignments: [
      { playerId: firstPlayer.id, color: firstPlayer.color, zone: split.zones[0] },
      { playerId: secondPlayer.id, color: secondPlayer.color, zone: split.zones[1] }
    ]
  };
}

export function playerInZone(player, zone) {
  const cx = WORLD.width / 2;
  const cy = WORLD.height / 2;
  if (zone === "left") return player.x < cx;
  if (zone === "right") return player.x >= cx;
  if (zone === "top") return player.y < cy;
  if (zone === "bottom") return player.y >= cy;
  if (zone === "diagDownA") return player.y - cy < player.x - cx;
  if (zone === "diagDownB") return player.y - cy >= player.x - cx;
  if (zone === "diagUpA") return player.y - cy < -(player.x - cx);
  return player.y - cy >= -(player.x - cx);
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
