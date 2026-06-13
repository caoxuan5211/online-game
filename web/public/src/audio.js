const NOTES = [392, 494, 587, 494, 440, 523, 659, 523];

export function createAudio(prefs = {}) {
  const state = { ctx: null, master: null, limiter: null, connected: false, timer: null, step: 0, status: "", prefs };
  document.addEventListener("pointerdown", () => unlock(state), { once: true, capture: true });
  document.addEventListener("click", event => {
    if (event.target.closest("button,input,select")) playBlip(state, 660, 0.04, 0.055);
  }, true);
  return {
    update(next) {
      state.prefs = { ...state.prefs, ...next };
      applyVolume(state);
      if (!state.prefs.music) stopMusic(state);
      else if (state.ctx) startMusic(state);
    },
    updateState(game) {
      if (!game) return;
      if (state.status !== "gameover" && game.status === "gameover") playDeath(state);
      if (state.status !== "running" && game.status === "running") playBlip(state, 880, 0.08, 0.085);
      state.status = game.status;
    }
  };
}

function unlock(state) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  state.ctx = state.ctx || new AudioContext();
  state.master = state.master || state.ctx.createGain();
  state.limiter = state.limiter || createLimiter(state.ctx);
  applyVolume(state);
  if (!state.connected) {
    state.master.connect(state.limiter);
    state.limiter.connect(state.ctx.destination);
    state.connected = true;
  }
  state.ctx.resume?.();
  startMusic(state);
}

function applyVolume(state) {
  if (!state.master) return;
  const value = Math.max(0, Math.min(100, Number(state.prefs.volume) || 0));
  const mix = value / 100;
  state.master.gain.value = mix === 0 ? 0 : 0.1 + 1.55 * Math.pow(mix, 1.2);
}

function createLimiter(ctx) {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 12;
  limiter.ratio.value = 10;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.08;
  return limiter;
}

function startMusic(state) {
  if (!state.prefs.music || state.timer || !state.ctx) return;
  state.timer = setInterval(() => {
    const note = NOTES[state.step % NOTES.length];
    playTone(state, note, 0.16, 0.032, "sine");
    if (state.step % 2 === 0) playTone(state, note / 2, 0.22, 0.018, "triangle");
    state.step += 1;
  }, 520);
}

function stopMusic(state) {
  clearInterval(state.timer);
  state.timer = null;
}

function playBlip(state, frequency, duration, volume) {
  if (!state.prefs.sound) return;
  unlock(state);
  playTone(state, frequency, duration, volume, "triangle");
}

function playDeath(state) {
  if (!state.prefs.sound) return;
  unlock(state);
  [220, 165, 110].forEach((note, index) => {
    setTimeout(() => playTone(state, note, 0.18, 0.095, "sawtooth"), index * 90);
  });
}

function playTone(state, frequency, duration, volume, type) {
  if (!state.ctx || !state.master) return;
  const now = state.ctx.currentTime;
  const osc = state.ctx.createOscillator();
  const gain = state.ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(state.master);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}
