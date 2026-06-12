const BUILD = "20260613-smooth7";
const ASSETS = [
  { url: "./assets/background.png", type: "image", label: "背景图" },
  { url: versioned("./styles.css"), label: "样式" },
  { url: versioned("./loader.css"), label: "加载界面" },
  { url: versioned("./feedback.css"), label: "反馈界面" },
  { url: versioned("./config.js"), label: "配置" },
  { url: versioned("./src/main.js"), label: "主程序" },
  { url: versioned("./src/prediction.js"), label: "预测模块" },
  { url: versioned("./src/render.js"), label: "渲染模块" },
  { url: versioned("./src/render-cache.js"), label: "场景缓存" },
  { url: versioned("./src/render-quality.js"), label: "性能模块" },
  { url: versioned("./src/ui.js"), label: "界面模块" },
  { url: versioned("./src/input.js"), label: "输入模块" },
  { url: versioned("./src/smoothing.js"), label: "同步模块" },
  { url: versioned("./src/render-utils.js"), label: "绘制工具" },
  { url: "/socket.io/socket.io.js", label: "联机模块" }
];

const state = { done: 0, total: ASSETS.length + 1, startAt: performance.now() };
const preloadReady = runPreload();

export { preloadReady };

export function setLoaderStatus(label) {
  updateProgress(progressPercent(), label);
}

export async function finishLoader(label = "准备完成") {
  await Promise.race([preloadReady, delay(3600)]);
  updateProgress(100, label);
  await delay(Math.max(120, 520 - (performance.now() - state.startAt)));
  document.body.classList.add("is-loaded");
}

async function runPreload() {
  updateProgress(4, "准备资源");
  for (const asset of ASSETS) {
    await loadAsset(asset).catch(() => {});
    state.done += 1;
    updateProgress(progressPercent(), asset.label);
  }
  await registerServiceWorker();
  state.done += 1;
  updateProgress(96, "缓存完成");
}

function loadAsset(asset) {
  if (asset.type === "image") return loadImage(asset.url);
  return fetch(asset.url, { cache: "force-cache" }).then(response => {
    if (!response.ok) throw new Error(`preload failed: ${asset.url}`);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = url;
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(versioned("./sw.js"));
  } catch {}
}

function versioned(url) {
  return `${url}${url.includes("?") ? "&" : "?"}v=${BUILD}`;
}

function updateProgress(percent, label) {
  const bar = document.querySelector("#loaderBar");
  const text = document.querySelector("#loaderText");
  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}% · ${label}`;
}

function progressPercent() {
  return Math.min(96, Math.round((state.done / state.total) * 92) + 4);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
