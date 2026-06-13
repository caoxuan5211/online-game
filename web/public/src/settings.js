const DEFAULTS = {
  difficulty: 5,
  quality: "high",
  screenShake: true,
  showBackground: true,
  showJoystick: true,
  sound: true,
  music: true,
  volume: 70
};

export function createSettings() {
  const values = { ...DEFAULTS, ...readStored() };
  applyDom(values);

  return {
    values,
    update(next) {
      Object.assign(values, sanitize(next));
      localStorage.setItem("elastic-duo-settings", JSON.stringify(values));
      applyDom(values);
    }
  };
}

function readStored() {
  try {
    return sanitize(JSON.parse(localStorage.getItem("elastic-duo-settings") || "{}"));
  } catch {
    return {};
  }
}

function sanitize(value = {}) {
  return {
    difficulty: sanitizeDifficulty(value.difficulty),
    quality: value.quality === "low" ? "low" : DEFAULTS.quality,
    screenShake: value.screenShake !== false,
    showBackground: value.showBackground !== false,
    showJoystick: value.showJoystick !== false,
    sound: value.sound !== false,
    music: value.music !== false,
    volume: sanitizeVolume(value.volume)
  };
}

function sanitizeDifficulty(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULTS.difficulty;
  return Math.round(Math.max(1, Math.min(10, number)));
}

function sanitizeVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULTS.volume;
  return Math.round(Math.max(0, Math.min(100, number)));
}

function applyDom(values) {
  document.body.classList.toggle("hide-joystick", !values.showJoystick);
  document.body.classList.toggle("no-scene-bg", !values.showBackground);
}
