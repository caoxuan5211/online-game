export function createInput(onChange = () => {}) {
  const keys = new Set();
  const keyOrder = [];
  const touch = { active: false, x: 0, y: 0 };
  const joystick = document.querySelector("#joystick");
  const stick = document.querySelector("#stick");

  window.addEventListener("keydown", event => updateKey(keys, keyOrder, event.key, true, onChange));
  window.addEventListener("keyup", event => updateKey(keys, keyOrder, event.key, false, onChange));
  if (joystick && stick) {
    joystick.addEventListener("pointerdown", event => startTouch(event, joystick, touch, onChange));
    joystick.addEventListener("pointermove", event => moveTouch(event, joystick, stick, touch, onChange));
    joystick.addEventListener("pointerup", () => endTouch(stick, touch, onChange));
    joystick.addEventListener("pointercancel", () => endTouch(stick, touch, onChange));
  }

  return {
    vector() {
      const keyboard = keyboardVector(keys, keyOrder);
      return touch.active ? { x: touch.x, y: touch.y } : keyboard;
    }
  };
}

const LEFT_KEYS = ["a", "arrowleft"];
const RIGHT_KEYS = ["d", "arrowright"];
const UP_KEYS = ["w", "arrowup"];
const DOWN_KEYS = ["s", "arrowdown"];

function updateKey(keys, keyOrder, key, pressed, onChange) {
  const value = key.toLowerCase();
  if (!movementKey(value)) return;
  const before = keyboardVector(keys, keyOrder);
  if (pressed && !keys.has(value)) keyOrder.push(value);
  if (pressed) keys.add(value);
  else {
    keys.delete(value);
    removeKey(keyOrder, value);
  }
  const after = keyboardVector(keys, keyOrder);
  if (Math.abs(after.x - before.x) > 0.01 || Math.abs(after.y - before.y) > 0.01) onChange();
}

function keyboardVector(keys, keyOrder) {
  const x = axisValue(keys, keyOrder, LEFT_KEYS, RIGHT_KEYS);
  const y = axisValue(keys, keyOrder, UP_KEYS, DOWN_KEYS);
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function axisValue(keys, keyOrder, negativeKeys, positiveKeys) {
  for (let i = keyOrder.length - 1; i >= 0; i -= 1) {
    const key = keyOrder[i];
    if (!keys.has(key)) continue;
    if (negativeKeys.includes(key)) return -1;
    if (positiveKeys.includes(key)) return 1;
  }
  return 0;
}

function removeKey(keyOrder, value) {
  const index = keyOrder.indexOf(value);
  if (index !== -1) keyOrder.splice(index, 1);
}

function startTouch(event, joystick, touch, onChange) {
  joystick.setPointerCapture(event.pointerId);
  touch.active = true;
  const stick = document.querySelector("#stick");
  if (stick) moveTouch(event, joystick, stick, touch, onChange);
}

function moveTouch(event, joystick, stick, touch, onChange) {
  if (!touch.active) return;
  const rect = joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const max = rect.width * 0.32;
  const length = Math.min(max, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const sx = Math.cos(angle) * length;
  const sy = Math.sin(angle) * length;
  touch.x = sx / max;
  touch.y = sy / max;
  stick.style.transform = `translate(${sx}px, ${sy}px)`;
  onChange();
}

function endTouch(stick, touch, onChange) {
  touch.active = false;
  touch.x = 0;
  touch.y = 0;
  stick.style.transform = "translate(0, 0)";
  onChange();
}

function movementKey(key) {
  return ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key);
}
