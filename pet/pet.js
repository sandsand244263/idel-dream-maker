const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');

const petNameEl = document.getElementById('pet-name');
const tooltipEl = document.getElementById('tooltip');
const bubbleEl = document.getElementById('bubble');
const ctxMenu = document.getElementById('ctx-menu');

canvas.width = 128;
canvas.height = 148;

// ── PetDex frame constants ──
const FRAME_W = 192;
const FRAME_H = 208;

// ── State machine ──
const STATE = {
  IDLE: 'idle',
  WAVE: 'wave',
  RUN: 'run',
  FAILED: 'failed',
  REVIEW: 'review',
  JUMP: 'jump',
  EXTRA1: 'extra1',
  EXTRA2: 'extra2',
};

// Default config if pet.json has no states
const DEFAULT_STATES = {
  idle: { row: 0, frames: 8, durationMs: 1100 },
  wave: { row: 1, frames: 8, durationMs: 900 },
  run: { row: 2, frames: 8, durationMs: 800 },
  failed: { row: 3, frames: 8, durationMs: 1200 },
  review: { row: 4, frames: 8, durationMs: 1100 },
  jump: { row: 5, frames: 8, durationMs: 600 },
  extra1: { row: 6, frames: 8, durationMs: 1000 },
  extra2: { row: 7, frames: 8, durationMs: 1000 },
};

let pets = [];
let selectedIndex = 0;
let spritesheet = null;
let petConfig = null; // parsed states from pet.json

let currentState = STATE.IDLE;
let currentFrame = 0;
let animTimer = null;
let cols = 8;

let gameState = {
  playerName: 'Worker', level: 1, title: '—', totalExpEarned: 0,
  scenarioName: '大厅', runtimeStr: '0h0m0s', achievements: 0,
};

// ── Helpers ──
function calcLevel(exp) { return exp <= 0 ? 1 : Math.floor(Math.sqrt(exp / 100)) + 1; }
function calcExpForLevel(lv) { if (lv <= 1) return 0; return 100 * (lv - 1) * (lv - 1); }
function fmtRuntime(ms) { const s = Math.floor(ms / 1000); return `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m${s%60}s`; }

function getStateCfg(state) {
  if (petConfig && petConfig[state]) return petConfig[state];
  return DEFAULT_STATES[state] || DEFAULT_STATES.idle;
}

function getStateRowFrames(state) {
  const cfg = getStateCfg(state);
  return { row: cfg.row, frames: cfg.frames || 8, durationMs: cfg.durationMs || 1100 };
}

function drawFrame(row, col) {
  if (!spritesheet) return;
  const sx = col * FRAME_W;
  const sy = row * FRAME_H;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(spritesheet, sx, sy, FRAME_W, FRAME_H, 0, 0, canvas.width, canvas.height);
}

function startAnimation(state) {
  if (animTimer) { clearInterval(animTimer); animTimer = null; }
  currentState = state;
  const { row, frames, durationMs } = getStateRowFrames(state);
  const frameInterval = Math.max(50, durationMs / frames);
  currentFrame = 0;
  drawFrame(row, 0);
  animTimer = setInterval(() => {
    currentFrame = (currentFrame + 1) % frames;
    drawFrame(row, currentFrame);
  }, frameInterval);
}

function transitionTo(state) {
  if (currentState === state) return;
  startAnimation(state);
  // Auto-return to idle after non-idle states
  if (state !== STATE.IDLE) {
    setTimeout(() => { startAnimation(STATE.IDLE); }, getStateCfg(state).durationMs * 1.5 || 1500);
  }
}

// ── Spritesheet loading ──
function loadSpritesheet(dataBase64, ext, config) {
  const img = new Image();
  img.onload = () => {
    spritesheet = img;
    cols = Math.floor(img.width / FRAME_W);
    petConfig = config || null;
    startAnimation(STATE.IDLE);
  };
  img.onerror = () => {
    spritesheet = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,255,0,0.2)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('no sprite', canvas.width / 2, canvas.height / 2);
  };
  img.src = `data:image/${ext === '.png' ? 'png' : 'webp'};base64,${dataBase64}`;
}

function loadPet(index) {
  if (index < 0 || index >= pets.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,255,0,0.2)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('no pet', canvas.width / 2, canvas.height / 2);
    petNameEl.textContent = '—';
    return;
  }
  const pet = pets[index];
  petNameEl.textContent = pet.name;
  window.pet.invoke('get-pet-spritesheet', { index }).then(r => {
    if (r) loadSpritesheet(r.data, r.ext, pet.config || null);
  }).catch(() => {});
}

// ── UI updates ──
function updateGameInfo() {
  const t = gameState.totalExpEarned || 0;
  const nr = calcExpForLevel(gameState.level + 1);
  const cr = calcExpForLevel(gameState.level);
  const pct = nr > cr ? Math.min(100, ((t - cr) / (nr - cr)) * 100) : 0;
  tooltipEl.innerHTML =
    `<b>Lv.${gameState.level}</b> ${gameState.title || '—'}<br>` +
    `${gameState.scenarioName} · ${gameState.runtimeStr}<br>` +
    `成就:${gameState.achievements} · ${Math.round(pct)}%`;
}

function showBubble(text, type) {
  if (!text) return;
  bubbleEl.textContent = text;
  bubbleEl.className = 'bubble-show';
  bubbleEl.style.borderColor = type === 'achievement' ? '#FFD700' : type === 'levelup' ? '#00FF00' : '#00BFFF';
  setTimeout(() => { bubbleEl.className = 'bubble-hide'; }, 6000);
  setTimeout(() => { bubbleEl.className = 'bubble-hidden'; }, 7500);
}

// ── IPC ──
window.pet.on('pet-list', (data) => {
  pets = data.pets || [];
  selectedIndex = data.selected || 0;
  loadPet(selectedIndex);
});
window.pet.on('pet-selected', (data) => { selectedIndex = data.index; loadPet(selectedIndex); });
window.pet.on('game-tick', (data) => {
  gameState.level = data.level || 1;
  gameState.totalExpEarned = data.total_exp_earned || 0;
  gameState.playerName = data.player_name || 'Worker';
  if (data.currentTitle) gameState.title = data.currentTitle;
  gameState.runtimeStr = fmtRuntime(data.total_runtime_ms || 0);
  gameState.achievements = (data.unlockedAchievements || []).length;
  gameState.scenarioName = data.is_in_hub ? '大厅' : (data.scenario_name || '副本');
  updateGameInfo();
});
window.pet.on('event-triggered', (data) => {
  transitionTo(STATE.WAVE);
  showBubble(data.text, 'event');
});
window.pet.on('level-up', (data) => {
  gameState.title = data.title || gameState.title;
  transitionTo(STATE.JUMP);
  showBubble(`升级! Lv.${data.level}`, 'levelup');
});
window.pet.on('achievement-unlocked', (data) => {
  transitionTo(STATE.EXTRA1);
  showBubble(`${data.icon} ${data.name}`, 'achievement');
});

window.pet.invoke('scan-pets').then(r => {
  pets = r.pets || []; selectedIndex = r.selected || 0; loadPet(selectedIndex);
}).catch(() => {});
window.pet.invoke('pet-get-state').then(() => updateGameInfo()).catch(() => {});

// ── Drag ──
let isDragging = false;
document.getElementById('title-bar').addEventListener('mousedown', (e) => {
  isDragging = true;
  window.pet.invoke('pet-drag-start', { offsetX: e.offsetX, offsetY: e.offsetY }).catch(() => {});
});
document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  window.pet.invoke('pet-drag-move', { screenX: e.screenX, screenY: e.screenY }).catch(() => {});
});
document.addEventListener('mouseup', () => {
  if (isDragging) { isDragging = false; window.pet.invoke('pet-drag-end').catch(() => {}); }
});

// ── Canvas interactions ──
// Hover → tooltip + review state
canvas.addEventListener('mouseenter', () => {
  tooltipEl.classList.remove('tooltip-hidden');
  transitionTo(STATE.REVIEW);
});
canvas.addEventListener('mouseleave', () => {
  tooltipEl.classList.add('tooltip-hidden');
  setTimeout(() => { if (currentState === STATE.REVIEW) startAnimation(STATE.IDLE); }, 300);
});

// Click → wave
canvas.addEventListener('click', (e) => {
  if (e.detail === 1) transitionTo(STATE.WAVE);
});

// Double-click → jump
canvas.addEventListener('dblclick', (e) => {
  e.preventDefault();
  transitionTo(STATE.JUMP);
});

// Right-click → context menu
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ctxMenu.style.display = 'block';
  ctxMenu.style.left = e.offsetX + 'px';
  ctxMenu.style.top = e.offsetY + 'px';
});
document.addEventListener('click', (e) => {
  if (!ctxMenu.contains(e.target)) ctxMenu.style.display = 'none';
});

// ── Context menu actions ──
document.getElementById('ctx-close').addEventListener('click', () => {
  ctxMenu.style.display = 'none';
  window.pet.invoke('hide-pet-window').catch(() => {});
});
document.getElementById('ctx-prev').addEventListener('click', () => {
  ctxMenu.style.display = 'none';
  if (pets.length === 0) return;
  selectedIndex = (selectedIndex - 1 + pets.length) % pets.length;
  window.pet.invoke('select-pet', { index: selectedIndex }).catch(() => {});
});
document.getElementById('ctx-next').addEventListener('click', () => {
  ctxMenu.style.display = 'none';
  if (pets.length === 0) return;
  selectedIndex = (selectedIndex + 1) % pets.length;
  window.pet.invoke('select-pet', { index: selectedIndex }).catch(() => {});
});

// ── Top bar buttons ──
document.getElementById('btn-close').addEventListener('click', () => {
  window.pet.invoke('hide-pet-window').catch(() => {});
});
document.getElementById('btn-prev').addEventListener('click', () => {
  if (pets.length === 0) return;
  selectedIndex = (selectedIndex - 1 + pets.length) % pets.length;
  window.pet.invoke('select-pet', { index: selectedIndex }).catch(() => {});
});
document.getElementById('btn-next').addEventListener('click', () => {
  if (pets.length === 0) return;
  selectedIndex = (selectedIndex + 1) % pets.length;
  window.pet.invoke('select-pet', { index: selectedIndex }).catch(() => {});
});

// ── Keyboard ──
// Press H to hide pet window
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'h') {
    window.pet.invoke('hide-pet-window').catch(() => {});
  }
});
