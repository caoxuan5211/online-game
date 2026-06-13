export function drawSplitLine(ctx, split, world) {
  if (split.type === "radial") return drawRadialSplit(ctx, split, world);
  if (split.type === "vertical") return line(ctx, world.width / 2, 0, world.width / 2, world.height);
  if (split.type === "horizontal") return line(ctx, 0, world.height / 2, world.width, world.height / 2);
  if (split.type === "diagonalDown") return line(ctx, 0, 0, world.width, world.height);
  return line(ctx, 0, world.height, world.width, 0);
}

export function zonePoints(zone, world) {
  if (zone?.type === "sector") return sectorPoints(zone, world);
  const w = world.width;
  const h = world.height;
  if (zone === "left") return [[0, 0], [w / 2, 0], [w / 2, h], [0, h]];
  if (zone === "right") return [[w / 2, 0], [w, 0], [w, h], [w / 2, h]];
  if (zone === "top") return [[0, 0], [w, 0], [w, h / 2], [0, h / 2]];
  if (zone === "bottom") return [[0, h / 2], [w, h / 2], [w, h], [0, h]];
  if (zone === "diagDownA") return [[0, 0], [w, h], [0, h]];
  if (zone === "diagDownB") return [[0, 0], [w, 0], [w, h]];
  if (zone === "diagUpA") return [[0, 0], [w, 0], [0, h]];
  return [[w, 0], [w, h], [0, h]];
}

function drawRadialSplit(ctx, split, world) {
  const center = { x: world.width / 2, y: world.height / 2 };
  const radius = Math.hypot(world.width, world.height);
  split.zones.forEach(zone => {
    const x = center.x + Math.cos(zone.start) * radius;
    const y = center.y + Math.sin(zone.start) * radius;
    line(ctx, center.x, center.y, x, y);
  });
}

function sectorPoints(zone, world) {
  const center = { x: world.width / 2, y: world.height / 2 };
  const radius = Math.hypot(world.width, world.height);
  const points = [[center.x, center.y]];
  const steps = Math.max(4, Math.ceil((zone.end - zone.start) / (Math.PI / 18)));
  for (let i = 0; i <= steps; i += 1) {
    const angle = zone.start + ((zone.end - zone.start) * i) / steps;
    points.push([center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius]);
  }
  return points;
}

export function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
