const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const bubble = document.getElementById('bubble');
const ctxMenu = document.getElementById('ctx-menu');

canvas.width = 128;
canvas.height = 148;

// PetDex frame constants
const FW = 192, FH = 208;

// Default state config (PetDex standard)
const DEFAULT_STATES = {
  idle:   { row:0, frames:6, dur:140, firstMult:2, lastMult:2.3 },
  wave:   { row:1, frames:4, dur:140, firstMult:2, lastMult:2   },
  run:    { row:2, frames:8, dur:120, firstMult:1.5,lastMult:1.8},
  failed: { row:3, frames:8, dur:140, firstMult:1.5,lastMult:1.7},
  review: { row:4, frames:6, dur:150, firstMult:1.5,lastMult:1.8},
  jump:   { row:5, frames:5, dur:140, firstMult:2, lastMult:2   },
  extra1: { row:6, frames:6, dur:140, firstMult:1.5,lastMult:1.8},
  extra2: { row:7, frames:6, dur:140, firstMult:1.5,lastMult:1.8},
};
const STATE_KEYS = Object.keys(DEFAULT_STATES);

let pets = [], selIdx = 0, spritesheet = null, cols = 8, stateConfig = null;
let curState = 'idle', frameIdx = 0, frameList = [], animTimer = null, returnTimer = null;
let gameInfo = { level:1, title:'—', exp:0, scenario:'大厅', runtime:'0h0m0s', ach:0 };
let bubbleTimer = null, bubbleExpanded = false;

function loadStateCfg(state) {
  let cfg = null;
  if (stateConfig && stateConfig[state]) {
    const s = stateConfig[state];
    cfg = { row:s.row||0, frames:s.frames||s.frameCount||6, dur:s.durationMs?s.durationMs/(s.frames||6):140 };
  }
  return cfg || DEFAULT_STATES[state] || DEFAULT_STATES.idle;
}

function buildFrames(state) {
  const cfg = loadStateCfg(state);
  const n = cfg.frames;
  const base = cfg.dur;
  const frames = [];
  for (let i = 0; i < n; i++) {
    let d = base;
    if (i === 0) d = base * (cfg.firstMult || 2);
    else if (i === n - 1) d = base * (cfg.lastMult || 2);
    frames.push({ c: i, r: cfg.row, d });
  }
  return frames;
}

function drawFrame(col, row) {
  if (!spritesheet) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(spritesheet, col * FW, row * FH, FW, FH, 0, 0, canvas.width, canvas.height);
}

function stopAnim() { if (animTimer) { clearInterval(animTimer); animTimer = null; } }

function play(state) {
  if (state === curState && animTimer) return;
  curState = state;
  stopAnim();
  frameList = buildFrames(state);
  if (frameList.length === 0) return;
  frameIdx = 0;
  drawFrame(frameList[0].c, frameList[0].r);
  if (frameList.length === 1) return;
  animTimer = setInterval(() => {
    frameIdx = (frameIdx + 1) % frameList.length;
    drawFrame(frameList[frameIdx].c, frameList[frameIdx].r);
  }, frameList[frameIdx] ? frameList[frameIdx].d : 140);
}

function transitionTo(state) {
  if (curState === state) return;
  if (returnTimer) { clearTimeout(returnTimer); returnTimer = null; }
  play(state);
  if (state === 'idle') return;
  // total duration = sum of all frame durations
  const totalMs = frameList.reduce((s,f) => s + f.d, 0);
  returnTimer = setTimeout(() => {
    returnTimer = null;
    if (curState !== 'idle') play('idle');
  }, totalMs * 1.15);
}

function animToIdle() { if (curState !== 'idle') play('idle'); }

// Sprite loading
function loadSpritesheet(base64, ext, cfg) {
  const img = new Image();
  img.onload = () => {
    spritesheet = img;
    cols = Math.floor(img.width / FW);
    stateConfig = cfg || null;
    play('idle');
  };
  img.onerror = () => { spritesheet = null; ctx.clearRect(0,0,canvas.width,canvas.height); };
  img.src = `data:image/${ext==='.png'?'png':'webp'};base64,${base64}`;
}

function loadPet(idx) {
  if (idx < 0 || idx >= pets.length) { ctx.clearRect(0,0,canvas.width,canvas.height); return; }
  const p = pets[idx];
  window.pet.invoke('get-pet-spritesheet',{index:idx}).then(r => {
    if (r) loadSpritesheet(r.data, r.ext, r.config||null);
  }).catch(()=>{});
}

// Tooltip
function updateTooltip() {
  const e = gameInfo.exp||0;
  const nr = calcExpForLevel(gameInfo.level+1), cr = calcExpForLevel(gameInfo.level);
  const pct = nr>cr?Math.min(100,((e-cr)/(nr-cr))*100):0;
  tooltip.innerHTML = `<b>Lv.${gameInfo.level}</b> ${gameInfo.title}<br>${gameInfo.scenario} · ${gameInfo.runtime}<br>成就:${gameInfo.ach} · ${Math.round(pct)}%`;
}

function calcExpForLevel(lv) { if(lv<=1)return 0; return 100*(lv-1)*(lv-1); }

// Bubble
function showBubble(text, type) {
  if (!text) return;
  clearTimeout(bubbleTimer);
  bubbleExpanded = false;
  bubble.textContent = text;
  bubble.className = '';
  bubble.style.borderColor = type==='achievement'?'#FFD700':type==='levelup'?'#00FF00':'#00BFFF';
  bubbleTimer = setTimeout(() => { if (!bubbleExpanded) bubble.className = 'hidden'; }, 6000);
}

// Drag
let dragging = false, mouseOff = {x:0,y:0};
canvas.addEventListener('mousedown', e => {
  dragging = true;
  mouseOff.x = e.screenX - (window.screenLeft || 0);
  mouseOff.y = e.screenY - (window.screenTop || 0);
});
document.addEventListener('mousemove', e => {
  if (!dragging) return;
  window.pet.invoke('pet-drag-move',{x:e.screenX-mouseOff.x, y:e.screenY-mouseOff.y}).catch(()=>{});
});
document.addEventListener('mouseup', () => {
  if (dragging) { dragging = false; window.pet.invoke('pet-drag-end').catch(()=>{}); }
});

// Canvas interactions
canvas.addEventListener('mouseenter', () => {
  tooltip.classList.remove('hidden');
  updateTooltip();
  transitionTo('review');
});
canvas.addEventListener('mouseleave', () => {
  tooltip.classList.add('hidden');
  setTimeout(() => { if (curState==='review') animToIdle(); }, 200);
});
canvas.addEventListener('click', e => { if (e.detail === 1) transitionTo('wave'); });
canvas.addEventListener('dblclick', e => { e.preventDefault(); transitionTo('jump'); });
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  ctxMenu.classList.remove('hidden');
  const r = canvas.getBoundingClientRect();
  ctxMenu.style.left = (e.clientX - r.left) + 'px';
  ctxMenu.style.top = (e.clientY - r.top) + 'px';
});
document.addEventListener('click', e => { if (!ctxMenu.contains(e.target)) ctxMenu.classList.add('hidden'); });

// Bubble hover expand
bubble.addEventListener('mouseenter', () => {
  bubbleExpanded = true;
  bubble.style.maxWidth = '240px';
  bubble.style.display = 'block';
  bubble.style.webkitLineClamp = 'unset';
  bubble.style.overflow = 'visible';
});
bubble.addEventListener('mouseleave', () => {
  bubbleExpanded = false;
  bubble.style.maxWidth = '160px';
  bubble.style.display = '-webkit-box';
  bubble.style.webkitLineClamp = '3';
  bubble.style.overflow = 'hidden';
});

// Context menu actions
document.getElementById('ctx-close').addEventListener('click', () => {
  ctxMenu.classList.add('hidden');
  window.pet.invoke('hide-pet-window').catch(()=>{});
});
document.getElementById('ctx-prev').addEventListener('click', () => {
  ctxMenu.classList.add('hidden');
  if (pets.length===0) return;
  selIdx = (selIdx-1+pets.length)%pets.length;
  window.pet.invoke('select-pet',{index:selIdx}).catch(()=>{});
});
document.getElementById('ctx-next').addEventListener('click', () => {
  ctxMenu.classList.add('hidden');
  if (pets.length===0) return;
  selIdx = (selIdx+1)%pets.length;
  window.pet.invoke('select-pet',{index:selIdx}).catch(()=>{});
});

// IPC
window.pet.on('pet-list', d => { pets=d.pets||[]; selIdx=d.selected||0; loadPet(selIdx); });
window.pet.on('pet-selected', d => { selIdx=d.index; loadPet(selIdx); });
window.pet.on('game-tick', d => {
  gameInfo.level = d.level||1;
  gameInfo.exp = d.total_exp_earned||0;
  if (d.currentTitle) gameInfo.title = d.currentTitle;
  gameInfo.scenario = d.is_in_hub ? '大厅' : (d.scenario_name||'副本');
  const ms = d.total_runtime_ms||0, s=Math.floor(ms/1000);
  gameInfo.runtime = `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m${s%60}s`;
  gameInfo.ach = (d.unlockedAchievements||[]).length;
  if (!tooltip.classList.contains('hidden')) updateTooltip();
});
window.pet.on('event-triggered', d => { transitionTo('wave'); showBubble(d.text,'event'); });
window.pet.on('level-up', d => { gameInfo.title = d.title||gameInfo.title; transitionTo('jump'); showBubble(`升级! Lv.${d.level}`,'levelup'); });
window.pet.on('achievement-unlocked', d => { transitionTo('extra1'); showBubble(`${d.icon||'★'} ${d.name}`,'achievement'); });

window.pet.invoke('scan-pets').then(r => { pets=r.pets||[]; selIdx=r.selected||0; loadPet(selIdx); }).catch(()=>{});
window.pet.invoke('pet-get-state').then(()=>updateTooltip()).catch(()=>{});

// Keyboard: H/Esc to hide
document.addEventListener('keydown', e => {
  if (e.key==='Escape'||e.key==='h') window.pet.invoke('hide-pet-window').catch(()=>{});
});
