const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');

const petNameEl = document.getElementById('pet-name');
const infoLevel = document.getElementById('info-level');
const infoTitle = document.getElementById('info-title');
const expFill = document.getElementById('exp-bar-fill');
const petSelectName = document.getElementById('pet-select-name');

canvas.width = 128;
canvas.height = 148;

const FRAME_W = 192;
const FRAME_H = 208;
const ANIM_INTERVAL = 180;

let pets = [];
let selectedIndex = 0;
let spritesheet = null;
let currentFrame = 0;
let animTimer = null;
let animDir = 1;

let gameState = {
  playerName: 'Worker',
  level: 1,
  title: '—',
  totalExpEarned: 0,
};

function calcLevel(exp) { return exp <= 0 ? 1 : Math.floor(Math.sqrt(exp / 100)) + 1; }
function calcExpForLevel(level) { if (level <= 1) return 0; return 100 * (level - 1) * (level - 1); }

function drawFrame(frameIndex) {
  if (!spritesheet) return;
  const cols = Math.floor(spritesheet.width / FRAME_W);
  const row = Math.floor(frameIndex / cols);
  const col = frameIndex % cols;
  const sx = col * FRAME_W;
  const sy = row * FRAME_H;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(spritesheet, sx, sy, FRAME_W, FRAME_H, 0, 0, canvas.width, canvas.height);
}

function startAnimation() {
  if (animTimer) clearInterval(animTimer);
  currentFrame = 0;
  animDir = 1;
  animTimer = setInterval(() => {
    if (!spritesheet) return;
    const cols = Math.floor(spritesheet.width / FRAME_W);
    const totalFrames = cols * 2;
    drawFrame(currentFrame);
    currentFrame += animDir;
    if (currentFrame >= totalFrames) { currentFrame = totalFrames - 1; animDir = -1; }
    if (currentFrame < 0) { currentFrame = 0; animDir = 1; }
  }, ANIM_INTERVAL);
}

function loadSpritesheet(dataBase64, ext) {
  const img = new Image();
  img.onload = () => {
    spritesheet = img;
    drawFrame(0);
    startAnimation();
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
    petSelectName.textContent = '—';
    return;
  }
  const pet = pets[index];
  petNameEl.textContent = pet.name;
  petSelectName.textContent = pet.name;
  window.pet.invoke('get-pet-spritesheet', { index }).then(r => {
    if (r) loadSpritesheet(r.data, r.ext);
  }).catch(() => {});
}

function updateGameInfo() {
  infoLevel.textContent = `Lv.${gameState.level}`;
  infoTitle.textContent = gameState.title || '—';
  const t = gameState.totalExpEarned || 0;
  const nr = calcExpForLevel(gameState.level + 1);
  const cr = calcExpForLevel(gameState.level);
  const pct = nr > cr ? Math.min(100, ((t - cr) / (nr - cr)) * 100) : 0;
  expFill.style.width = `${Math.round(pct)}%`;
}

// ── IPC / Events ──

window.pet.on('pet-list', (data) => {
  pets = data.pets || [];
  selectedIndex = data.selected || 0;
  loadPet(selectedIndex);
});

window.pet.on('pet-selected', (data) => {
  selectedIndex = data.index;
  loadPet(selectedIndex);
});

window.pet.on('game-tick', (data) => {
  gameState.level = data.level || 1;
  gameState.totalExpEarned = data.total_exp_earned || 0;
  gameState.playerName = data.player_name || 'Worker';
  if (data.currentTitle) gameState.title = data.currentTitle;
  updateGameInfo();
});

window.pet.invoke('scan-pets').then(r => {
  pets = r.pets || [];
  selectedIndex = r.selected || 0;
  loadPet(selectedIndex);
}).catch(() => {});

window.pet.invoke('pet-get-state').then(() => updateGameInfo()).catch(() => {});

// ── Drag ──

let isDragging = false;
let dragOffset = { x: 0, y: 0 };

document.getElementById('title-bar').addEventListener('mousedown', (e) => {
  isDragging = true;
  dragOffset = { x: e.screenX, y: e.screenY };
  window.pet.invoke('pet-drag-start', { offsetX: e.offsetX, offsetY: e.offsetY }).catch(() => {});
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  window.pet.invoke('pet-drag-move', { screenX: e.screenX, screenY: e.screenY }).catch(() => {});
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    window.pet.invoke('pet-drag-end').catch(() => {});
  }
});

// ── Buttons ──

const btnExpand = document.getElementById('btn-expand');
const btnClose = document.getElementById('btn-close');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

btnExpand.addEventListener('click', () => {
  window.pet.invoke('exit-pet-mode').catch(() => {});
});

btnClose.addEventListener('click', () => {
  window.pet.invoke('exit-pet-mode').catch(() => {});
});

btnPrev.addEventListener('click', () => {
  if (pets.length === 0) return;
  selectedIndex = (selectedIndex - 1 + pets.length) % pets.length;
  window.pet.invoke('select-pet', { index: selectedIndex }).catch(() => {});
});

btnNext.addEventListener('click', () => {
  if (pets.length === 0) return;
  selectedIndex = (selectedIndex + 1) % pets.length;
  window.pet.invoke('select-pet', { index: selectedIndex }).catch(() => {});
});
