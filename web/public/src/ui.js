const games = [{
  id: "elastic-duo",
  title: "Elastic Duo",
  subtitle: "弹性之间，连接彼此",
  cover: "./assets/background.png",
  supportedModes: ["单人", "双人", "多人", "协作"],
  description: "保持弹性连接，避开障碍，进入目标区域。"
}];

export function setupUi({ session, settings, onJoin, onSolo, onProfile, onReady, onRestart, onSettings }) {
  const nodes = getNodes();
  let selectedColor = "#4f68ff";
  let ready = false;
  let joinPending = false;
  let joinTimer = null;
  bindShell(nodes);
  bindSettings(nodes, settings.values, onSettings);
  bindProfile(nodes, () => selectedColor, value => { selectedColor = value; }, onProfile);
  renderGames(nodes, () => showOnly(nodes, "mode"));

  nodes.createRoomButton.addEventListener("click", () => join(randomRoomId(), {
    mode: "multi",
    maxPlayers: Number(nodes.roomSizeSelect.value)
  }));
  nodes.soloModeButton.addEventListener("click", () => {
    showOnly(nodes, "none");
    onSolo({ name: nodes.nameInput.value, color: selectedColor });
  });
  nodes.multiModeButtons.forEach(button => {
    button.addEventListener("click", () => {
      nodes.roomSizeSelect.value = button.dataset.roomSize;
      showOnly(nodes, "join");
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
  [nodes.resultRestartButton, nodes.resultLobbyButton].forEach(button => button.addEventListener("click", () => {
    ready = false;
    onRestart();
  }));
  nodes.resultModeButton.addEventListener("click", () => {
    ready = false;
    nodes.resultPanel.classList.add("hidden");
    showMode(nodes, "menu");
    showOnly(nodes, "mode");
  });

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
      syncRoomSettings(nodes, settings, state, session.playerId);
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

  function join(roomId, options = {}) {
    if (joinPending) return;
    joinPending = true;
    nodes.createRoomButton.disabled = true;
    nodes.joinError.textContent = "正在进入房间...";
    joinTimer = setTimeout(() => {
      joinPending = false;
      nodes.createRoomButton.disabled = false;
      nodes.joinError.textContent = "进入房间超时，请重试";
    }, 5000);
    onJoin({ name: nodes.nameInput.value, roomId, color: selectedColor, ...options });
  }
}

function getNodes() {
  return {
    appRoot: document.querySelector("#appRoot"),
    heroPanel: document.querySelector("#heroPanel"),
    gameSelectPanel: document.querySelector("#gameSelectPanel"),
    modeSelectPanel: document.querySelector("#modeSelectPanel"),
    gameList: document.querySelector("#gameList"),
    joinPanel: document.querySelector("#joinPanel"),
    lobbyPanel: document.querySelector("#lobbyPanel"),
    roomList: document.querySelector("#roomList"),
    joinError: document.querySelector("#joinError"),
    startButton: document.querySelector("#startButton"),
    closeJoinButton: document.querySelector("#closeJoinButton"),
    closeGameSelectButton: document.querySelector("#closeGameSelectButton"),
    closeModeSelectButton: document.querySelector("#closeModeSelectButton"),
    createRoomButton: document.querySelector("#createRoomButton"),
    soloModeButton: document.querySelector("#soloModeButton"),
    multiModeButtons: [...document.querySelectorAll("[data-room-size]")],
    roomSizeSelect: document.querySelector("#roomSizeSelect"),
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
    resultModeButton: document.querySelector("#resultModeButton"),
    countdownOverlay: document.querySelector("#countdownOverlay"),
    countdownNumber: document.querySelector("#countdownNumber"),
    profileName: document.querySelector("#profileName"),
    profileRoom: document.querySelector("#profileRoom"),
    lobbyPlayers: document.querySelector("#lobbyPlayers"),
    settingsButton: document.querySelector("#settingsButton"),
    settingsPanel: document.querySelector("#settingsPanel"),
    closeSettingsButton: document.querySelector("#closeSettingsButton"),
    difficultySelect: document.querySelector("#difficultySelect"),
    difficultyValue: document.querySelector("#difficultyValue"),
    difficultyHint: document.querySelector("#difficultyHint"),
    maxPlayersSelect: document.querySelector("#maxPlayersSelect"),
    qualitySelect: document.querySelector("#qualitySelect"),
    backgroundToggle: document.querySelector("#backgroundToggle"),
    shakeToggle: document.querySelector("#shakeToggle"),
    soundToggle: document.querySelector("#soundToggle"),
    musicToggle: document.querySelector("#musicToggle"),
    volumeSelect: document.querySelector("#volumeSelect"),
    volumeValue: document.querySelector("#volumeValue"),
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
  nodes.startButton.addEventListener("click", () => showOnly(nodes, "game"));
  nodes.closeGameSelectButton.addEventListener("click", () => showOnly(nodes, "none"));
  nodes.closeModeSelectButton.addEventListener("click", () => showOnly(nodes, "game"));
  nodes.closeJoinButton.addEventListener("click", () => showOnly(nodes, "mode"));
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
  [nodes.difficultySelect, nodes.maxPlayersSelect, nodes.qualitySelect, nodes.backgroundToggle, nodes.shakeToggle, nodes.soundToggle, nodes.musicToggle, nodes.volumeSelect].forEach(node => {
    node.addEventListener("change", () => onSettings(readSettings(nodes)));
  });
  nodes.volumeSelect.addEventListener("input", () => {
    setText(nodes.volumeValue, nodes.volumeSelect.value);
    onSettings(readSettings(nodes));
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
    button.innerHTML = `<strong>${room.id}</strong><span>${room.players}/${room.capacity} · ${room.difficulty} · ${room.modeLabel || "多人"} · ${room.statusLabel || "等待中"}</span>`;
    button.addEventListener("click", () => join(room.id));
    nodes.roomList.appendChild(button);
  });
}

function updateStateText(nodes, state, playerId) {
  setText(nodes.statusText, state.message);
  setText(nodes.timerText, `${state.elapsed}s`);
  nodes.restartButton.disabled = state.status !== "gameover";
  const me = state.players.find(player => player.id === playerId);
  if (me) {
    setText(nodes.profileName, me.name);
    const suffix = state.mode === "solo" ? `分数 ${state.score || 0}` : `${state.players.length}/${state.maxPlayers || state.players.length}`;
    setText(nodes.playerText, `${me.name} / ${state.settings.difficultyLabel} / ${suffix}`);
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

function renderGames(nodes, onSelect) {
  nodes.gameList.innerHTML = "";
  games.forEach(game => {
    const button = document.createElement("button");
    button.className = "game-card";
    button.innerHTML = `
      <span class="game-cover" style="background-image:url('${game.cover}')"></span>
      <span><strong>${game.title}</strong><span>${game.description}</span><span class="game-tags">${game.supportedModes.map(tag => `<small>${tag}</small>`).join("")}</span><em class="game-action">选择游戏</em></span>
    `;
    button.addEventListener("click", onSelect);
    nodes.gameList.appendChild(button);
  });
}

function syncRoomSettings(nodes, settings, state, playerId) {
  const me = state.players.find(player => player.id === playerId);
  const level = Number(state.settings.difficulty) || settings.values.difficulty;
  const maxPlayers = Number(state.settings.maxPlayers) || settings.values.maxPlayers;
  const isHost = Boolean(me?.host);
  if (settings.values.difficulty !== level) settings.values.difficulty = level;
  if (settings.values.maxPlayers !== maxPlayers) settings.values.maxPlayers = maxPlayers;
  if (Number(nodes.difficultySelect.value) !== level) nodes.difficultySelect.value = String(level);
  if (Number(nodes.maxPlayersSelect.value) !== maxPlayers && maxPlayers > 1) nodes.maxPlayersSelect.value = String(maxPlayers);
  setText(nodes.difficultyValue, String(level));
  const locked = state.status === "running" || state.status === "countdown" || !isHost;
  nodes.difficultySelect.disabled = locked;
  nodes.maxPlayersSelect.disabled = locked || state.mode === "solo";
  setText(nodes.difficultyHint, isHost ? difficultyHint(state.settings) : "只有房主可以修改难度。");
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
  if (mode === "game") {
    nodes.settingsPanel.classList.remove("open");
    nodes.helpPanel.classList.remove("open");
  }
}

function challengeLabel(state) {
  if (state.status === "countdown") return `开始 ${Math.ceil(state.countdown)}s`;
  if (state.target) return `目标 ${state.target.remaining.toFixed(1)}s · ${state.score || 0}`;
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
  const score = Number.isFinite(result.score) ? ` · 分数 ${result.score}` : "";
  setText(nodes.resultStats, `${result.elapsed}s · ${result.difficulty}${score}`);
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
  setText(nodes.difficultyValue, String(values.difficulty));
  nodes.maxPlayersSelect.value = values.maxPlayers;
  nodes.roomSizeSelect.value = values.maxPlayers;
  nodes.qualitySelect.value = values.quality;
  nodes.backgroundToggle.checked = values.showBackground;
  nodes.shakeToggle.checked = values.screenShake;
  nodes.soundToggle.checked = values.sound;
  nodes.musicToggle.checked = values.music;
  nodes.volumeSelect.value = values.volume;
  setText(nodes.volumeValue, String(values.volume));
}

function readSettings(nodes) {
  return {
    difficulty: Number(nodes.difficultySelect.value),
    maxPlayers: Number(nodes.maxPlayersSelect.value),
    quality: nodes.qualitySelect.value,
    showBackground: nodes.backgroundToggle.checked,
    screenShake: nodes.shakeToggle.checked,
    sound: nodes.soundToggle.checked,
    music: nodes.musicToggle.checked,
    volume: Number(nodes.volumeSelect.value)
  };
}

function randomRoomId() {
  return `ROOM${Math.floor(1000 + Math.random() * 9000)}`;
}

function setText(node, text) { const value = String(text); if (node.textContent !== value) node.textContent = value; }

function difficultyHint(settings) {
  const speed = settings.speed ? `速度 x${settings.speed}` : "速度随难度提升";
  const max = settings.maxObstacles ? `最多 ${settings.maxObstacles} 个障碍` : "障碍数量随难度提升";
  const zone = settings.challengeDuration ? `区域 ${settings.challengeDuration}s` : "区域时间随难度缩短";
  return `${speed} · ${max} · ${zone}`;
}

function showOnly(nodes, panel) {
  nodes.appRoot.classList.toggle("modal-open", panel !== "none");
  nodes.gameSelectPanel.classList.toggle("hidden", panel !== "game");
  nodes.modeSelectPanel.classList.toggle("hidden", panel !== "mode");
  nodes.joinPanel.classList.toggle("hidden", panel !== "join");
}
