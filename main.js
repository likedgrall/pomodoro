const timeElement = document.querySelector("#time");
const modeNameElement = document.querySelector("#modeName");
const startBtn = document.querySelector("#startBtn");
const resetBtn = document.querySelector("#resetBtn");
const modesElement = document.querySelector(".modes");
const modeButtons = document.querySelectorAll(".mode-btn");
const restSuggestion = document.querySelector("#restSuggestion");
const startRestBtn = document.querySelector("#startRestBtn");
const skipRestBtn = document.querySelector("#skipRestBtn");
const modeConfirm = document.querySelector("#modeConfirm");
const modeConfirmTitle = document.querySelector("#modeConfirmTitle");
const confirmModeSwitchBtn = document.querySelector("#confirmModeSwitchBtn");
const cancelModeSwitchBtn = document.querySelector("#cancelModeSwitchBtn");
const revealElements = document.querySelectorAll(".reveal");
const timerStatus = document.querySelector("#timerStatus");
const timerStatusLabel = document.querySelector("#timerStatusLabel");
const timerStatusText = document.querySelector("#timerStatusText");

const modes = {
  focus: {
    name: "Фокус",
    minutes: 25
  },
  short: {
    name: "Короткий отдых",
    minutes: 5
  },
  long: {
    name: "Длинный отдых",
    minutes: 15
  }
};

let currentMode = "focus";
const savedSecondsByMode = {
  focus: modes.focus.minutes * 60,
  short: modes.short.minutes * 60,
  long: modes.long.minutes * 60
};

let totalSeconds = modes[currentMode].minutes * 60;
let secondsLeft = savedSecondsByMode[currentMode];
let timerInterval = null;
let isRunning = false;
let audioContext = null;
let pendingMode = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function prepareAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playFinishSound() {
  if (!audioContext) return;

  const notes = [523.25, 659.25, 783.99];
  const now = audioContext.currentTime;

  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = now + index * 0.16;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.6);
  });
}

function updateScreen() {
  timeElement.textContent = formatTime(secondsLeft);
  modeNameElement.textContent = modes[currentMode].name;
}

function getModeTotalSeconds(mode) {
  return modes[mode].minutes * 60;
}

function saveCurrentTime() {
  savedSecondsByMode[currentMode] = secondsLeft;
}

function setTimerState(running) {
  timerStatus.classList.toggle("active", running);
  timerStatusLabel.textContent = running ? "Идет таймер" : "Состояние";
  timerStatusText.textContent = running ? modes[currentMode].name : "Готов";
}

function hideRestSuggestion() {
  restSuggestion.classList.add("hidden");
}

function showRestSuggestion() {
  restSuggestion.classList.remove("hidden");
}

function getModeType(mode) {
  return mode === "focus" ? "focus" : "rest";
}

function getConfirmQuestion(mode) {
  if (mode === "focus") {
    return "Вы действительно хотите перейти в режим фокуса?";
  }

  return "Вы действительно хотите перейти в режим отдыха?";
}

function showModeConfirm(mode) {
  pendingMode = mode;
  modeConfirmTitle.textContent = getConfirmQuestion(mode);
  modeConfirm.classList.remove("hidden");
}

function hideModeConfirm() {
  pendingMode = null;
  modeConfirm.classList.add("hidden");
}

function updateModeButtons(mode) {
  modesElement.dataset.active = mode;

  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function finishTimer() {
  clearInterval(timerInterval);
  secondsLeft = 0;
  saveCurrentTime();
  isRunning = false;
  startBtn.textContent = "Старт";
  setTimerState(false);
  playFinishSound();
  updateScreen();

  if (currentMode === "focus") {
    showRestSuggestion();
  }
}

function startTimer() {
  if (isRunning) return;

  prepareAudio();
  hideRestSuggestion();
  isRunning = true;
  startBtn.textContent = "Пауза";
  setTimerState(true);

  timerInterval = setInterval(() => {
    secondsLeft--;
    saveCurrentTime();

    if (secondsLeft <= 0) {
      finishTimer();
      return;
    }

    updateScreen();
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  saveCurrentTime();
  startBtn.textContent = "Старт";
  setTimerState(false);
}

function resetTimer() {
  pauseTimer();
  hideRestSuggestion();
  hideModeConfirm();
  totalSeconds = getModeTotalSeconds(currentMode);
  secondsLeft = totalSeconds;
  saveCurrentTime();
  updateScreen();
}

function applyMode(mode) {
  saveCurrentTime();
  currentMode = mode;
  updateModeButtons(mode);
  totalSeconds = getModeTotalSeconds(currentMode);
  secondsLeft = savedSecondsByMode[currentMode];
  updateScreen();
}

function changeMode(mode, shouldKeepRunning = false) {
  if (mode === currentMode) return;

  const wasRunning = shouldKeepRunning && isRunning;

  if (wasRunning) {
    clearInterval(timerInterval);
    isRunning = false;
    saveCurrentTime();
  }

  hideRestSuggestion();
  hideModeConfirm();
  applyMode(mode);

  if (wasRunning) {
    startTimer();
  } else {
    pauseTimer();
  }
}

startBtn.addEventListener("click", () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener("click", resetTimer);
skipRestBtn.addEventListener("click", hideRestSuggestion);
cancelModeSwitchBtn.addEventListener("click", hideModeConfirm);
confirmModeSwitchBtn.addEventListener("click", () => {
  if (!pendingMode) return;

  changeMode(pendingMode, true);
});

startRestBtn.addEventListener("click", () => {
  changeMode("short");
  startTimer();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.mode;

    if (isRunning && getModeType(nextMode) !== getModeType(currentMode)) {
      showModeConfirm(nextMode);
      return;
    }

    changeMode(nextMode, isRunning);
  });
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    {
      threshold: 0.25
    }
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
} else {
  revealElements.forEach((element) => {
    element.classList.add("visible");
  });
}

updateScreen();
updateModeButtons(currentMode);
setTimerState(false);
