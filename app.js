(() => {
  'use strict';
  const {Game,W,H,TOWERS,ENEMIES,RESEARCH,MAPS,wavePlan,researchCost,purchaseResearch}=TD;
  const $=id=>document.getElementById(id);
  const ICONS={
    battle:'<path d="M4 18V7l4 2 4-5 4 5 4-2v11z"/><path d="M8 18v-5h8v5"/>',
    research:'<path d="M9 3h6M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M8 14h8"/><path d="m10 17 1-1m4 2h.01"/>',
    map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2M12 16h.01"/>',
    coin:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 9v6"/>',
    ore:'<path d="m12 2 7 10-7 10-7-10zM5 12h14M12 2l-3 10 3 10 3-10z"/>',
    heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 5 2 10 8 15 6-5 12-10 8-15z"/>',
    waves:'<path d="M3 7c3-5 6 5 9 0s6 5 9 0M3 12c3-5 6 5 9 0s6 5 9 0M3 17c3-5 6 5 9 0s6 5 9 0"/>',
    restart:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    muted:'<path d="m11 5-5 4H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
    sound:'<path d="m11 5-5 4H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    play:'<path d="m7 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
    pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
    cursor:'<path d="m5 3 14 10-7 1-3 7z"/>',
    spark:'<path d="m12 3 2 6 6 3-6 2-2 7-2-7-7-2 7-3z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>'
  };
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.spark}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  function towerArt(type){const c=TOWERS[type].color,shapes={pulse:'<rect x="8" y="8" width="16" height="16" rx="4"/><circle cx="16" cy="16" r="4"/><path d="M16 12V3" stroke-width="4"/>',sniper:'<path d="m16 6 11 10-11 10L5 16z"/><circle cx="16" cy="16" r="4"/><path d="M16 12V1" stroke-width="3"/>',cannon:'<circle cx="16" cy="17" r="11"/><circle cx="16" cy="17" r="6"/><path d="m16 13 3-10" stroke-width="6"/>',frost:'<circle cx="16" cy="16" r="10" stroke-dasharray="3 2"/><path d="M16 5v22M6.5 10.5l19 11M6.5 21.5l19-11"/><circle cx="16" cy="16" r="4" fill="currentColor"/>',tesla:'<path d="m16 3 12 7v13l-12 7-12-7V10z"/><path d="m18 8-7 10h6l-3 8 9-12h-7z" fill="currentColor" stroke="none"/>',miner:'<path d="m16 3 10 13-10 13L6 16z"/><path d="M6 16h20M16 3l-4 13 4 13 4-13z"/><path d="M3 28h26"/>'};return `<span class="tower-art" style="color:${c}"><svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">${shapes[type]}</svg></span>`;}
  const STORAGE='circuit-guard-v1';
  let profile={ore:0,research:{},best:0,totalKills:0},saved=null,storageOK=true;
  try{const raw=JSON.parse(localStorage.getItem(STORAGE));if(validSave(raw)){profile=raw.profile;saved=raw.run;}}catch{storageOK=false;}
  let game=Game.restore(saved,profile)||new Game(profile);
  let buildType=null,selectedId=null,hover=null,speed=1,modalView=null,wasPaused=false,toastTimer=0,lastUI=0,lastSave=0,clock=0,frame=0;
  const canvas=$('board'),ctx=canvas.getContext('2d');let width=800,height=550,sx=50,sy=50,dpr=1;
  let audioContext=null,sound=false;
  function beep(freq=500,duration=.07,volume=.025){if(!sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.65,audioContext.currentTime+duration);g.gain.setValueAtTime(volume,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}catch{}}
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify({version:1,profile,run:game.snapshot()}));storageOK=true;$('save-label').textContent='进度已自动保存';}catch{storageOK=false;$('save-label').textContent='存档不可用 · 请允许浏览器存储';}}
  if(!storageOK)$('save-label').textContent='存档不可用 · 请允许浏览器存储';
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);sx=width/W;sy=height/H;ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  new ResizeObserver(resize).observe(canvas);
  function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function path(points,stroke,lineWidth=1,fill=null){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}}
  function circle(x,y,r,fill,stroke,lineWidth=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}}
  function label(text,x,y,color='#899b78',size=10){ctx.fillStyle=color;ctx.font=`${size}px "Segoe UI","Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.fillText(text,x,y);}
  function drawTower(t,ghost=false){
    const d=TOWERS[t.type],x=(t.x+.5)*sx,y=(t.y+.5)*sy,s=Math.min(sx,sy),r=s*.27;
    ctx.save();if(ghost)ctx.globalAlpha=.55;
    circle(x,y+s*.035,r+s*.07,'#34563b0d');
    if(t.type==='miner'){
      roundRect(x-r,y-r,r*2,r*2,4,'#e3ead8',d.color);const a=game.active&&!game.paused?Math.sin(clock*3)*s*.035:0;
      path([[x,y-r+a],[x+r*.65,y+a],[x,y+r+a],[x-r*.65,y+a],[x,y-r+a]],d.color,1.5,'#a7c294');
      if(game.active){ctx.strokeStyle='#8dbd74';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+s*.1,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-Math.max(0,t.cooldown)/game.stats(t).interval));ctx.stroke();}
    }else if(t.type==='frost'){
      circle(x,y,r,'#dfedef',d.color,1.2);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;path([[x+Math.cos(a)*r*.38,y+Math.sin(a)*r*.38],[x+Math.cos(a)*r*1.18,y+Math.sin(a)*r*1.18]],d.color,1.3);}
      circle(x,y,r*.38,d.color);
    }else if(t.type==='tesla'){
      const pts=Array.from({length:7},(_,i)=>[x+Math.cos(Math.PI/6+i*Math.PI/3)*r,y+Math.sin(Math.PI/6+i*Math.PI/3)*r]);path(pts,d.color,1.5,'#e9e3ee');
      path([[x+r*.2,y-r*.6],[x-r*.25,y+r*.05],[x+r*.18,y+r*.05],[x-r*.15,y+r*.65]],d.color,2.2);
    }else{
      if(t.type==='sniper')path([[x,y-r*1.2],[x+r*1.2,y],[x,y+r*1.2],[x-r*1.2,y],[x,y-r*1.2]],d.color,1.3,'#e2e8ee');
      else if(t.type==='cannon')circle(x,y,r,'#efe7d4',d.color,1.5);
      else roundRect(x-r,y-r,r*2,r*2,r*.28,'#dcebd7',d.color);
      ctx.save();ctx.translate(x,y);ctx.rotate(t.angle||-Math.PI/2);roundRect(-s*.01,-s*(t.type==='cannon'?.065:.043),s*(t.type==='sniper'?.42:.34),s*(t.type==='cannon'?.13:.086),2,d.color);ctx.restore();circle(x,y,r*.46,d.color);circle(x-r*.14,y-r*.16,r*.15,'#edf6e8');
    }
    if(t.level>1){for(let i=0;i<t.level;i++)circle(x+(i-(t.level-1)/2)*s*.09,y+s*.38,s*.022,d.color);}
    if(t.id===selectedId){const o=s*.4,l=s*.12;ctx.strokeStyle='#5b8657';ctx.lineWidth=1.5;for(const [dx,dy]of[[-1,-1],[1,-1],[-1,1],[1,1]])path([[x+dx*o,y+dy*(o-l)],[x+dx*o,y+dy*o],[x+dx*(o-l),y+dy*o]],'#5b8657',1.5);}
    ctx.restore();
  }
  function draw(){
    if(!width||!height)return;ctx.clearRect(0,0,width,height);ctx.fillStyle='#e9efdf';ctx.fillRect(0,0,width,height);
    const s=Math.min(sx,sy);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const road=game.pathSet.has(`${x},${y}`),variation=(x*7+y*11)%13;
      ctx.fillStyle=road?'#d7e0c9':variation===0?'#e4ebd9':variation===4?'#edf2e4':'#e9efdf';ctx.fillRect(x*sx+.65,y*sy+.65,sx-1.3,sy-1.3);
      if(road){ctx.fillStyle='#bdcbaa';circle((x+.5)*sx,(y+.5)*sy,1,'#b9c8a7');}
      else if((x*5+y*3)%17===1&&!game.map.mines.some(p=>p[0]===x&&p[1]===y)&&!game.towers.some(t=>t.x===x&&t.y===y)){
        path([[(x+.42)*sx,(y+.57)*sy],[(x+.42)*sx,(y+.43)*sy]],'#bdceab',1);path([[(x+.52)*sx,(y+.6)*sy],[(x+.56)*sx,(y+.46)*sy]],'#bdceab',1);
      }
    }
    const visualRoute=game.map.points.map(p=>[(p[0]+.5)*sx,(p[1]+.5)*sy]);ctx.save();ctx.setLineDash([2,7]);path(visualRoute,'#c1cfb1',1);ctx.restore();
    for(let i=0;i<game.route.length;i+=3.4){const pos=game.position(i),ahead=game.position(i+.1);if(pos.x<.5||pos.x>W-.5)continue;const a=Math.atan2(ahead.y-pos.y,ahead.x-pos.x);ctx.save();ctx.translate(pos.x*sx,pos.y*sy);ctx.rotate(a);path([[-3,-3],[0,0],[-3,3]],'#abbc96',1);ctx.restore();}
    // Subtle coordinates anchor the board without covering play space.
    ctx.font='8px monospace';ctx.fillStyle='#a9b79b';ctx.textAlign='center';for(let x=0;x<W;x++)ctx.fillText(String(x+1).padStart(2,'0'),(x+.5)*sx,10);
    for(const [mx,my]of game.map.mines){if(game.towers.some(t=>t.x===mx&&t.y===my))continue;const x=(mx+.5)*sx,y=(my+.5)*sy;
      roundRect(mx*sx+3,my*sy+3,sx-6,sy-6,5,'#dce6d5');
      path([[x,y-s*.23],[x+s*.15,y],[x,y+s*.23],[x-s*.15,y],[x,y-s*.23]],'#82a693',1.4,'#bfd3bf');
      path([[x-s*.15,y],[x+s*.15,y]],'#82a693',1);circle(x-s*.24,y+s*.2,s*.04,'#a6bca0');
    }
    // Entrance and the defended core.
    const startY=(game.map.points[0][1]+.5)*sy,endY=(game.map.points.at(-1)[1]+.5)*sy;
    roundRect(2,startY-s*.32,s*.58,s*.64,4,'#eedbc5','#c9966b');path([[s*.17,startY-s*.12],[s*.29,startY],[s*.17,startY+s*.12]],'#b88255',1.8);
    const cx=width-s*.34;circle(cx,endY,s*.35,'#c7ddba','#779b69',1.3);circle(cx,endY,s*.21,'#6b9665');circle(cx,endY,s*.1,'#d9ebc3');
    if(game.lives<=5){circle(cx,endY,s*(.4+Math.sin(clock*4)*.04),null,'#c38361',1.5);}
    const selected=game.towers.find(t=>t.id===selectedId);
    const activeRange=selected?{...selected,range:game.stats(selected).range}:hover&&buildType?{...hover,range:TOWERS[buildType].range*(1+game.level('range')*.05)}:null;
    if(activeRange&&activeRange.range){ctx.save();ctx.scale(sx,sy);circle(activeRange.x+.5,activeRange.y+.5,activeRange.range,'#67965e0d','#84a77275',.025);ctx.restore();}
    if(hover&&buildType&&!modalView){const valid=!game.canBuild(buildType,hover.x,hover.y);roundRect(hover.x*sx+2,hover.y*sy+2,sx-4,sy-4,4,valid?'#94b68035':'#c78b6630',valid?'#89a975':'#c89471');if(valid&&!game.towers.some(t=>t.x===hover.x&&t.y===hover.y))drawTower({...hover,type:buildType,level:1,angle:-Math.PI/2},true);}
    for(const t of game.towers)drawTower(t);
    for(const e of game.enemies){if(e.hp<=0)continue;const d=ENEMIES[e.type],x=e.x*sx,y=e.y*sy,r=s*d.size;ctx.save();ctx.translate(x,y);
      if(e.slowTime>0)circle(0,0,r+3,'#8ec4cd30','#90b8be',.7);
      if(e.type==='runner'){const p=game.position(e.distance+.05),a=Math.atan2(p.y-e.y,p.x-e.x);ctx.rotate(a);path([[r,0],[-r,-r*.8],[-r*.5,0],[-r,r*.8],[r,0]],'#9c8838',1,d.color);ctx.rotate(-a);}
      else if(e.type==='tank'){roundRect(-r,-r,r*2,r*2,3,d.color,'#637674');path([[-r*.5,-r*.5],[r*.5,r*.5]],'#cbd4cd',1.5);path([[r*.5,-r*.5],[-r*.5,r*.5]],'#cbd4cd',1.5);}
      else if(e.type==='boss'){const pts=Array.from({length:7},(_,i)=>[Math.cos(i*Math.PI/3)*r,Math.sin(i*Math.PI/3)*r]);path(pts,'#79464c',1.5,d.color);circle(0,0,r*.45,'#d3a3a2');}
      else{circle(0,0,r,d.color);circle(-r*.2,-r*.2,r*.27,'#f1d9ba80');}
      if(e.hp<e.maxHp){roundRect(-r-2,-r-6,r*2+4,3,1,'#b9c6ae');roundRect(-r-2,-r-6,(r*2+4)*Math.max(0,e.hp/e.maxHp),3,1,e.type==='boss'?'#a56c6f':'#68895b');}
      ctx.restore();
    }
    for(const p of game.projectiles){const x=p.x*sx,y=p.y*sy;circle(x,y,p.type==='cannon'?3.5:2,TOWERS[p.type].color);if(p.type==='sniper'){const a=Math.atan2(p.ty-p.y,p.tx-p.x);path([[x,y],[x-Math.cos(a)*12,y-Math.sin(a)*12]],'#9cacc2',1.3);}}
    for(const e of game.effects){const a=e.life/e.max;ctx.save();ctx.globalAlpha=a;
      if(e.type==='ring'){circle(e.x*sx,e.y*sy,e.radius*s*(1-a*.7),`${e.color}18`,e.color,1.2);}
      else if(e.type==='arc'){path([[e.x*sx,e.y*sy],[(e.x+e.ex)*sx/2+Math.sin(e.x*73)*7,(e.y+e.ey)*sy/2+5],[e.ex*sx,e.ey*sy]],e.color,1.7);}
      else if(e.type==='text')label(e.text,e.x*sx,e.y*sy-(1-a)*18,e.color,11);
      else{for(let i=0;i<5;i++){const an=i*Math.PI*2/5;circle(e.x*sx+Math.cos(an)*(1-a)*16,e.y*sy+Math.sin(an)*(1-a)*16,2*a,e.color);}}
      ctx.restore();
    }
    if(game.paused&&!modalView){ctx.fillStyle='#eaf0e177';ctx.fillRect(0,0,width,height);roundRect(width/2-65,height/2-24,130,48,9,'#f8faefed','#cedcc1');label('防线已暂停',width/2,height/2+5,'#5e8054',15);}
    if(game.over){ctx.fillStyle='#eaf0e170';ctx.fillRect(0,0,width,height);}
  }
  let panelSignature='';
  function towerPanel(){
    const selected=game.towers.find(t=>t.id===selectedId),type=selected?.type||buildType;
    const signature=JSON.stringify([type,selected?.id,selected?.level,selected?.xp,selected?.target,selected?.produced,selected?game.stats(selected):type?game.stats({type,level:1,xp:0}):null,selected?game.coins>=game.upgradeCost(selected):false,game.over,game.towers.length>0]);
    if(signature===panelSignature)return;panelSignature=signature;
    if(!type){$('selection-panel').innerHTML=`<div class="selection-top"><span style="color:#86a371">${icon('cursor')}</span><div><h3>${game.towers.length?'防线由你掌控':'从第一座塔开始'}</h3><span class="tag">YOUR DEFENSE, YOUR WAY</span></div></div><p>在上方选择建筑，再点击战场空地。点选已建造的塔，可以查看范围、升级或回收。</p><div class="selection-foot">${icon('spark')} ${game.towers.length?'留意火力覆盖，及时升级你的防线':'先部署火力，再开始第一波'}</div>`;return;}
    const d=TOWERS[type],s=selected?game.stats(selected):game.stats({type,level:1,xp:0});
    $('selection-panel').innerHTML=`<div class="selection-top">${towerArt(type)}<div><h3>${d.name}${selected?` <small style="font-size:10px;color:#87a074">Lv.${selected.level}</small>`:''}</h3><span class="tag">${d.tag}</span></div></div><p>${d.description}</p><div class="selection-stats">${type==='miner'?`<div><small>单次晶体</small><strong>${selected?.level||1} ◇</strong></div><div><small>开采间隔</small><strong>${s.interval.toFixed(1)}s</strong></div><div><small>已开采</small><strong>${selected?.produced||0}</strong></div>`:`<div><small>伤害</small><strong>${s.damage.toFixed(0)}</strong></div><div><small>射程</small><strong>${s.range.toFixed(1)}</strong></div><div><small>攻击间隔</small><strong>${s.interval.toFixed(2)}s</strong></div>`}</div>${selected?`${type!=='miner'?`<div class="selection-foot">经验 ${selected.xp} · 每 12 击破获得 3.5% 伤害加成</div><div class="xp-bar"><div style="width:${selected.xp%12/12*100}%"></div></div><button class="text-button" id="target-button" style="padding:4px 0 10px;font-size:10px">瞄准：${selected.target==='strong'?'最强敌人':'最前敌人'} ↻</button>`:''}<div class="tower-actions"><button class="upgrade-button" id="upgrade-button" ${selected.level>=5||game.coins<game.upgradeCost(selected)||game.over?'disabled':''}>${selected.level>=5?'已达到最高等级':`升级 · ${game.upgradeCost(selected)} 金币`}</button><button class="sell-button" id="sell-button" ${game.over?'disabled':''}>回收 +${Math.floor(selected.spent*.7)}</button></div>`:`<div class="selection-foot">${icon('cursor')} ${type==='miner'?'点击战场上的菱形矿脉':'点击空地部署 · Esc 取消'}</div>`}`;
    $('upgrade-button')?.addEventListener('click',upgradeSelected);
    $('sell-button')?.addEventListener('click',()=>{const n=game.sell(selectedId);selectedId=null;toast(`已回收建筑，返还 ${n} 金币`);save();updateUI();});
    $('target-button')?.addEventListener('click',()=>{selected.target=selected.target==='strong'?'first':'strong';save();towerPanel();});
  }
  function upgradeSelected(){if(!selectedId)return;const result=game.upgrade(selectedId);if(result.error)toast(result.error);else{beep(760);toast(`已升级至 Lv.${result.tower.level}`);save();}updateUI();}
  function updateUI(){
    $('coins').textContent=Math.floor(game.coins).toLocaleString();$('ore').textContent=profile.ore.toLocaleString();$('lives').textContent=game.lives;$('max-lives').textContent=` / ${game.maxLives}`;$('wave').textContent=String(game.wave).padStart(2,'0');$('kills').textContent=game.kills;$('best-wave').textContent=profile.best;
    $('map-title').textContent=game.map.name;$('map-subtitle').textContent=game.map.subtitle;$('map-number').textContent=String(game.mapId+1).padStart(2,'0');$('sector').textContent=game.map.sector;
    $('enemy-count').textContent=game.enemies.length+game.queue.length;
    $('battle-status').textContent=game.over?'核心失守':game.paused?'暂停中':game.active?'防线交战中':game.wave?'本波已守住 · 可以继续部署':'部署阶段';
    $('next-wave-label').textContent=`${game.active?'INCOMING':'NEXT WAVE'} / ${String(game.active?game.wave:game.wave+1).padStart(2,'0')}`;
    const n=game.active?game.wave:game.wave+1,plan=wavePlan(n),types=[...new Set(plan)];$('next-wave-info').textContent=`${n%10===0?'⚠ 领主来袭':types.length===1?'常规单位':types.map(k=>ENEMIES[k].name.replace('单位','')).slice(0,3).join(' / ')} · ${plan.length} 个敌人`;
    $('start-wave').disabled=game.active||game.over;$('start-label').textContent=game.over?'战斗已结束':game.active?`第 ${game.wave} 波进行中`:`开始第 ${game.wave+1} 波`;
    $('pause-button').innerHTML=icon(game.paused?'play':'pause');$('pause-button').setAttribute('aria-label',game.paused?'继续':'暂停');$('pause-button').disabled=game.over;
    $('auto-button').setAttribute('aria-pressed',String(game.auto));
    document.querySelectorAll('.tower-card').forEach(el=>{el.classList.toggle('selected',el.dataset.tower===(buildType||game.towers.find(t=>t.id===selectedId)?.type));el.setAttribute('aria-pressed',String(el.classList.contains('selected')));});
    $('research-dot').style.display=Object.keys(RESEARCH).some(k=>game.level(k)<RESEARCH[k].max&&profile.ore>=researchCost(profile,k))?'block':'none';
    towerPanel();
  }
  const towerKeys=Object.keys(TOWERS);
  $('tower-grid').innerHTML=towerKeys.map((key,i)=>`<button class="tower-card" data-tower="${key}" aria-pressed="false" title="${TOWERS[key].name}，${TOWERS[key].cost} 金币，快捷键 ${i+1}"><span class="hotkey">${i+1}</span>${towerArt(key)}<strong>${TOWERS[key].name}</strong><span class="tower-cost">${icon('coin')}${TOWERS[key].cost}</span></button>`).join('');
  function selectType(type){if(game.over){showResult();return;}selectedId=null;buildType=buildType===type?null:type;beep(400,.04,.01);updateUI();}
  document.querySelectorAll('[data-tower]').forEach(el=>el.addEventListener('click',()=>selectType(el.dataset.tower)));
  function pointer(event){const r=canvas.getBoundingClientRect();return{x:Math.floor((event.clientX-r.left)/r.width*W),y:Math.floor((event.clientY-r.top)/r.height*H)};}
  canvas.addEventListener('pointermove',e=>hover=pointer(e));canvas.addEventListener('pointerleave',()=>hover=null);
  canvas.addEventListener('click',e=>{if(game.over){showResult();return;}const p=pointer(e),t=game.towers.find(t=>t.x===p.x&&t.y===p.y);if(t){selectedId=t.id;buildType=null;updateUI();return;}if(buildType){const result=game.build(buildType,p.x,p.y);if(result.error)toast(result.error);else{beep(620);$('board-hint').hidden=true;toast(`${TOWERS[buildType].name}已部署`);save();}updateUI();}else{selectedId=null;if(game.map.mines.some(m=>m[0]===p.x&&m[1]===p.y))toast('选择采晶器，即可在这片矿脉开采');else toast('先选择右侧建筑，或使用快捷键 1–6');updateUI();}});
  $('dismiss-hint').addEventListener('click',()=>$('board-hint').hidden=true);
  function startWave(){if(!game.towers.some(t=>t.type!=='miner')){toast('建议先部署一座防御塔，再迎接敌人');return;}if(game.startWave()){beep(340,.15);save();updateUI();}}
  $('start-wave').addEventListener('click',startWave);
  function pause(){if(game.over)return;game.paused=!game.paused;updateUI();}
  $('pause-button').addEventListener('click',pause);
  $('auto-button').addEventListener('click',()=>{if(!game.towers.some(t=>t.type!=='miner')){toast('先部署防御塔，再开启自动波次');return;}game.auto=!game.auto;game.autoClock=3;save();updateUI();toast(game.auto?'自动波次已开启 · 每波结束后等待 3 秒':'自动波次已关闭');});
  document.querySelectorAll('[data-speed]').forEach(el=>el.addEventListener('click',()=>{speed=Number(el.dataset.speed);document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',b===el));}));
  $('sound-button').addEventListener('click',()=>{sound=!sound;$('sound-button').innerHTML=icon(sound?'sound':'muted');$('sound-button').setAttribute('aria-label',sound?'关闭音效':'开启音效');$('sound-button').title=sound?'关闭音效':'开启音效';beep();});
  function showModal(view,title,eyebrow,content){
    if(!modalView){wasPaused=game.paused;game.paused=true;}
    modalView=view;$('modal-title').textContent=title;$('modal-eyebrow').textContent=eyebrow;$('modal-content').innerHTML=content;$('modal-backdrop').hidden=false;
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('close-modal').focus();updateUI();
  }
  function closeModal(){if(!modalView)return;modalView=null;$('modal-backdrop').hidden=true;game.paused=wasPaused;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='battle'));updateUI();}
  $('close-modal').addEventListener('click',closeModal);$('modal-backdrop').addEventListener('click',e=>{if(e.target===$('modal-backdrop'))closeModal();});
  function showResearch(){
    showModal('research','让防线，走得更远','RESEARCH / 永久成长',`<p class="modal-desc">晶体来自采矿和守住波次。研究会保留到之后的每一场战斗；伤害、射程、攻速与回收立即生效，初始资金和核心加固在下一场生效。</p><div class="research-balance"><span>可用研究晶体</span><strong>${profile.ore} ◇</strong></div><div class="research-grid">${Object.entries(RESEARCH).map(([key,r])=>{const lv=game.level(key),cost=researchCost(profile,key);return`<div class="research-card"><h3>${r.name}<small>Lv.${lv} / ${r.max}</small></h3><p>${r.description}</p><div class="level-dots">${Array.from({length:r.max},(_,i)=>`<i class="${i<lv?'filled':''}"></i>`).join('')}</div><button data-research="${key}" ${lv>=r.max||profile.ore<cost?'disabled':''}>${lv>=r.max?'研究已完成':`研究升级 · ${cost} ◇`}</button></div>`;}).join('')}</div>`);
    document.querySelectorAll('[data-research]').forEach(b=>b.addEventListener('click',()=>{if(purchaseResearch(profile,b.dataset.research)){beep(850,.12);save();showResearch();}}));
  }
  function showHelp(){showModal('help','守住回路的每一个转角','FIELD GUIDE / 操作指南',`<div class="help-list"><div><strong>01 / 建立你的防线</strong>选择建筑，再点空地部署。敌人从橙色入口进入，沿道路走向绿色核心。每漏过一个普通敌人损失 1 点完整度，领主损失 5 点。点选已有建筑可以升级（最高 5 级）或按总投入的 70% 回收。</div><div><strong>02 / 搭配比堆叠更有效</strong>脉冲塔均衡，狙击塔破甲；榴弹塔清理集群，霜环塔延缓前进；电弧塔连锁攻击。普通塔可切换优先攻击最前或最强的敌人。每 10 波出现领主。</div><div><strong>03 / 把战斗变成成长</strong>把采晶器建在菱形矿脉上，战斗期间持续获得晶体与金币。每守住一波也会获得晶体。晶体可在研究页购买永久提升，重新出发也会保留。</div><div><strong>04 / 用你自己的节奏</strong><kbd>1</kbd>–<kbd>6</kbd> 选择建筑，<kbd>U</kbd> 升级选中的塔，<kbd>Esc</kbd> 取消选择或关闭面板。<kbd>空格</kbd> 开始下一波，交战时暂停 / 继续。开启自动波次后，每波结束等待 3 秒自动开始。打开面板或离开页面时自动暂停。</div><div><strong>05 / 离线存档</strong>进度自动保存在当前浏览器。请使用同一个浏览器和同一个打开地址；清除浏览器数据会删除存档。可以在下方导出备份，之后导入继续。</div></div><div class="dialog-actions"><button id="export-save">导出存档</button><button id="import-save">导入存档</button><button class="primary" id="help-done">开始部署</button></div><input type="file" id="save-file" accept="application/json,.json" hidden>`);
    $('help-done').onclick=closeModal;$('export-save').onclick=exportSave;$('import-save').onclick=()=>$('save-file').click();$('save-file').onchange=importSave;
  }
  function showMaps(){showModal('maps','选择你的下一条回路','EXPEDITIONS / 三张原创地图',`<p class="modal-desc">每张地图都有不同的路径和三个矿脉。切换地图会开始新一场战斗，永久研究与晶体继续保留。</p><div class="map-grid">${MAPS.map((m,i)=>`<button class="map-card ${i===game.mapId?'current':''}" data-map="${i}"><svg viewBox="0 0 170 110" aria-hidden="true"><polyline points="${m.points.map(p=>`${(p[0]+1)*9},${(p[1]+1)*9}`).join(' ')}"/></svg><strong>${String(i+1).padStart(2,'0')} / ${m.name}</strong><span>${m.subtitle}</span><small>${i===game.mapId?'当前地图 · 点击重新出发':m.reward>1?'晶体奖励 +20%':'标准晶体奖励'}</small></button>`).join('')}</div>`);document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>confirmRestart(Number(b.dataset.map)));}
  function confirmRestart(mapId=game.mapId){showModal('restart','开始一场新的防守？','NEW EXPEDITION / 重新出发',`<p class="modal-desc">即将前往「${MAPS[mapId].name}」。当前战场将重置；${profile.ore} 枚晶体、全部永久研究和最高纪录会继续保留。</p><div class="dialog-actions"><button id="cancel-restart">继续当前战斗</button><button class="primary" id="confirm-restart">重新出发</button></div>`);$('cancel-restart').onclick=closeModal;$('confirm-restart').onclick=()=>resetRun(mapId);}
  function resetRun(mapId){game=new Game(profile,mapId);buildType=null;selectedId=null;hover=null;wasPaused=false;closeModal();$('board-hint').hidden=false;save();updateUI();toast('新防线已就绪，开始部署吧');}
  function showResult(){showModal('result','核心失守，但研究仍在继续','EXPEDITION COMPLETE / 战斗结算',`<p class="modal-desc">这条回路结束了。带着收获的晶体和经验，准备下一次防守。</p><div class="result-stats"><div><small>守住波次</small><strong>${Math.max(0,game.wave-1)}</strong></div><div><small>击破敌人</small><strong>${game.kills}</strong></div><div><small>累计采获晶体</small><strong>${game.earned}</strong></div></div><p class="modal-desc">最高纪录 ${profile.best} 波 · 可用晶体 ${profile.ore} 枚</p><div class="dialog-actions"><button id="result-research">升级永久研究</button><button class="primary" id="result-retry">再次出发</button></div>`);$('result-research').onclick=showResearch;$('result-retry').onclick=()=>resetRun(game.mapId);}
  function exportSave(){save();const blob=new Blob([JSON.stringify({version:1,profile,run:game.snapshot()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='回路守卫-存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importSave(e){const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error();const data=JSON.parse(await file.text());if(!validSave(data))throw Error();const restored=Game.restore(data.run,data.profile);if(!restored)throw Error();profile=data.profile;game=restored;buildType=null;selectedId=null;wasPaused=true;closeModal();save();toast('存档已导入，点击继续恢复战斗');}catch{toast('存档格式无效，请选择导出的存档文件');}}
  function validSave(d){if(d?.version!==1||!d.profile||!Number.isFinite(d.profile.ore)||d.profile.ore<0||!d.profile.research||typeof d.profile.research!=='object'||!Number.isFinite(d.profile.best)||!Number.isFinite(d.profile.totalKills))return false;for(const [k,v]of Object.entries(d.profile.research))if(!RESEARCH[k]||!Number.isInteger(v)||v<0||v>RESEARCH[k].max)return false;const r=d.run;if(!r||!MAPS[r.mapId]||!Number.isFinite(r.wave)||r.wave<0||!Number.isFinite(r.lives)||!Array.isArray(r.towers)||!Array.isArray(r.enemies)||!Array.isArray(r.projectiles)||!Array.isArray(r.queue)||r.queue.some(k=>!ENEMIES[k]))return false;return r.towers.every(t=>TOWERS[t.type]&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&t.x>=0&&t.x<W&&t.y>=0&&t.y<H&&Number.isFinite(t.level)&&t.level>=1&&t.level<=5)&&r.enemies.every(e=>ENEMIES[e.type]&&Number.isFinite(e.distance)&&Number.isFinite(e.hp));}
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.view==='battle')closeModal();else if(b.dataset.view==='research')showResearch();else showMaps();});
  $('research-shortcut').onclick=showResearch;$('help-button').onclick=showHelp;$('new-run-button').onclick=()=>confirmRestart();document.querySelector('.brand').onclick=e=>{e.preventDefault();closeModal();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modalView)closeModal();else{buildType=null;selectedId=null;updateUI();}return;}if(modalView){if(e.key==='Tab'){const buttons=[...$('modal').querySelectorAll('button:not(:disabled),input:not([hidden]),a[href]')];if(buttons.length){const first=$('close-modal'),last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}return;}if(e.repeat)return;if(e.code==='Space'){e.preventDefault();if(game.active)pause();else if(game.paused)pause();else startWave();}else if(/^[1-6]$/.test(e.key))selectType(towerKeys[Number(e.key)-1]);else if(e.key.toLowerCase()==='u')upgradeSelected();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(game.active)game.paused=true;save();updateUI();}});window.addEventListener('pagehide',save);
  function handleEvents(){let changed=false;for(const e of game.events.splice(0)){if(e.type==='complete'){toast(`第 ${e.wave} 波守住了 · +${e.coins} 金币 · +${e.ore} 晶体`);beep(700,.15);changed=true;}else if(e.type==='over'){beep(180,.4);save();showResult();}else if(e.type==='leak'){beep(150,.08,.015);}else if(e.type==='mine'){changed=true;}else if(e.type==='kill'&&frame%5===0)beep(380,.025,.004);}if(changed)save();}
  let lastTime=performance.now();
  function loop(now){const realDt=Math.min((now-lastTime)/1000,.1);lastTime=now;clock+=realDt;let dt=realDt*speed;while(dt>0){const step=Math.min(dt,1/60);game.update(step);dt-=step;}handleEvents();draw();frame++;if(now-lastUI>250){updateUI();lastUI=now;}if(now-lastSave>4000){save();lastSave=now;}requestAnimationFrame(loop);}
  updateUI();resize();requestAnimationFrame(loop);if(game.towers.length)$('board-hint').hidden=true;if(game.over)showResult();else if(saved){game.paused=true;toast('已恢复上次防线 · 点击继续或按空格');updateUI();}
})();
