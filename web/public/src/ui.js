export function setupUi({ session, settings, onJoin, onReady, onRestart, onSettings }) {
  const nodes = getNodes();
  let selectedColor = "red";
  let ready = false;
  bindSettings(nodes, settings.values, onSettings);
  bindShell(nodes);

  nodes.colorButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedColor = button.dataset.color;
      setActiveColor(nodes.colorButtons, selectedColor);
    });
  });

  nodes.joinButton.addEventListener("click", () => {
    onJoin({
      name: nodes.nameInput.value,
      roomId: nodes.roomInput.value,
      color: selectedColor
    });
  });

  nodes.readyButton.addEventListener("click", () => {
    ready = !ready;
    nodes.readyButton.textContent = ready ? "取消准备" : "准备";
    onReady(ready);
  });

  nodes.restartButton.addEventListener("click", () => {
    ready = false;
    onRestart();
  });

  return {
    setStatus(text) {
      nodes.statusText.textContent = text;
    },
    afterJoin(roomId) {
      nodes.joinPanel.classList.add("hidden");
      nodes.heroPanel.classList.add("hidden");
      nodes.appRoot.classList.remove("menu-mode");
      nodes.appRoot.classList.add("game-mode");
      nodes.readyButton.disabled = false;
      nodes.profileRoom.textContent = roomId.toUpperCase();
      nodes.playerText.textContent = `房间 ${roomId} / ${session.color}`;
    },
    update(state) {
      updateStateText(nodes, state, session.playerId);
      ready = updateReadyButton(nodes, state, session.playerId, ready);
    }
  };
}

function getNodes() {
  return {
    appRoot: document.querySelector("#appRoot"),
    heroPanel: document.querySelector("#heroPanel"),
    joinPanel: document.querySelector("#joinPanel"),
    startButton: document.querySelector("#startButton"),
    closeJoinButton: document.querySelector("#closeJoinButton"),
    menuSettingsButton: document.querySelector("#menuSettingsButton"),
    helpButton: document.querySelector("#helpButton"),
    helpPanel: document.querySelector("#helpPanel"),
    closeHelpButton: document.querySelector("#closeHelpButton"),
    statusText: document.querySelector("#statusText"),
    timerText: document.querySelector("#timerText"),
    challengeText: document.querySelector("#challengeText"),
    playerText: document.querySelector("#playerText"),
    profileName: document.querySelector("#profileName"),
    profileRoom: document.querySelector("#profileRoom"),
    settingsButton: document.querySelector("#settingsButton"),
    settingsPanel: document.querySelector("#settingsPanel"),
    closeSettingsButton: document.querySelector("#closeSettingsButton"),
    difficultySelect: document.querySelector("#difficultySelect"),
    qualitySelect: document.querySelector("#qualitySelect"),
    backgroundToggle: document.querySelector("#backgroundToggle"),
    shakeToggle: document.querySelector("#shakeToggle"),
    nameInput: document.querySelector("#nameInput"),
    roomInput: document.querySelector("#roomInput"),
    joinButton: document.querySelector("#joinButton"),
    readyButton: document.querySelector("#readyButton"),
    restartButton: document.querySelector("#restartButton"),
    colorButtons: [...document.querySelectorAll("[data-color]")]
  };
}

function setActiveColor(buttons, color) {
  buttons.forEach(button => button.classList.toggle("active", button.dataset.color === color));
}

function updateStateText(nodes, state, playerId) {
  nodes.statusText.textContent = state.message;
  nodes.timerText.textContent = `${state.elapsed}s`;
  nodes.restartButton.disabled = state.status !== "gameover";
  nodes.difficultySelect.disabled = state.status === "running";
  const me = state.players.find(player => player.id === playerId);
  if (me) {
    nodes.profileName.textContent = me.name;
    nodes.playerText.textContent = `${me.name} / ${colorName(me.color)} / ${state.settings.difficultyLabel}`;
  }
  nodes.challengeText.textContent = challengeLabel(state);
}

function updateReadyButton(nodes, state, playerId, ready) {
  const me = state.players.find(player => player.id === playerId);
  const nextReady = Boolean(me?.ready);
  nodes.readyButton.disabled = state.status === "running";
  nodes.readyButton.textContent = nextReady ? "取消准备" : "准备";
  return state.status === "running" ? false : nextReady || ready;
}

function challengeLabel(state) {
  if (state.challenge) return `区域 ${state.challenge.remaining.toFixed(1)}s`;
  if (state.status === "running") return `下一次 ${state.nextChallengeIn.toFixed(0)}s`;
  return "";
}

function colorName(color) {
  if (color === "red") return "红色";
  if (color === "blue") return "蓝色";
  return "观战";
}

function bindSettings(nodes, values, onSettings) {
  syncSettingsControls(nodes, values);
  nodes.settingsButton.addEventListener("click", () => nodes.settingsPanel.classList.toggle("open"));
  nodes.menuSettingsButton.addEventListener("click", () => nodes.settingsPanel.classList.toggle("open"));
  nodes.closeSettingsButton.addEventListener("click", () => nodes.settingsPanel.classList.remove("open"));
  [nodes.difficultySelect, nodes.qualitySelect].forEach(node => {
    node.addEventListener("change", () => onSettings(readSettings(nodes)));
  });
  [nodes.backgroundToggle, nodes.shakeToggle].forEach(node => {
    node.addEventListener("change", () => onSettings(readSettings(nodes)));
  });
}

function syncSettingsControls(nodes, values) {
  nodes.difficultySelect.value = values.difficulty;
  nodes.qualitySelect.value = values.quality;
  nodes.backgroundToggle.checked = values.showBackground;
  nodes.shakeToggle.checked = values.screenShake;
}

function readSettings(nodes) {
  return {
    difficulty: nodes.difficultySelect.value,
    quality: nodes.qualitySelect.value,
    showBackground: nodes.backgroundToggle.checked,
    screenShake: nodes.shakeToggle.checked
  };
}

function bindShell(nodes) {
  nodes.startButton.addEventListener("click", () => nodes.joinPanel.classList.remove("hidden"));
  nodes.closeJoinButton.addEventListener("click", () => nodes.joinPanel.classList.add("hidden"));
  nodes.helpButton.addEventListener("click", () => nodes.helpPanel.classList.toggle("open"));
  nodes.closeHelpButton.addEventListener("click", () => nodes.helpPanel.classList.remove("open"));
}
