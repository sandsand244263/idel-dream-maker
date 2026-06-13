const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');
const dotEl = document.getElementById('bubble-dot');
const dotSymbol = document.getElementById('dot-symbol');
const bubbleZone = document.getElementById('bubble-zone');
const bubbleText = document.getElementById('bubble-text');
const ctxMenu = document.getElementById('ctx-menu');
const infoText = document.getElementById('info-text');
const expFill = document.getElementById('exp-fill');
const expWrap = document.getElementById('exp-wrap');
const expPct = document.getElementById('exp-pct');
const expDetail = document.getElementById('exp-detail');

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
};

let pets=[],selIdx=0,spritesheet=null,cols=8,rows=9,stateConfig=null;
let curState='idle',frameIdx=0,frameList=[],animTimer=null,returnTimer=null,debounceTimer=null;
let gameInfo={level:1,title:'—',exp:0,scenario:'大厅',runtime:'0h0m0s',ach:0,theme:'green'};
let displayExp=0,dragMoved=false;

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
    else{dotSymbol.textContent='!';dotEl.className='dot-event';}
    dotEl.dataset.text=this.current.text;
    dotEl.dataset.title=this.current.title||'';
    dotEl.dataset.type=this.current.type;
  }
  showBubble(){
    if(!this.current||bubbleZone.className==='zone-show')return;
    const t=this.current.title||'';
    bubbleText.innerHTML=t?'<div style="text-align:center;font-weight:bold;margin-bottom:4px">'+t+'</div><div>'+this.current.text+'</div>':this.current.text;
    bubbleZone.className='zone-show';
    bubbleZone.style.borderLeftColor=this.current.type==='achievement'?'#FFD700':this.current.type==='levelup'?'#00FF00':'#00BFFF';
    if(expWrap)expWrap.style.display='none';
    requestAnimationFrame(()=>{
      const c=document.getElementById('container');
      window.pet.invoke('pet-resize',{height:Math.max(210,c?c.scrollHeight+6:210)}).catch(()=>{});
    });
  }
  hideBubble(){
    bubbleZone.className='zone-hide';
    if(expWrap)expWrap.style.display='flex';
    const container=document.getElementById('container');
    window.pet.invoke('pet-resize',{height:Math.max(210,container?container.scrollHeight+6:210)}).catch(()=>{});
  }
  close(){
    bubbleZone.className='zone-hide';
    if(expWrap)expWrap.style.display='flex';
    dotEl.className='dot-none';dotSymbol.textContent='○';
    const container=document.getElementById('container');
    window.pet.invoke('pet-resize',{height:Math.max(210,container?container.scrollHeight+6:210)}).catch(()=>{});
    this.next();
  }
  clearQueue(){
    this.q=[];
    this.current=null;
    bubbleZone.className='zone-hide';
    if(expWrap)expWrap.style.display='flex';
    dotEl.className='dot-none';dotSymbol.textContent='○';
    const container=document.getElementById('container');
    window.pet.invoke('pet-resize',{height:Math.max(210,container?container.scrollHeight+6:210)}).catch(()=>{});
  }
}
const nq=new NotificationQueue();

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
function drawSprite(col,row){if(!spritesheet)return;ctx.clearRect(0,0,120,140);ctx.drawImage(spritesheet,col*FW,row*FH,FW,FH,0,0,120,140);}
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

function loadSpritesheet(b64,ext,cfg){
  if(!b64||b64.length<100)return;
  const img=new Image();
  img.onload=()=>{
    spritesheet=img;
    const iw=img.naturalWidth,ih=img.naturalHeight;
    if(iw%192===0&&ih%208===0){FW=192;FH=208;}
    else if(iw%128===0&&ih%128===0){FW=128;FH=128;}
    else if(iw%64===0&&ih%64===0){FW=64;FH=64;}
    else{FW=192;FH=208;}
    cols=Math.floor(iw/FW);rows=Math.floor(ih/FH);
    stateConfig=cfg||null;
    play('idle');
  };
  img.onerror=()=>{spritesheet=null;};
  img.src=`data:image/${ext==='.png'?'png':'webp'};base64,${b64}`;
}
function loadPet(idx){
  if(idx<0||idx>=pets.length)return;
  window.pet.invoke('get-pet-spritesheet',{index:idx}).then(r=>{if(r)loadSpritesheet(r.data,r.ext,r.config||null);}).catch(()=>{});
}

function updateExpBar(){
  const e=gameInfo.exp||0,lv=gameInfo.level||1;
  const nr=calcExpForLevel(lv+1),cr=calcExpForLevel(lv);
  const target=nr>cr?Math.min(100,((e-cr)/(nr-cr))*100):0;
  displayExp+=(target-displayExp)*0.3;
  if(Math.abs(displayExp-target)<0.3)displayExp=target;
  const rounded=Math.round(displayExp);
  expFill.style.width=`${rounded}%`;
  expDetail.textContent=`${Math.floor(e)} / ${nr} (${rounded}%)`;
}
function updateInfoBar(){
  const title=gameInfo.title&&gameInfo.title!=='—'?gameInfo.title:'';
  infoText.textContent=title?`${gameInfo.scenario} | Lv.${gameInfo.level} | ${title}`:`${gameInfo.scenario} | Lv.${gameInfo.level}`;
  updateExpBar();
}
function applyTheme(theme){
  document.body.className='';
  if(theme&&theme!=='green')document.body.classList.add('theme-'+theme);
}

// ── Drag ──
let dragging=false,mouseOff={x:0,y:0};
canvas.addEventListener('mousedown',e=>{dragging=true;dragMoved=false;mouseOff.x=e.screenX-(window.screenLeft||0);mouseOff.y=e.screenY-(window.screenTop||0);});
document.addEventListener('mousemove',e=>{if(!dragging)return;const dx=Math.abs(e.screenX-(window.screenLeft||0)-mouseOff.x);const dy=Math.abs(e.screenY-(window.screenTop||0)-mouseOff.y);if(dx>3||dy>3)dragMoved=true;window.pet.invoke('pet-drag-move',{x:e.screenX-mouseOff.x,y:e.screenY-mouseOff.y}).catch(()=>{});});
document.addEventListener('mouseup',()=>{if(dragging){dragging=false;window.pet.invoke('pet-drag-end').catch(()=>{});}});

// ── Interactions ──
canvas.addEventListener('dblclick',e=>{e.preventDefault();if(!dragMoved){transitionTo('jump');window.pet.invoke('toggle-main-window').catch(()=>{});}});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();ctxMenu.classList.remove('hidden');const r=canvas.getBoundingClientRect();ctxMenu.style.left=(e.clientX-r.left)+'px';ctxMenu.style.top=(e.clientY-r.top)+'px';});
document.addEventListener('click',e=>{if(!ctxMenu.contains(e.target))ctxMenu.classList.add('hidden');});

// ── Dot click toggle ──
dotEl.addEventListener('click',(e)=>{
  e.stopPropagation();
  if(bubbleZone.className==='zone-show'){nq.hideBubble();}
  else{nq.showBubble();}
});
bubbleZone.addEventListener('click',(e)=>{
  e.stopPropagation();
  nq.close();
});
document.addEventListener('click',()=>{if(bubbleZone.className==='zone-show')nq.close();});

// ── Context menu ──
document.getElementById('ctx-close').addEventListener('click',()=>{ctxMenu.classList.add('hidden');window.pet.invoke('hide-pet-window').catch(()=>{});});
document.getElementById('ctx-prev').addEventListener('click',()=>{ctxMenu.classList.add('hidden');if(pets.length===0)return;selIdx=(selIdx-1+pets.length)%pets.length;window.pet.invoke('select-pet',{index:selIdx}).catch(()=>{});});
document.getElementById('ctx-next').addEventListener('click',()=>{ctxMenu.classList.add('hidden');if(pets.length===0)return;selIdx=(selIdx+1)%pets.length;window.pet.invoke('select-pet',{index:selIdx}).catch(()=>{});});

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
  if(d.theme&&d.theme!==gameInfo.theme){gameInfo.theme=d.theme;applyTheme(d.theme);}
  updateInfoBar();
});
window.pet.on('event-triggered',d=>{transitionTo('wave');nq.enqueue({text:d.text,title:d.title,type:'event'},1);});
window.pet.on('level-up',d=>{gameInfo.title=d.title||gameInfo.title;transitionTo('jump');nq.enqueue({text:`升级! Lv.${d.level}`,type:'levelup'},2);});
window.pet.on('achievement-unlocked',d=>{transitionTo('extra1');nq.enqueue({text:`${d.icon||'★'} ${d.name}`,type:'achievement'},3);});
window.pet.on('main-shown',()=>{nq.clearQueue();});

window.pet.invoke('scan-pets').then(r=>{pets=r.pets||[];selIdx=r.selected||0;loadPet(selIdx);}).catch(()=>{});
window.pet.invoke('pet-get-state').then(()=>updateInfoBar()).catch(()=>{});

setInterval(updateExpBar,50);
document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='h')window.pet.invoke('hide-pet-window').catch(()=>{});});
