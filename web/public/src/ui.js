export function setupUi({ session, onJoin, onReady, onRestart }) {
  const nodes = getNodes();
  let selectedColor = "red";
  let ready = false;

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
      nodes.readyButton.disabled = false;
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
    joinPanel: document.querySelector("#joinPanel"),
    statusText: document.querySelector("#statusText"),
    timerText: document.querySelector("#timerText"),
    challengeText: document.querySelector("#challengeText"),
    playerText: document.querySelector("#playerText"),
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
  const me = state.players.find(player => player.id === playerId);
  if (me) nodes.playerText.textContent = `${me.name} / ${colorName(me.color)}`;
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
