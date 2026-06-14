import { line } from "./render-utils.js?v=20260613-smooth19";

const sceneBackground = new Image();
sceneBackground.decoding = "async";
sceneBackground.src = new URL("./assets/background.png", import.meta.url).href;

let cachedKey = "";
let cachedScene = null;

export function drawStaticScene(ctx, world, profile, showBackground) {
  const ready = sceneBackground.complete && sceneBackground.naturalWidth > 0;
  const key = `${world.width}x${world.height}:${showBackground}:${profile.full}:${ready}`;
  if (key !== cachedKey) {
    cachedScene = buildScene(world, profile, showBackground && ready);
    cachedKey = key;
  }
  ctx.drawImage(cachedScene, 0, 0, world.width, world.height);
}

function buildScene(world, profile, useBackground) {
  const canvas = document.createElement("canvas");
  canvas.width = world.width;
  canvas.height = world.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  drawBase(ctx, world, useBackground);
  drawReadabilityMasks(ctx, world);
  drawArena(ctx, world, profile.full);
  return canvas;
}

function drawBase(ctx, world, useBackground) {
  if (useBackground) {
    drawCoverImage(ctx, sceneBackground, world);
    ctx.fillStyle = "rgba(9,14,27,0.48)";
    ctx.fillRect(0, 0, world.width, world.height);
    return;
  }
  const gradient = ctx.createRadialGradient(world.width * 0.5, world.height * 0.44, 40, world.width * 0.5, world.height * 0.5, world.width * 0.76);
  gradient.addColorStop(0, "#202026");
  gradient.addColorStop(0.58, "#14171d");
  gradient.addColorStop(1, "#0b0d11");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawArena(ctx, world, full) {
  if (full) {
    ctx.strokeStyle = "rgba(190,220,255,0.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x < world.width; x += 112) line(ctx, x, 0, x, world.height);
    for (let y = 0; y < world.height; y += 112) line(ctx, 0, y, world.width, y);
  }
  ctx.strokeStyle = "rgba(210,235,255,0.18)";
  ctx.lineWidth = full ? 4 : 3;
  ctx.strokeRect(16, 16, world.width - 32, world.height - 32);
}

function drawCoverImage(ctx, image, world) {
  const scale = Math.max(world.width / image.naturalWidth, world.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (world.width - width) / 2, (world.height - height) / 2, width, height);
}

function drawReadabilityMasks(ctx, world) {
  const top = ctx.createLinearGradient(0, 0, 0, world.height * 0.34);
  top.addColorStop(0, "rgba(4,8,18,0.72)");
  top.addColorStop(1, "rgba(4,8,18,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, world.width, world.height * 0.34);
  const bottom = ctx.createLinearGradient(0, world.height, 0, world.height * 0.54);
  bottom.addColorStop(0, "rgba(4,8,18,0.76)");
  bottom.addColorStop(1, "rgba(4,8,18,0)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, world.height * 0.54, world.width, world.height * 0.46);
  const side = ctx.createRadialGradient(world.width * 0.5, world.height * 0.5, 120, world.width * 0.5, world.height * 0.5, 760);
  side.addColorStop(0, "rgba(255,255,255,0)");
  side.addColorStop(1, "rgba(4,8,18,0.44)");
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, world.width, world.height);
}
