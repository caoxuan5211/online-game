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
  const dprCap = lite ? (mobile ? 1.15 : 1.35) : 1.6;
  return {
    full: !lite,
    dpr: Math.min(devicePixelRatio || 1, dprCap),
    shadows: !lite,
    trails: !lite,
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
  ctx.setTransform(width / world.width, 0, 0, height / world.height, 0, 0);
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
