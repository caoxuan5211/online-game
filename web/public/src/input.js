export function createInput(onChange = () => {}) {
  const keys = new Set();
  const touch = { active: false, x: 0, y: 0 };
  const joystick = document.querySelector("#joystick");
  const stick = document.querySelector("#stick");

  window.addEventListener("keydown", event => updateKey(keys, event.key, true, onChange));
  window.addEventListener("keyup", event => updateKey(keys, event.key, false, onChange));
  if (joystick && stick) {
    joystick.addEventListener("pointerdown", event => startTouch(event, joystick, touch, onChange));
    joystick.addEventListener("pointermove", event => moveTouch(event, joystick, stick, touch, onChange));
    joystick.addEventListener("pointerup", () => endTouch(stick, touch, onChange));
    joystick.addEventListener("pointercancel", () => endTouch(stick, touch, onChange));
  }

  return {
    vector() {
      const keyboard = keyboardVector(keys);
      return touch.active ? { x: touch.x, y: touch.y } : keyboard;
    }
  };
}

function updateKey(keys, key, pressed, onChange) {
  const value = key.toLowerCase();
  const before = keys.size;
  if (pressed) keys.add(value);
  else keys.delete(value);
  if (keys.size !== before || movementKey(value)) onChange();
}

function keyboardVector(keys) {
  let x = 0;
  let y = 0;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (keys.has("w") || keys.has("arrowup")) y -= 1;
  if (keys.has("s") || keys.has("arrowdown")) y += 1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
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
