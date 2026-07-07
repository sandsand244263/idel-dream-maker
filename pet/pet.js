const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const dotEl = document.getElementById('bubble-dot');
const dotSymbol = document.getElementById('dot-symbol');
const infoText = document.getElementById('info-text');
const expFill = document.getElementById('exp-fill');
const expWrap = document.getElementById('exp-wrap');
const expPct = document.getElementById('exp-pct');
const expDetail = document.getElementById('exp-detail');
const keyDetail = document.getElementById('key-detail');
const buffBadge = document.getElementById('buff-badge');
const guidePanel = document.getElementById('no-pet-guide');
const guideOpenFolder = document.getElementById('guide-open-folder');
const guidePetdex = document.getElementById('guide-petdex');
const canvasWrap = document.getElementById('canvas-wrap');

canvas.width = 120;
canvas.height = 140;
canvas.style.width = '120px';
canvas.style.height = '140px';

let FW = 192, FH = 208;

const DEFAULT_STATES = {
  idle:{row:0,frames:6,dur:140,firstMult:2,lastMult:2.3}, wave:{row:1,frames:4,dur:140,firstMult:2,lastMult:2},
  run:{row:2,frames:8,dur:120,firstMult:1.5,lastMult:1.8}, failed:{row:3,frames:8,dur:140,firstMult:1.5,lastMult:1.7},
  review:{row:4,frames:6,dur:150,firstMult:1.5,lastMult:1.8}, jump:{row:5,frames:5,dur:140,firstMult:2,lastMult:2},
  extra1:{row:6,frames:6,dur:140,firstMult:1.5,lastMult:1.8}, extra2:{row:7,frames:6,dur:140,firstMult:1.5,lastMult:1.8},
  extra3:{row:8,frames:6,dur:140,firstMult:1.5,lastMult:1.8},
};

let pets=[],selIdx=0,spritesheet=null,cols=8,rows=9,stateConfig=null;
let curState='idle',frameIdx=0,frameList=[],animFrameId=null,lastFrameTime=0,returnTimer=null,debounceTimer=null;
let gameInfo={level:1,title:'—',exp:0,scenario:'大厅',runtime:'0h0m0s',ach:0,theme:'green',hubLevel:1,isInHub:true,totalKeyPresses:0,dailyKeyPresses:0};
let displayExp=0,dragMoved=false,displayExpFull=0;

// ── Guide Panel ──
function showGuidePanel() {
  guidePanel.classList.remove('hidden');
}
function hideGuidePanel() {
  guidePanel.classList.add('hidden');
}

// ── First-Pet Tutorial ──
const PET_TUTORIAL_KEY = 'pet_has_seen_tutorial';
const TUTORIAL_TIPS = [
  '单击宠物 → 互动动画',
  '双击宠物 → 切换主窗口',
  '右键宠物 → 菜单（换宠/设置）',
];
function showPetTutorial() {
  if (localStorage.getItem(PET_TUTORIAL_KEY) === 'true') return;
  localStorage.setItem(PET_TUTORIAL_KEY, 'true');
  TUTORIAL_TIPS.forEach((tip, i) => {
    setTimeout(() => {
      nq.enqueue({ text: tip, title: '操作提示', type: 'event' }, 1);
    }, 2000 + i * 4000);
  });
}

// ── Notification Queue ──
class NotificationQueue{
  constructor(){this.q=[];this.current=null;}
  enqueue(item,priority){
    item.prio=priority;
    let i=0;while(i<this.q.length&&this.q[i].prio>=priority)i++;
    this.q.splice(i,0,item);
    if(!this.current)this.next();
  }
  next(){
    if(this.q.length===0){this.current=null;dotEl.className='dot-none';dotSymbol.textContent='○';return;}
    this.current=this.q.shift();
    this.showDotOnly();
  }
  showDotOnly(){
    if(this.current.type==='achievement'){dotSymbol.textContent='★';dotEl.className='dot-achievement';}
    else if(this.current.type==='levelup'){dotSymbol.textContent='↑';dotEl.className='dot-levelup';}
    else if(this.current.type==='chime'){dotSymbol.textContent='🕐';dotEl.className='dot-chime';}
    else if(this.current.type==='choice'){dotSymbol.textContent='?';dotEl.className='dot-event';}
    else{dotSymbol.textContent='!';dotEl.className='dot-event';}
    dotEl.dataset.text=this.current.text;
    dotEl.dataset.title=this.current.title||'';
    dotEl.dataset.type=this.current.type;
  }
  showBubble(){
    if(!this.current)return;
    const isChoice = this.current.type === 'choice';
    window.pet.invoke('show-bubble', {
      title: this.current.title || '事件',
      text: this.current.text,
      color: isChoice ? '#FF9E64' : this.current.type === 'achievement' ? '#FFD700' : this.current.type === 'levelup' ? '#00FF00' : '#00BFFF',
      type: this.current.type,
      choices: isChoice ? (this.current.choices || []) : undefined,
      _eventId: isChoice ? (this.current._eventId || null) : undefined,
    }).catch(() => {});
    dotEl.className = 'dot-none';
    dotSymbol.textContent = '○';
    // Choice bubbles keep the choice dot until resolved
    if (isChoice && this.current) { this.showDotOnly(); }
  }
  hideBubble(){
    // 不发 close-bubble：只重置 dot 状态（避免 close→bubble-closed→close 无限循环）
    dotEl.className = 'dot-none';
    dotSymbol.textContent = '○';
  }
  close(){
    dotEl.className = 'dot-none';
    dotSymbol.textContent = '○';
    if(this._chimeShowing){
      this._chimeShowing=false;
      if(this.current){this.showDotOnly();return;}
    }
    this.next();
  }
  clearQueue(){
    window.pet.invoke('close-bubble').catch(() => {});
    this.q=[];
    this.current=null;
    dotEl.className = 'dot-none';
    dotSymbol.textContent = '○';
  }
}
const nq=new NotificationQueue();

let chimeTimer=null;
function showChimeBubble(text){
  nq._chimeShowing=true;
  window.pet.invoke('show-bubble', {
    title: '报时',
    text: text,
    color: '#FF9E64',
    type: 'chime',
  }).catch(() => {});
  if(chimeTimer) clearTimeout(chimeTimer);
  chimeTimer = setTimeout(() => {
    window.pet.invoke('close-bubble').catch(() => {});
    chimeTimer = null;
  }, 6000);
}

function loadStateCfg(s){
  let c=null;
  if(stateConfig&&stateConfig[s]){const st=stateConfig[s];c={row:st.row||0,frames:st.frames||st.frameCount||6,dur:st.durationMs?st.durationMs/(st.frames||6):140};}
  return c||DEFAULT_STATES[s]||DEFAULT_STATES.idle;
}
function buildFrames(s){
  const c=loadStateCfg(s);
  let n=c.frames;
  // Auto-detect actual frame count from spritesheet if available
  if(spritesheet&&spritesheet._rowFrames){
    const rd=spritesheet._rowFrames[c.row];
    if(rd&&rd<n)n=rd;
  }
  const b=c.dur,f=[];
  for(let i=0;i<n;i++){let d=b;if(i===0)d*=c.firstMult||2;else if(i===n-1)d*=c.lastMult||2;f.push({c:i,r:c.row,d});}
  return f;
}
function drawSprite(col,row){if(!spritesheet)return;ctx.clearRect(0,0,120,140);ctx.drawImage(spritesheet,col*FW,row*FH,FW,FH,0,0,120,140);drawCombo();}
function stopAnim(){if(animFrameId){cancelAnimationFrame(animFrameId);animFrameId=null;}}
function animLoop(now){
  if(!animFrameId)return;
  const elapsed=now-lastFrameTime;
  const dur=frameList[frameIdx]?frameList[frameIdx].d:140;
  if(elapsed>=dur){
    frameIdx=(frameIdx+1)%frameList.length;
    lastFrameTime=now;
  }
  drawSprite(frameList[frameIdx].c,frameList[frameIdx].r);
  animFrameId=requestAnimationFrame(animLoop);
}
function play(s){
  if(s===curState&&animFrameId)return;curState=s;stopAnim();
  frameList=buildFrames(s);if(!frameList.length)return;
  frameIdx=0;drawSprite(frameList[0].c,frameList[0].r);
  if(frameList.length===1)return;
  lastFrameTime=performance.now();
  animFrameId=requestAnimationFrame(animLoop);
}
function transitionTo(s){
  if(curState===s)return;if(returnTimer){clearTimeout(returnTimer);returnTimer=null;}
  play(s);if(s==='idle')return;
  const totalMs=frameList.reduce((sf,fd)=>sf+fd.d,0);
  returnTimer=setTimeout(()=>{returnTimer=null;if(curState!=='idle')play('idle');},Math.max(0,totalMs-50));
}
function animToIdle(){if(curState!=='idle')play('idle');}

function calcExpForLevel(lv){if(lv<=1)return 0;if(lv<=100)return 100*(lv-1)*(lv-1);const n=lv-100;return 980100+n*(2*4000+(n-1)*10)/2;}

function loadSpritesheet(b64,ext,cfg){
  if(!b64||b64.length<100)return;
  const img=new Image();
  img.onload=()=>{
    const iw=img.naturalWidth,ih=img.naturalHeight;
    // Clean semi-transparent edge pixels (alpha<24 → fully transparent)
    const oc=document.createElement('canvas');
    oc.width=iw; oc.height=ih;
    const octx=oc.getContext('2d');
    octx.drawImage(img,0,0);
    const d=octx.getImageData(0,0,iw,ih);
    for(let i=3;i<d.data.length;i+=4){const a=d.data[i];if(a>0&&a<24)d.data[i]=0;}
    octx.putImageData(d,0,0);
    spritesheet=oc;
    if(iw%192===0&&ih%208===0){FW=192;FH=208;}
    else if(iw%128===0&&ih%128===0){FW=128;FH=128;}
    else if(iw%64===0&&ih%64===0){FW=64;FH=64;}
    else{FW=192;FH=208;}
    cols=Math.floor(iw/FW);rows=Math.floor(ih/FH);
    // Auto-detect frame count per row (check center region of each cell for non-transparent pixels)
    const pix=d.data;
    const cy=Math.floor(FH/2),cx=Math.floor(FW/2);
    for(let r=0;r<rows;r++){
      let last=-1;
      for(let c=cols-1;c>=0;c--){
        let has=false;
        for(let y=cy-4;y<cy+4&&!has;y++){
          for(let x=cx-4;x<cx+4&&!has;x++){
            const idx=((r*FH+y)*iw+(c*FW+x))*4+3;
            if(idx<pix.length&&pix[idx]>0)has=true;
          }
        }
        if(has){last=c;break;}
      }
      oc._rowFrames=oc._rowFrames||[];oc._rowFrames[r]=last+1;
    }
    stateConfig=cfg||null;
    play('idle');
  };
  img.onerror=()=>{spritesheet=null;};
  img.src=`data:image/${ext==='.png'?'png':'webp'};base64,${b64}`;
}
function loadPet(idx){
  if(idx<0||idx>=pets.length){
    spritesheet=null;
    showGuidePanel();
    return;
  }
  hideGuidePanel();
  window.pet.invoke('get-pet-spritesheet',{index:idx}).then(r=>{if(r){loadSpritesheet(r.data,r.ext,r.config||null);showPetTutorial();}}).catch(()=>{});
}

function drawNoPetHint(){
  if(!ctx)return;
  ctx.clearRect(0,0,120,140);
  ctx.fillStyle='rgba(10,10,10,0.7)';
  ctx.fillRect(10,45,100,50);
  ctx.fillStyle='#ffd564';
  ctx.font='11px MapleMonoNFCN,Courier New,monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('暂无宠物',60,65);
  ctx.font='9px MapleMonoNFCN,Courier New,monospace';
  ctx.fillStyle='#aaa';
  ctx.fillText('前往 petdex.dev',60,83);
  showGuidePanel();
}

function updateExpBar(){
  const e=gameInfo.exp||0,lv=gameInfo.level||1;
  const nr=calcExpForLevel(lv+1),cr=calcExpForLevel(lv);
  const target=nr>cr?Math.min(100,((e-cr)/(nr-cr))*100):0;
  displayExp+=(target-displayExp)*0.3;
  if(Math.abs(displayExp-target)<0.3)displayExp=target;
  const rounded=Math.round(displayExp);
  expFill.style.width=`${rounded}%`;
  displayExpFull+=(e-displayExpFull)*0.3;
  if(Math.abs(displayExpFull-e)<1)displayExpFull=e;
  expDetail.textContent=`${shortNum(displayExpFull)} / ${shortNum(nr)} (${rounded}%)`;
}
const COMBO_COLORS={
  'D':['#888','#666'],'C':['#aaa','#888'],'B':['#6b6','#484'],
  'A':['#6bf','#48a'],'S':['#ff6','#cc4'],'SS':['#f80','#c60'],'SSS':['#f44','#c22'],
};
const COMBO_STYLES={'D':{fs:18,bs:1.5},'C':{fs:20,bs:1.8},'B':{fs:22,bs:2.0},'A':{fs:24,bs:2.2},'S':{fs:26,bs:2.5},'SS':{fs:28,bs:2.8},'SSS':{fs:30,bs:3.0}};
let comboHits=[];

function randComboPos(){
  let x,y;
  do{x=15+Math.random()*90;y=15+Math.random()*100}while(x>80&&y<30);
  return{x,y};
}

function newComboHit(grade,streak,keyChar){
  if(!grade||streak<2)return;
  const p=randComboPos();
  const cl=COMBO_COLORS[grade]||['#fff','#ccc'];
  const st=COMBO_STYLES[grade]||{fs:22,bs:2.6};
  comboHits.push({grade,streak,keyChar:keyChar||grade,x:p.x,y:p.y,t:Date.now(),col:cl,st});
}

function drawCombo(){
  const now=Date.now();
  for(let i=comboHits.length-1;i>=0;i--){
    const h=comboHits[i],a=(now-h.t)/1000,st=h.st||{fs:22,bs:2.6};
    if(a>1.0){comboHits.splice(i,1);continue;}
    let sc,shx=0,shy=0,dy=0,op=1;
    const bs=st.bs;
    if(a<0.05){
      const t=a/0.05;
      sc=1+t*(bs-1);
      shx=Math.sin(t*Math.PI*3)*5*(1-t);
      shy=Math.cos(t*Math.PI*3)*3*(1-t);
      dy=t*2;
    }else if(a<0.15){
      const t=(a-0.05)/0.10;
      sc=bs-t*(bs-1);
      shx=Math.sin(t*Math.PI*4)*3*(1-t);
      shy=Math.cos(t*Math.PI*4)*2*(1-t);
      dy=2-t*4;
    }else if(a<0.3){
      sc=1;dy=0;
    }else{
      const t=(a-0.3)/0.7;
      sc=1-t*0.2;
      dy=-t*15;
      op=1-t*t;
    }
    const fs=st.fs,sf=fs/22;
    ctx.save();
    ctx.globalAlpha=op;
    ctx.translate(h.x+shx,h.y+shy+dy);
    ctx.scale(sc,sc);
    ctx.textAlign='right';ctx.textBaseline='bottom';
    ctx.font='bold '+fs+'px MapleMonoNFCN,Courier New,monospace';
    ctx.strokeStyle='rgba(0,0,0,0.6)';ctx.lineWidth=1.5*sf;ctx.lineJoin='round';
    ctx.strokeText(h.keyChar,0,fs);
    ctx.fillStyle=h.col[0];
    ctx.fillText(h.keyChar,0,fs);
    ctx.textAlign='left';
    ctx.font='bold '+Math.round(fs/1.7)+'px MapleMonoNFCN,Courier New,monospace';
    ctx.strokeStyle='rgba(0,0,0,0.6)';ctx.lineWidth=1*sf;ctx.lineJoin='round';
    ctx.strokeText(''+h.streak,2,fs+2);
    ctx.fillStyle=h.col[1];
    ctx.fillText(''+h.streak,2,fs+2);
    ctx.restore();
  }
}

function shortNum(n){
  const v=Number(n);
  if(Number.isNaN(v))return'0';
  if(v<1000)return v.toFixed(0);
  if(v<10000)return(v/1000).toFixed(2)+'k';
  if(v<1000000)return(v/1000).toFixed(2)+'k';
  if(v<10000000)return(v/1000000).toFixed(2)+'M';
  if(v<1000000000)return(v/1000000).toFixed(2)+'M';
  return(v/1000000000).toFixed(2)+'B';
}
function updateInfoBar(){
  if(!spritesheet&&pets.length===0){drawNoPetHint();return;}
  if(!spritesheet)return;
  const title=gameInfo.title&&gameInfo.title!=='—'?gameInfo.title:'';
  const dl=gameInfo.isInHub?(gameInfo.hubLevel||1):(gameInfo.level||1);
  infoText.textContent=title?`${gameInfo.scenario} | LV.${dl} | ${title}`:`${gameInfo.scenario} | LV.${dl}`;
  updateExpBar();
}
function applyTheme(theme, customTheme){
  document.body.className='';
  if(customTheme){
    document.body.style.setProperty('--fg', customTheme.fg);
    document.body.style.setProperty('--bg', customTheme.bg);
    document.body.style.setProperty('--dim', customTheme.dim);
    document.body.style.setProperty('--border-color', customTheme.border || customTheme.dim);
  } else if(theme&&theme!=='green'){
    document.body.classList.add('theme-'+theme);
  }
}

// ── Drag ──
let dragging=false,mouseOff={x:0,y:0};
canvas.addEventListener('mousedown',e=>{dragging=true;dragMoved=false;mouseOff.x=e.screenX-(window.screenLeft||0);mouseOff.y=e.screenY-(window.screenTop||0);});
document.addEventListener('mousemove',e=>{if(!dragging)return;const dx=Math.abs(e.screenX-(window.screenLeft||0)-mouseOff.x);const dy=Math.abs(e.screenY-(window.screenTop||0)-mouseOff.y);if(dx>3||dy>3)dragMoved=true;window.pet.invoke('pet-drag-move',{x:e.screenX-mouseOff.x,y:e.screenY-mouseOff.y}).catch(()=>{});});
document.addEventListener('mouseup',()=>{if(dragging){dragging=false;window.pet.invoke('pet-drag-end').catch(()=>{});}});

// ── Interactions ──
const CLICK_ANIMS=['wave','review','extra1','extra2'];
canvas.addEventListener('click',()=>{if(!dragMoved)transitionTo(CLICK_ANIMS[Math.floor(Math.random()*CLICK_ANIMS.length)]);});
canvas.addEventListener('dblclick',e=>{e.preventDefault();if(!dragMoved){transitionTo('jump');window.pet.invoke('toggle-main-window').catch(()=>{});}});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();window.pet.invoke('show-context-menu').catch(()=>{});});

// ── Dot click toggle ──
dotEl.addEventListener('click',(e)=>{
  e.stopPropagation();
  if(nq.current && dotEl.className !== 'dot-none') nq.showBubble();
});

// ── Toggle helpers (respond to context menu commands) ──
function getToggle(key, def) { const v = localStorage.getItem('pet_' + key); return v !== null ? v === 'true' : def; }
function setToggle(key, val) { localStorage.setItem('pet_' + key, val); }
function applyPetSettings() {
  document.getElementById('container').classList.toggle('border-hidden', !getToggle('showBorder', true));
  document.getElementById('info-bar').style.display = getToggle('showInfoBar', true) ? '' : 'none';
  document.getElementById('exp-wrap').style.display = getToggle('showExpBar', true) ? '' : 'none';
}

// ── IPC ──
window.pet.on('pet-list',d=>{pets=d.pets||[];selIdx=d.selected||0;loadPet(selIdx);applyPetSettings();});
window.pet.on('pet-selected',d=>{selIdx=d.index;loadPet(selIdx);});
window.pet.on('toggle-feature', d => {
  const keyMap = { border:'showBorder', infobar:'showInfoBar', expbar:'showExpBar' };
  const key = keyMap[d.feature] || d.feature;
  setToggle(key, d.value);
  applyPetSettings();
});
window.pet.on('game-tick',d=>{
  gameInfo.level=d.level||1;gameInfo.exp=d.total_exp_earned||0;
  gameInfo.hubLevel=d.hub_level||1;
  gameInfo.isInHub=d.is_in_hub!==false;
  if(d.currentTitle)gameInfo.title=d.currentTitle;
  gameInfo.scenario=d.is_in_hub?'大厅':(d.scenario_name||'副本');
  const ms=d.total_runtime_ms||0,s=Math.floor(ms/1000);
  gameInfo.runtime=`${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m${s%60}s`;
  gameInfo.ach=(d.unlockedAchievements||[]).length;
  if(d.theme&&d.theme!==gameInfo.theme){gameInfo.theme=d.theme;applyTheme(d.theme, d.customTheme);}
  if(keyDetail){const tk=d.total_key_presses||0,dk=d.daily_key_presses||0;keyDetail.textContent=`⌨ ${shortNum(tk)}   今日 ${shortNum(dk)}`;}
  if (buffBadge) {
    const bm = d.buff_multiplier || 1;
    const br = d.buff_remaining || 0;
    if (bm > 1 && br > 0) {
      buffBadge.textContent = 'x' + bm;
      buffBadge.classList.remove('hidden');
    } else {
      buffBadge.classList.add('hidden');
    }
  }
  updateInfoBar();
});
window.pet.on('theme-changed',(d)=>{if(d){gameInfo.theme=d.theme;applyTheme(d.theme, d.customTheme);}});
window.pet.on('pet-state',d=>{
  gameInfo.hubLevel=d.hubLevel||1;gameInfo.isInHub=d.isInHub!==false;gameInfo.level=d.level||1;
  updateInfoBar();
});
window.pet.on('event-triggered',d=>{transitionTo('run');nq.enqueue({text:d.text,title:d.title||'事件',type:'event'},1);});
window.pet.on('level-up',d=>{
  gameInfo.title=d.title||gameInfo.title;
  transitionTo(Math.random()<0.5?'jump':'extra3');
  const txt=d.eventText?`Lv.${d.level} — ${d.eventText}`:`升级! Lv.${d.level}`;
  nq.enqueue({text:txt,title:'等级提升',type:'levelup'},2);
});
window.pet.on('achievement-unlocked',d=>{transitionTo(Math.random()<0.5?'review':'extra1');nq.enqueue({text:`${d.icon||'★'} ${d.name}`,title:'成就解锁',type:'achievement'},3);});

window.pet.on('hourly-chime',()=>{
  if(!spritesheet)return;
  const now=new Date();
  const h=now.getHours(),m=now.getMinutes()>=30?'30':'00';
  showChimeBubble(('0'+h).slice(-2)+':'+m);
});

window.pet.on('choice-event',(d)=>{
  if(d&&d.choices){
    window.pet.invoke('show-choice-bubble',{title:d.title||'抉择',text:d.text,color:'#FF9E64',type:'choice',choices:d.choices,_eventId:d._eventId}).catch(()=>{});
  }
});
window.pet.on('dismiss-choice',()=>{
  window.pet.invoke('close-bubble').catch(()=>{});
  nq.q=nq.q.filter(item=>item.type!=='choice');
  if(nq.current&&nq.current.type==='choice'){nq.current=null;nq.next();}
});
window.pet.on('key-combo',(d)=>{
  gameInfo.totalKeyPresses=d.total||0;
  gameInfo.dailyKeyPresses=d.daily||0;
  if(keyDetail)keyDetail.textContent=`⌨ ${shortNum(d.total||0)}   今日 ${shortNum(d.daily||0)}`;
  if(d.grade)newComboHit(d.grade,d.streak||0,d.keyChar);
  if (getToggle('shake', true)) {
    const c = document.getElementById('container');
    c.classList.remove('shaking');
    void c.offsetWidth;
    c.classList.add('shaking');
    setTimeout(() => c.classList.remove('shaking'), 180);
  }
});
window.pet.on('buff-triggered',(d)=>{
  if (buffBadge) {
    buffBadge.textContent = 'x' + d.multiplier;
    buffBadge.classList.remove('hidden');
    setTimeout(() => {
      if (buffBadge) buffBadge.classList.add('hidden');
    }, d.duration || 60000);
  }
});
window.pet.on('bubble-closed',()=>{nq.close();});

window.pet.on('pet-guide',()=>{
  nq.enqueue({text:'单击 → 互动动画\n双击 → 切换主窗口\n右键 → 菜单（换宠/设置）\n拖拽 → 移动窗口',title:'操作说明',type:'event'},0);
});

window.pet.invoke('scan-pets').then(r=>{
  pets=r.pets||[];selIdx=r.selected||0;
  if(pets.length>0)localStorage.setItem(PET_TUTORIAL_KEY,'true');
  loadPet(selIdx);applyPetSettings();
}).catch(()=>{});
window.pet.invoke('pet-get-state').then(()=>updateInfoBar()).catch(()=>{});

let expRafId=null;
function expLoop(){updateExpBar();expRafId=requestAnimationFrame(expLoop);}
expRafId=requestAnimationFrame(expLoop);
const IDLE_ANIMS=['failed','review','extra1','extra2'];
// Random idle animation every 20s (30% chance)
setInterval(() => {
  if (curState === 'idle' && Math.random() < 0.3) {
    transitionTo(IDLE_ANIMS[Math.floor(Math.random()*IDLE_ANIMS.length)]);
  }
}, 20000);

// Half-hourly chime (checks every 30s)
let lastChimeBlock=new Date().getHours()*2+(new Date().getMinutes()>=30?1:0);
setInterval(()=>{
  const now=new Date();
  const block=now.getHours()*2+(now.getMinutes()>=30?1:0);
  if(block!==lastChimeBlock&&spritesheet){
    lastChimeBlock=block;
    const chimeOn=getToggle('chime',true);
    if(chimeOn){
      const h=now.getHours(),m=now.getMinutes()>=30?'30':'00';
      showChimeBubble(('0'+h).slice(-2)+':'+m);
    }
  }
},30000);

// ── Guide Buttons ──
guideOpenFolder.addEventListener('click',()=>{window.pet.invoke('open-pets-folder').catch(()=>{});});
guidePetdex.addEventListener('click',()=>{window.pet.invoke('open-external-link',{url:'https://petdex.dev/'}).catch(()=>{});});
