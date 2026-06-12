export function setupUi({ session, settings, onJoin, onProfile, onReady, onRestart, onSettings }) {
  const nodes = getNodes();
  let selectedColor = "#4f68ff";
  let ready = false;
  let joinPending = false;
  let joinTimer = null;
  bindShell(nodes);
  bindSettings(nodes, settings.values, onSettings);
  bindProfile(nodes, () => selectedColor, value => { selectedColor = value; }, onProfile);

  nodes.createRoomButton.addEventListener("click", () => join(randomRoomId()));
  nodes.readyButton.addEventListener("click", () => {
    ready = !ready;
    nodes.readyButton.textContent = ready ? "取消准备" : "准备";
    onReady(ready);
  });
  nodes.restartButton.addEventListener("click", () => {
    ready = false;
    onRestart();
  });
  [nodes.resultRestartButton, nodes.resultLobbyButton].forEach(button => button.addEventListener("click", () => {
    ready = false;
    onRestart();
  }));

  return {
    setStatus(text) {
      nodes.statusText.textContent = text;
    },
    afterJoin(roomId) {
      joinPending = false;
      clearTimeout(joinTimer);
      nodes.createRoomButton.disabled = false;
      nodes.joinError.textContent = "";
      nodes.profileRoom.textContent = roomId.toUpperCase();
      nodes.joinPanel.classList.add("hidden");
      showMode(nodes, "lobby");
      nodes.readyButton.disabled = false;
    },
    update(state) {
      const me = state.players.find(player => player.id === session.playerId);
      if (me) {
        selectedColor = me.color;
        if (!nodes.nameInput.value || nodes.nameInput.value === "Player") nodes.nameInput.value = me.name;
        syncSelectedColor(nodes, me.color);
      }
      updateStateText(nodes, state, session.playerId);
      updateLobby(nodes, state, session.playerId);
      ready = updateReadyButton(nodes, state, session.playerId, ready);
    },
    updateRooms(rooms) {
      renderRooms(nodes, rooms, join);
    },
    showProfileError(message) {
      showProfileError(nodes, message);
    },
    showJoinError(message) {
      joinPending = false;
      clearTimeout(joinTimer);
      nodes.createRoomButton.disabled = false;
      nodes.joinError.textContent = message || "";
    }
  };

  function join(roomId) {
    if (joinPending) return;
    joinPending = true;
    nodes.createRoomButton.disabled = true;
    nodes.joinError.textContent = "正在进入房间...";
    joinTimer = setTimeout(() => {
      joinPending = false;
      nodes.createRoomButton.disabled = false;
      nodes.joinError.textContent = "进入房间超时，请重试";
    }, 5000);
    onJoin({ name: nodes.nameInput.value, roomId, color: selectedColor });
  }
}

function getNodes() {
  return {
    appRoot: document.querySelector("#appRoot"),
    heroPanel: document.querySelector("#heroPanel"),
    joinPanel: document.querySelector("#joinPanel"),
    lobbyPanel: document.querySelector("#lobbyPanel"),
    roomList: document.querySelector("#roomList"),
    joinError: document.querySelector("#joinError"),
    startButton: document.querySelector("#startButton"),
    closeJoinButton: document.querySelector("#closeJoinButton"),
    createRoomButton: document.querySelector("#createRoomButton"),
    backHomeButton: document.querySelector("#backHomeButton"),
    backGameButton: document.querySelector("#backGameButton"),
    menuSettingsButton: document.querySelector("#menuSettingsButton"),
    helpButton: document.querySelector("#helpButton"),
    helpPanel: document.querySelector("#helpPanel"),
    closeHelpButton: document.querySelector("#closeHelpButton"),
    statusText: document.querySelector("#statusText"),
    timerText: document.querySelector("#timerText"),
    challengeText: document.querySelector("#challengeText"),
    playerText: document.querySelector("#playerText"),
    resultPanel: document.querySelector("#resultPanel"),
    resultReason: document.querySelector("#resultReason"),
    resultStats: document.querySelector("#resultStats"),
    resultRestartButton: document.querySelector("#resultRestartButton"),
    resultLobbyButton: document.querySelector("#resultLobbyButton"),
    countdownOverlay: document.querySelector("#countdownOverlay"),
    countdownNumber: document.querySelector("#countdownNumber"),
    profileName: document.querySelector("#profileName"),
    profileRoom: document.querySelector("#profileRoom"),
    lobbyPlayers: document.querySelector("#lobbyPlayers"),
    settingsButton: document.querySelector("#settingsButton"),
    settingsPanel: document.querySelector("#settingsPanel"),
    closeSettingsButton: document.querySelector("#closeSettingsButton"),
    difficultySelect: document.querySelector("#difficultySelect"),
    qualitySelect: document.querySelector("#qualitySelect"),
    backgroundToggle: document.querySelector("#backgroundToggle"),
    shakeToggle: document.querySelector("#shakeToggle"),
    nameInput: document.querySelector("#nameInput"),
    saveProfileButton: document.querySelector("#saveProfileButton"),
    copyRoomButton: document.querySelector("#copyRoomButton"),
    profileError: document.querySelector("#profileError"),
    customColorInput: document.querySelector("#customColorInput"),
    readyButton: document.querySelector("#readyButton"),
    restartButton: document.querySelector("#restartButton"),
    colorButtons: [...document.querySelectorAll("[data-player-color]")]
  };
}

function bindShell(nodes) {
  nodes.startButton.addEventListener("click", () => nodes.joinPanel.classList.remove("hidden"));
  nodes.closeJoinButton.addEventListener("click", () => nodes.joinPanel.classList.add("hidden"));
  nodes.helpButton.addEventListener("click", () => nodes.helpPanel.classList.toggle("open"));
  nodes.closeHelpButton.addEventListener("click", () => nodes.helpPanel.classList.remove("open"));
  [nodes.backHomeButton, nodes.backGameButton].forEach(button => button.addEventListener("click", () => location.reload()));
  nodes.copyRoomButton.addEventListener("click", () => copyRoom(nodes));
}

function bindProfile(nodes, getColor, setColor, onProfile) {
  nodes.colorButtons.forEach(button => {
    button.addEventListener("click", () => {
      setColor(button.dataset.playerColor);
      nodes.customColorInput.value = button.dataset.playerColor;
      nodes.colorButtons.forEach(item => item.classList.toggle("active", item === button));
      if (!nodes.lobbyPanel.classList.contains("hidden")) sendProfile(nodes, getColor(), onProfile);
    });
  });
  nodes.customColorInput.addEventListener("input", () => {
    setColor(nodes.customColorInput.value);
    nodes.colorButtons.forEach(item => item.classList.remove("active"));
    if (!nodes.lobbyPanel.classList.contains("hidden")) sendProfile(nodes, getColor(), onProfile);
  });
  nodes.saveProfileButton.addEventListener("click", () => sendProfile(nodes, getColor(), onProfile));
}

function sendProfile(nodes, color, onProfile) {
  nodes.profileName.textContent = nodes.nameInput.value || "Player";
  nodes.profileError.textContent = "";
  onProfile({ name: nodes.nameInput.value, color });
}

function syncSelectedColor(nodes, color) {
  if (nodes.customColorInput.value !== color) nodes.customColorInput.value = color;
  nodes.colorButtons.forEach(item => item.classList.toggle("active", item.dataset.playerColor === color));
}

function bindSettings(nodes, values, onSettings) {
  syncSettingsControls(nodes, values);
  nodes.settingsButton.addEventListener("click", () => nodes.settingsPanel.classList.toggle("open"));
  nodes.menuSettingsButton.addEventListener("click", () => nodes.settingsPanel.classList.toggle("open"));
  nodes.closeSettingsButton.addEventListener("click", () => nodes.settingsPanel.classList.remove("open"));
  [nodes.difficultySelect, nodes.qualitySelect, nodes.backgroundToggle, nodes.shakeToggle].forEach(node => {
    node.addEventListener("change", () => onSettings(readSettings(nodes)));
  });
}

function renderRooms(nodes, rooms, join) {
  const open = rooms.filter(room => room.status === "waiting" && room.players < room.capacity);
  nodes.roomList.innerHTML = "";
  if (open.length === 0) {
    nodes.roomList.innerHTML = `<div class="empty-room">暂无可加入房间</div>`;
    return;
  }
  open.forEach(room => {
    const button = document.createElement("button");
    button.className = "room-card";
    button.innerHTML = `<strong>${room.id}</strong><span>${room.players}/${room.capacity} · ${room.difficulty}</span>`;
    button.addEventListener("click", () => join(room.id));
    nodes.roomList.appendChild(button);
  });
}

function updateStateText(nodes, state, playerId) {
  setText(nodes.statusText, state.message);
  setText(nodes.timerText, `${state.elapsed}s`);
  nodes.restartButton.disabled = state.status !== "gameover";
  nodes.difficultySelect.disabled = state.status === "running" || state.status === "countdown";
  const me = state.players.find(player => player.id === playerId);
  if (me) {
    setText(nodes.profileName, me.name);
    setText(nodes.playerText, `${me.name} / ${state.settings.difficultyLabel}`);
  }
  setText(nodes.challengeText, challengeLabel(state));
  updateCountdown(nodes, state);
  updateResultPanel(nodes, state);
  if (state.status === "running") showMode(nodes, "game");
  if (state.status === "waiting" || state.status === "countdown") showMode(nodes, "lobby");
  if (state.status === "gameover") showMode(nodes, "game");
}

function updateLobby(nodes, state, playerId) {
  const key = state.players.map(player => `${player.id}:${player.name}:${player.color}:${player.ready}:${player.host}`).join("|");
  if (nodes.lobbyKey === key) return; nodes.lobbyKey = key;
  nodes.lobbyPlayers.innerHTML = "";
  state.players.forEach(player => {
    const row = document.createElement("div");
    row.className = `lobby-player ${player.ready ? "is-ready" : "is-waiting"}`;
    row.innerHTML = `<span style="--player:${player.color}"></span><strong>${player.name}</strong><em>${roleText(player, playerId)}</em><small>${player.ready ? "READY" : "WAITING"}</small>`;
    nodes.lobbyPlayers.appendChild(row);
  });
}

function updateReadyButton(nodes, state, playerId, ready) {
  const me = state.players.find(player => player.id === playerId);
  const nextReady = Boolean(me?.ready);
  const colorConflict = hasColorConflict(state.players);
  nodes.readyButton.disabled = state.status === "running" || state.status === "countdown" || colorConflict;
  setText(nodes.readyButton, nextReady ? "取消准备" : "准备");
  if (colorConflict) showProfileError(nodes, "两名玩家不能使用相同颜色");
  else if (nodes.profileError.textContent === "两名玩家不能使用相同颜色") showProfileError(nodes, "");
  return state.status === "running" ? false : nextReady || ready;
}

function showMode(nodes, mode) {
  if (nodes.mode === mode) return; nodes.mode = mode;
  nodes.appRoot.classList.remove("menu-mode", "lobby-mode", "game-mode");
  nodes.appRoot.classList.add(`${mode}-mode`);
  nodes.heroPanel.classList.toggle("hidden", mode !== "menu");
  nodes.lobbyPanel.classList.toggle("hidden", mode !== "lobby");
}

function challengeLabel(state) {
  if (state.status === "countdown") return `开始 ${Math.ceil(state.countdown)}s`;
  if (state.challenge) return `区域 ${state.challenge.remaining.toFixed(1)}s`;
  if (state.status === "running") return `下一次 ${state.nextChallengeIn.toFixed(0)}s`;
  return "";
}

function updateCountdown(nodes, state) {
  const active = state.status === "countdown";
  nodes.countdownOverlay.classList.toggle("hidden", !active);
  if (active) setText(nodes.countdownNumber, Math.max(1, Math.ceil(state.countdown)));
}

function updateResultPanel(nodes, state) {
  const result = state.result;
  nodes.resultPanel.classList.toggle("hidden", state.status !== "gameover" || !result);
  if (!result) return;
  setText(nodes.resultReason, result.reason);
  setText(nodes.resultStats, `${result.elapsed}s · ${result.difficulty}`);
}

function showProfileError(nodes, message) {
  nodes.profileError.textContent = message || "";
}

function hasColorConflict(players) {
  return new Set(players.map(player => player.color)).size !== players.length;
}

function roleText(player, playerId) {
  const role = player.id === playerId ? "我" : "队友";
  return player.host ? `${role} · 房主` : role;
}

function copyRoom(nodes) {
  const room = nodes.profileRoom.textContent;
  navigator.clipboard?.writeText(room);
  nodes.profileError.textContent = `已复制 ${room}`;
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

function randomRoomId() {
  return `ROOM${Math.floor(1000 + Math.random() * 9000)}`;
}

function setText(node, text) { const value = String(text); if (node.textContent !== value) node.textContent = value; }
