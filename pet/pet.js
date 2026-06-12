const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const dotEl = document.getElementById('bubble-dot');
const dotSymbol = document.getElementById('dot-symbol');
const bubbleText = document.getElementById('bubble-text');
const ctxMenu = document.getElementById('ctx-menu');
const infoText = document.getElementById('info-text');
const expFill = document.getElementById('exp-fill');

canvas.width = 128;
canvas.height = 148;

const FW = 192, FH = 208;

const DEFAULT_STATES = {
  idle:{row:0,frames:6,dur:140,firstMult:2,lastMult:2.3}, wave:{row:1,frames:4,dur:140,firstMult:2,lastMult:2},
  run:{row:2,frames:8,dur:120,firstMult:1.5,lastMult:1.8}, failed:{row:3,frames:8,dur:140,firstMult:1.5,lastMult:1.7},
  review:{row:4,frames:6,dur:150,firstMult:1.5,lastMult:1.8}, jump:{row:5,frames:5,dur:140,firstMult:2,lastMult:2},
  extra1:{row:6,frames:6,dur:140,firstMult:1.5,lastMult:1.8}, extra2:{row:7,frames:6,dur:140,firstMult:1.5,lastMult:1.8},
};

let pets=[],selIdx=0,spritesheet=null,cols=8,stateConfig=null;
let curState='idle',frameIdx=0,frameList=[],animTimer=null,returnTimer=null,debounceTimer=null;
let gameInfo={level:1,title:'—',exp:0,scenario:'大厅',runtime:'0h0m0s',ach:0};
let hasEvent=false,dotExpandTimer=null,dotExpanded=false;
let displayExp=0;

function loadStateCfg(s){
  let c=null;
  if(stateConfig&&stateConfig[s]){const st=stateConfig[s];c={row:st.row||0,frames:st.frames||st.frameCount||6,dur:st.durationMs?st.durationMs/(st.frames||6):140};}
  return c||DEFAULT_STATES[s]||DEFAULT_STATES.idle;
}
function buildFrames(s){
  const c=loadStateCfg(s),n=c.frames,b=c.dur,f=[];
  for(let i=0;i<n;i++){let d=b;if(i===0)d*=c.firstMult||2;else if(i===n-1)d*=c.lastMult||2;f.push({c:i,r:c.row,d});}
  return f;
}
function drawSprite(col,row){if(!spritesheet)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(spritesheet,col*FW,row*FH,FW,FH,0,0,canvas.width,canvas.height);}
function stopAnim(){if(animTimer){clearInterval(animTimer);animTimer=null;}}
function play(s){
  if(s===curState&&animTimer)return;curState=s;stopAnim();
  frameList=buildFrames(s);if(!frameList.length)return;
  frameIdx=0;drawSprite(frameList[0].c,frameList[0].r);
  if(frameList.length===1)return;
  animTimer=setInterval(()=>{frameIdx=(frameIdx+1)%frameList.length;drawSprite(frameList[frameIdx].c,frameList[frameIdx].r);},frameList[frameIdx]?frameList[frameIdx].d:140);
}
function transitionTo(s){
  if(curState===s)return;if(returnTimer){clearTimeout(returnTimer);returnTimer=null;}
  play(s);if(s==='idle')return;
  const totalMs=frameList.reduce((sf,fd)=>sf+fd.d,0);
  returnTimer=setTimeout(()=>{returnTimer=null;if(curState!=='idle')play('idle');},totalMs*1.15);
}
function animToIdle(){if(curState!=='idle')play('idle');}

function calcExpForLevel(lv){if(lv<=1)return 0;return 100*(lv-1)*(lv-1);}

// ── Spritesheet ──
function loadSpritesheet(b64,ext,cfg){
  const img=new Image();
  img.onload=()=>{spritesheet=img;cols=Math.floor(img.width/FW);stateConfig=cfg||null;play('idle');};
  img.onerror=()=>{spritesheet=null;ctx.clearRect(0,0,canvas.width,canvas.height);};
  img.src=`data:image/${ext==='.png'?'png':'webp'};base64,${b64}`;
}
function loadPet(idx){
  if(idx<0||idx>=pets.length){ctx.clearRect(0,0,canvas.width,canvas.height);return;}
  window.pet.invoke('get-pet-spritesheet',{index:idx}).then(r=>{if(r)loadSpritesheet(r.data,r.ext,r.config||null);}).catch(()=>{});
}

// ── Canvas overlay draw ──
function drawOverlay(){
  if(!canvas)return;
  // top info: scenario | Lv.X
  const txt=`${gameInfo.scenario} | Lv.${gameInfo.level}`;
  ctx.save();
  ctx.fillStyle='rgba(0,255,0,0.6)';ctx.font='9px monospace';ctx.textAlign='left';
  ctx.fillText(txt,4,12);
  ctx.restore();
}

// Combined draw: sprite + overlay
function drawFrame(col,row){
  drawSprite(col,row);
  drawOverlay();
}

// ── EXP bar (smoothed) ──
function updateExpBar(){
  const e=gameInfo.exp||0,lv=gameInfo.level||1;
  const nr=calcExpForLevel(lv+1),cr=calcExpForLevel(lv);
  const target=nr>cr?Math.min(100,((e-cr)/(nr-cr))*100):0;
  displayExp+=(target-displayExp)*0.3;
  if(Math.abs(displayExp-target)<0.3)displayExp=target;
  expFill.style.width=`${Math.round(displayExp)}%`;
}

// ── Info bar ──
function updateInfoBar(){
  infoText.textContent=`${gameInfo.scenario} | Lv.${gameInfo.level}`;
  updateExpBar();
}

// ── Dot bubble ──
function showDot(type){
  hasEvent=true;
  if(type==='achievement'){dotSymbol.textContent='★';dotEl.className='dot-achievement';}
  else if(type==='levelup'){dotSymbol.textContent='↑';dotEl.className='dot-levelup';}
  else {dotSymbol.textContent='!';dotEl.className='dot-event';}
  clearTimeout(dotExpandTimer);
  dotExpandTimer=setTimeout(()=>{hasEvent=false;dotEl.className='dot-none';dotSymbol.textContent='○';},8000);
}
function expandDot(text,type){
  if(!text)return;
  dotExpanded=true;
  bubbleText.textContent=text;
  bubbleText.className='';
  if(type==='achievement')bubbleText.style.borderColor='#FFD700';
  else if(type==='levelup')bubbleText.style.borderColor='#00FF00';
  else bubbleText.style.borderColor='#00BFFF';
  dotEl.style.opacity='0';
  clearTimeout(dotExpandTimer);
}
function collapseDot(){
  dotExpanded=false;
  bubbleText.className='hidden';
  dotEl.style.opacity='1';
  if(!hasEvent){dotEl.className='dot-none';dotSymbol.textContent='○';}
}

// ── Drag ──
let dragging=false,mouseOff={x:0,y:0};
canvas.addEventListener('mousedown',e=>{dragging=true;mouseOff.x=e.screenX-(window.screenLeft||0);mouseOff.y=e.screenY-(window.screenTop||0);});
document.addEventListener('mousemove',e=>{if(!dragging)return;window.pet.invoke('pet-drag-move',{x:e.screenX-mouseOff.x,y:e.screenY-mouseOff.y}).catch(()=>{});});
document.addEventListener('mouseup',()=>{if(dragging){dragging=false;window.pet.invoke('pet-drag-end').catch(()=>{});}});

// ── Interactions ──
canvas.addEventListener('mouseenter',()=>{
  tooltip.classList.remove('hidden');updateTooltip();
  if(debounceTimer)clearTimeout(debounceTimer);
  debounceTimer=setTimeout(()=>{transitionTo('review');},300);
});
canvas.addEventListener('mouseleave',()=>{
  tooltip.classList.add('hidden');
  if(debounceTimer){clearTimeout(debounceTimer);debounceTimer=null;}
  setTimeout(()=>{if(curState==='review')animToIdle();},200);
});
canvas.addEventListener('click',e=>{
  if(e.detail===1){
    // left click: toggle main window
    transitionTo('wave');
    window.pet.invoke('toggle-main-window').catch(()=>{});
  }
});
canvas.addEventListener('dblclick',e=>{e.preventDefault();transitionTo('jump');});
canvas.addEventListener('contextmenu',e=>{
  e.preventDefault();ctxMenu.classList.remove('hidden');
  const r=canvas.getBoundingClientRect();
  ctxMenu.style.left=(e.clientX-r.left)+'px';ctxMenu.style.top=(e.clientY-r.top)+'px';
});
document.addEventListener('click',e=>{if(!ctxMenu.contains(e.target))ctxMenu.classList.add('hidden');});

// ── Dot hover expansion ──
dotEl.addEventListener('mouseenter',()=>{
  if(!hasEvent)return;
  // find latest event text from bubble
});
bubbleText.addEventListener('mouseleave',()=>{collapseDot();});

// ── Context menu ──
document.getElementById('ctx-close').addEventListener('click',()=>{ctxMenu.classList.add('hidden');window.pet.invoke('hide-pet-window').catch(()=>{});});
document.getElementById('ctx-prev').addEventListener('click',()=>{ctxMenu.classList.add('hidden');if(pets.length===0)return;selIdx=(selIdx-1+pets.length)%pets.length;window.pet.invoke('select-pet',{index:selIdx}).catch(()=>{});});
document.getElementById('ctx-next').addEventListener('click',()=>{ctxMenu.classList.add('hidden');if(pets.length===0)return;selIdx=(selIdx+1)%pets.length;window.pet.invoke('select-pet',{index:selIdx}).catch(()=>{});});

// ── Tooltip ──
function updateTooltip(){
  const e=gameInfo.exp||0,lv=gameInfo.level||1;
  const nr=calcExpForLevel(lv+1),cr=calcExpForLevel(lv);
  const pct=nr>cr?Math.min(100,((e-cr)/(nr-cr))*100):0;
  tooltip.innerHTML=`<b>Lv.${lv}</b> ${gameInfo.title}<br>${gameInfo.scenario} · ${gameInfo.runtime}<br>成就:${gameInfo.ach} · ${Math.round(pct)}%`;
}

// ── IPC ──
window.pet.on('pet-list',d=>{pets=d.pets||[];selIdx=d.selected||0;loadPet(selIdx);});
window.pet.on('pet-selected',d=>{selIdx=d.index;loadPet(selIdx);});
window.pet.on('game-tick',d=>{
  gameInfo.level=d.level||1;gameInfo.exp=d.total_exp_earned||0;
  if(d.currentTitle)gameInfo.title=d.currentTitle;
  gameInfo.scenario=d.is_in_hub?'大厅':(d.scenario_name||'副本');
  const ms=d.total_runtime_ms||0,s=Math.floor(ms/1000);
  gameInfo.runtime=`${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m${s%60}s`;
  gameInfo.ach=(d.unlockedAchievements||[]).length;
  updateInfoBar();
  if(!tooltip.classList.contains('hidden'))updateTooltip();
});
window.pet.on('event-triggered',d=>{
  transitionTo('wave');showDot('event');
  dotEl.dataset.text=d.text;dotEl.dataset.type='event';
});
window.pet.on('level-up',d=>{
  gameInfo.title=d.title||gameInfo.title;transitionTo('jump');
  showDot('levelup');dotEl.dataset.text=`升级! Lv.${d.level}`;dotEl.dataset.type='levelup';
});
window.pet.on('achievement-unlocked',d=>{
  transitionTo('extra1');showDot('achievement');
  dotEl.dataset.text=`${d.icon||'★'} ${d.name}`;dotEl.dataset.type='achievement';
});

window.pet.invoke('scan-pets').then(r=>{pets=r.pets||[];selIdx=r.selected||0;loadPet(selIdx);}).catch(()=>{});
window.pet.invoke('pet-get-state').then(()=>updateInfoBar()).catch(()=>{});

// EXP bar animation loop
setInterval(updateExpBar, 50);

// Keyboard
document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='h')window.pet.invoke('hide-pet-window').catch(()=>{});});
