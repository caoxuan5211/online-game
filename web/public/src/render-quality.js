const TARGET_FRAME = 1000 / 60;
const MOBILE_QUERY = typeof matchMedia === "function"
  ? matchMedia("(max-width: 760px), (pointer: coarse)")
  : { matches: false };
let lastFrameAt = 0;
let averageFrame = TARGET_FRAME;
let adaptiveLow = false;
let coolFrames = 0;

export function resolveRenderProfile(prefs = {}) {
  trackFrameCost();
  const mobile = MOBILE_QUERY.matches;
  const lite = prefs.quality === "low" || adaptiveLow || mobile;
  const dprCap = lite ? (mobile ? 1 : 1.2) : 1.3;
  return {
    full: !lite,
    dpr: Math.min(devicePixelRatio || 1, dprCap),
    shadows: false,
    trails: false,
    hints: !lite,
    names: !mobile || !lite,
    bandGlow: !lite
  };
}

export function prepareCanvas(canvas, world, profile) {
  const dpr = profile.dpr;
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = profile.full;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#070b13";
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / world.width, height / world.height);
  const offsetX = (width - world.width * scale) / 2;
  const offsetY = (height - world.height * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  return ctx;
}

function trackFrameCost() {
  const now = performance.now();
  if (lastFrameAt) {
    const delta = Math.min(80, now - lastFrameAt);
    averageFrame = averageFrame * 0.92 + delta * 0.08;
    if (averageFrame > 24) {
      adaptiveLow = true;
      coolFrames = 0;
    } else if (adaptiveLow && averageFrame < 18) {
      coolFrames += 1;
      if (coolFrames > 180) adaptiveLow = false;
    } else {
      coolFrames = 0;
    }
  }
  lastFrameAt = now;
}
