(function (root) {
  'use strict';
  const W = 16, H = 11;
  const TOWERS = {
    pulse: { name:'脉冲塔', tag:'单体 · 均衡', cost:70, color:'#508a66', damage:15, range:2.65, interval:.7, projectile:10, description:'稳定而经济的防线主力。持续锁定目标，以高频脉冲击穿敌人。' },
    sniper: { name:'狙击塔', tag:'远程 · 破甲', cost:120, color:'#7c8eac', damage:65, range:4.9, interval:2.1, projectile:23, pierce:.85, description:'超远射程，忽略大部分护甲。适合布置在内圈，狙击厚重目标。' },
    cannon: { name:'榴弹塔', tag:'范围 · 爆破', cost:145, color:'#c09557', damage:35, range:2.65, interval:1.65, projectile:7, splash:1.05, description:'命中后在周围造成范围伤害。密集的敌人越多，火力收益越高。' },
    frost: { name:'霜环塔', tag:'控制 · 减速', cost:95, color:'#75aab0', damage:5, range:2.35, interval:1.2, slow:.45, description:'向周围释放冰霜脉冲，使命中的所有敌人减速 45%，持续 2 秒。' },
    tesla: { name:'电弧塔', tag:'连锁 · 群攻', cost:180, color:'#a18ab1', damage:23, range:2.6, interval:1.05, chain:4, description:'闪电在最多 4 个敌人之间跳跃，每次跳跃保留 80% 的伤害。' },
    miner: { name:'采晶器', tag:'经济 · 采矿', cost:100, color:'#7a9a69', damage:0, range:0, interval:9, description:'只能建在菱形矿脉上。战斗中每 9 秒开采晶体，并补充 8 枚建造资金。' }
  };
  const ENEMIES = {
    normal:{name:'常规单位',hp:39,speed:1.0,reward:7,color:'#c78c58',size:.16,armor:0},
    runner:{name:'疾行单位',hp:25,speed:1.65,reward:7,color:'#b9a146',size:.14,armor:0},
    tank:{name:'装甲单位',hp:135,speed:.68,reward:16,color:'#7d8e8c',size:.23,armor:.4},
    swarm:{name:'集群单位',hp:23,speed:1.2,reward:4,color:'#ad896f',size:.12,armor:0},
    boss:{name:'重型领主',hp:1700,speed:.48,reward:110,color:'#975b61',size:.36,armor:.25}
  };
  const RESEARCH = {
    damage:{name:'脉冲增幅',description:'所有防御塔伤害 +10% / 级',base:12,max:10},
    range:{name:'远域感知',description:'所有防御塔射程 +5% / 级',base:15,max:5},
    capital:{name:'后勤储备',description:'每次新战斗初始资金 +35 / 级',base:10,max:8},
    mining:{name:'晶体勘探',description:'采晶器开采速度 +15% / 级',base:14,max:8},
    speed:{name:'快速充能',description:'所有防御塔攻击速度 +6% / 级',base:18,max:8},
    core:{name:'核心加固',description:'每次新战斗核心完整度 +3 / 级',base:10,max:8},
    bounty:{name:'回收协议',description:'击败敌人获得的资金 +8% / 级',base:13,max:8},
    yield:{name:'晶格提纯',description:'每波额外奖励 1 晶体 / 级',base:20,max:5}
  };
  const MAPS = [
    {name:'翡翠回路',subtitle:'曲折的路径，留给你思考的空间。',sector:'E-01',points:[[-1,2],[4,2],[4,6],[9,6],[9,2],[13,2],[13,8],[16,8]],mines:[[2,7],[7,3],[11,9]],reward:1},
    {name:'折返花园',subtitle:'漫长的回廊，是火力的温床。',sector:'G-02',points:[[-1,1],[13,1],[13,4],[2,4],[2,8],[16,8]],mines:[[6,2],[9,6],[13,9]],reward:1},
    {name:'棱镜峡谷',subtitle:'紧凑的转折，考验精准的布防。',sector:'P-03',points:[[-1,5],[3,5],[3,1],[8,1],[8,8],[12,8],[12,4],[16,4]],mines:[[1,8],[5,3],[10,5]],reward:1.2}
  ];
  function pathFor(map) {
    const cells=[], pts=map.points;
    for(let i=0;i<pts.length-1;i++){
      let [x,y]=pts[i], [ex,ey]=pts[i+1], dx=Math.sign(ex-x),dy=Math.sign(ey-y);
      while(x!==ex||y!==ey){if(x>=0&&x<W&&y>=0&&y<H)cells.push([x,y]);x+=dx;y+=dy;}
    }
    const end=pts.at(-1);if(end[0]>=0&&end[0]<W)cells.push(end);
    return cells;
  }
  function routeFor(map) {
    let length=0;const segments=[];
    for(let i=0;i<map.points.length-1;i++){const a=map.points[i],b=map.points[i+1],n=Math.hypot(b[0]-a[0],b[1]-a[1]);segments.push({a,b,start:length,length:n});length+=n;}
    return {segments,length};
  }
  function wavePlan(wave){
    const list=[], n=7+wave+Math.floor(wave*.65);
    for(let i=0;i<n;i++){
      let type='normal';
      if(wave>=3&&i%4===1)type='runner';
      if(wave>=5&&i%6===4)type='tank';
      if(wave>=7&&i%5===2)type='swarm';
      list.push(type);
      if(type==='swarm')list.push('swarm','swarm');
    }
    if(wave%10===0)list.splice(Math.floor(list.length/2),0,'boss');
    return list;
  }
  class Game {
    constructor(profile={},mapId=0){
      this.profile=profile;profile.ore??=0;profile.research??={};profile.best??=0;profile.totalKills??=0;
      this.mapId=mapId;this.map=MAPS[mapId];this.path=pathFor(this.map);this.pathSet=new Set(this.path.map(p=>p.join(',')));this.route=routeFor(this.map);
      this.coins=260+this.level('capital')*35;this.maxLives=20+this.level('core')*3;this.lives=this.maxLives;
      this.wave=0;this.kills=0;this.earned=0;this.towers=[];this.enemies=[];this.projectiles=[];this.effects=[];this.events=[];this.queue=[];
      this.spawnClock=0;this.active=false;this.over=false;this.paused=false;this.auto=false;this.autoClock=3;this.time=0;this.nextId=1;
    }
    level(key){return this.profile.research[key]||0;}
    position(distance){for(const s of this.route.segments){if(distance<=s.start+s.length){const t=(distance-s.start)/s.length;return {x:s.a[0]+(s.b[0]-s.a[0])*t+.5,y:s.a[1]+(s.b[1]-s.a[1])*t+.5};}}const p=this.map.points.at(-1);return{x:p[0]+.5,y:p[1]+.5};}
    stats(t){const d=TOWERS[t.type], lv=t.level-1, xp=Math.floor(t.xp/12);return{damage:d.damage*(1+lv*.48)*(1+this.level('damage')*.1)*(1+Math.min(xp,10)*.035),range:d.range*(1+lv*.035)*(1+this.level('range')*.05),interval:d.interval/(1+lv*.15)/(1+this.level(t.type==='miner'?'mining':'speed')*(t.type==='miner'?.15:.06)),splash:(d.splash||0)+lv*.04};}
    canBuild(type,x,y){if(this.over)return'战斗已结束，请重新出发';if(!TOWERS[type])return'请先选择防御塔';if(x<0||x>=W||y<0||y>=H)return'请选择地图内的空地';if(this.towers.some(t=>t.x===x&&t.y===y))return'这里已经有建筑了';if(this.pathSet.has(`${x},${y}`))return'道路需要保持畅通';const mine=this.map.mines.some(p=>p[0]===x&&p[1]===y);if(type==='miner'&&!mine)return'采晶器需要建在菱形矿脉上';if(type!=='miner'&&mine)return'这里是矿脉，请部署采晶器';if(this.coins<TOWERS[type].cost)return'建造资金不足';return null;}
    build(type,x,y){const err=this.canBuild(type,x,y);if(err)return{error:err};const d=TOWERS[type],t={id:this.nextId++,type,x,y,level:1,xp:0,cooldown:0,spent:d.cost,angle:-Math.PI/2,target:'first',produced:0};this.coins-=d.cost;this.towers.push(t);this.events.push({type:'build',tower:t});return{tower:t};}
    upgradeCost(t){return Math.floor(TOWERS[t.type].cost*(.7+t.level*.48));}
    upgrade(id){const t=this.towers.find(t=>t.id===id);if(this.over)return{error:'战斗已结束'};if(!t)return{error:'未找到建筑'};if(t.level>=5)return{error:'建筑已达到最高等级'};const cost=this.upgradeCost(t);if(this.coins<cost)return{error:'升级资金不足'};this.coins-=cost;t.spent+=cost;t.level++;this.events.push({type:'upgrade',tower:t});return{tower:t};}
    sell(id){const i=this.towers.findIndex(t=>t.id===id);if(this.over||i<0)return 0;const refund=Math.floor(this.towers[i].spent*.7);this.coins+=refund;this.towers.splice(i,1);return refund;}
    startWave(){if(this.active||this.over)return false;this.wave++;this.queue=wavePlan(this.wave);this.spawnClock=.3;this.active=true;this.paused=false;this.events.push({type:'wave',wave:this.wave});return true;}
    addOre(n){this.profile.ore+=n;this.earned+=n;}
    spawn(type){const d=ENEMIES[type],scale=Math.pow(1.135,this.wave-1),hp=d.hp*scale;const e={id:this.nextId++,type,hp,maxHp:hp,distance:0,slowTime:0,slow:0,armor:d.armor,...this.position(0)};this.enemies.push(e);return e;}
    hit(e,damage,t,pierce=0){if(!e||e.hp<=0)return;e.hp-=damage*(1-e.armor*(1-pierce));if(e.hp<=0){this.coins+=Math.max(1,Math.round(ENEMIES[e.type].reward*(1+this.level('bounty')*.08)));this.kills++;this.profile.totalKills++;if(t)t.xp++;this.effects.push({type:'death',x:e.x,y:e.y,color:ENEMIES[e.type].color,life:.4,max:.4});this.events.push({type:'kill',enemy:e});}}
    fire(t,targets,s){const d=TOWERS[t.type];
      if(t.type==='frost'){
        for(const e of targets){this.hit(e,s.damage,t);e.slowTime=2;e.slow=d.slow;}
        this.effects.push({type:'ring',x:t.x+.5,y:t.y+.5,radius:s.range,color:d.color,life:.45,max:.45});
      }else if(t.type==='tesla'){
        let current={x:t.x+.5,y:t.y+.5}, target=targets[0],damage=s.damage;const used=new Set();
        for(let i=0;i<d.chain&&target;i++){this.effects.push({type:'arc',x:current.x,y:current.y,ex:target.x,ey:target.y,color:d.color,life:.22,max:.22});this.hit(target,damage,t);used.add(target.id);current=target;damage*=.8;target=this.enemies.filter(e=>e.hp>0&&!used.has(e.id)&&Math.hypot(e.x-current.x,e.y-current.y)<2).sort((a,b)=>Math.hypot(a.x-current.x,a.y-current.y)-Math.hypot(b.x-current.x,b.y-current.y))[0];}
      }else{
        const e=targets[0];this.projectiles.push({x:t.x+.5,y:t.y+.5,targetId:e.id,tx:e.x,ty:e.y,towerId:t.id,type:t.type,damage:s.damage,speed:d.projectile,splash:s.splash,pierce:d.pierce||0,life:3});
      }
      t.angle=Math.atan2(targets[0].y-(t.y+.5),targets[0].x-(t.x+.5));
    }
    update(dt){
      if(this.paused||this.over)return;
      this.time+=dt;for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
      if(!this.active){if(this.auto){this.autoClock-=dt;if(this.autoClock<=0)this.startWave();}return;}
      this.spawnClock-=dt;
      if(this.queue.length&&this.spawnClock<=0){this.spawn(this.queue.shift());this.spawnClock=this.wave>=15?.36:.68;}
      for(const e of this.enemies){if(e.hp<=0)continue;e.slowTime=Math.max(0,e.slowTime-dt);e.distance+=ENEMIES[e.type].speed*(1+Math.min(this.wave-1,70)*.006)*(e.slowTime>0?1-e.slow:1)*dt;Object.assign(e,this.position(e.distance));if(e.distance>=this.route.length){e.hp=0;this.lives=Math.max(0,this.lives-(e.type==='boss'?5:1));this.effects.push({type:'leak',x:W-.5,y:this.map.points.at(-1)[1]+.5,color:'#b96a50',life:.5,max:.5});this.events.push({type:'leak'});}}
      if(this.lives<=0){this.over=true;this.active=false;this.queue=[];this.projectiles=[];this.profile.best=Math.max(this.profile.best,this.wave-1);this.events.push({type:'over'});return;}
      for(const t of this.towers){const s=this.stats(t);t.cooldown-=dt;
        if(t.type==='miner'){if(t.cooldown<=0){t.cooldown=s.interval;const n=t.level;this.addOre(n);t.produced+=n;this.coins+=8*t.level;this.effects.push({type:'text',text:`+${n} ◇`,x:t.x+.5,y:t.y+.2,color:'#648854',life:1.2,max:1.2});this.events.push({type:'mine'});}continue;}
        if(t.cooldown>0)continue;
        const targets=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-t.x-.5,e.y-t.y-.5)<=s.range).sort((a,b)=>t.target==='strong'?b.hp-a.hp:b.distance-a.distance);
        if(targets.length){this.fire(t,targets,s);t.cooldown=s.interval;}
      }
      for(const p of this.projectiles){p.life-=dt;const e=this.enemies.find(e=>e.id===p.targetId&&e.hp>0);if(e){p.tx=e.x;p.ty=e.y;}const dist=Math.hypot(p.tx-p.x,p.ty-p.y);
        if(dist<=p.speed*dt){p.life=0;const t=this.towers.find(t=>t.id===p.towerId);
          if(p.splash){for(const enemy of this.enemies){if(Math.hypot(enemy.x-p.tx,enemy.y-p.ty)<=p.splash)this.hit(enemy,p.damage,t,p.pierce);}this.effects.push({type:'ring',x:p.tx,y:p.ty,radius:p.splash,color:TOWERS[p.type].color,life:.35,max:.35});}
          else if(e)this.hit(e,p.damage,t,p.pierce);
        }else{p.x+=(p.tx-p.x)/dist*p.speed*dt;p.y+=(p.ty-p.y)/dist*p.speed*dt;}
      }
      this.projectiles=this.projectiles.filter(p=>p.life>0);this.enemies=this.enemies.filter(e=>e.hp>0);
      if(!this.queue.length&&!this.enemies.length){this.active=false;this.projectiles=[];this.autoClock=3;const reward=Math.max(1,Math.floor((2+this.wave*.5+this.level('yield'))*this.map.reward));this.addOre(reward);const cash=22+this.wave*3;this.coins+=cash;this.profile.best=Math.max(this.profile.best,this.wave);this.events.push({type:'complete',wave:this.wave,ore:reward,coins:cash});}
    }
    snapshot(){return{version:1,mapId:this.mapId,coins:this.coins,maxLives:this.maxLives,lives:this.lives,wave:this.wave,kills:this.kills,earned:this.earned,towers:this.towers,enemies:this.enemies,projectiles:this.projectiles,queue:this.queue,spawnClock:this.spawnClock,active:this.active,over:this.over,auto:this.auto,autoClock:this.autoClock,time:this.time,nextId:this.nextId};}
    static restore(data,profile){if(!data||data.version!==1||!MAPS[data.mapId])return null;try{const g=new Game(profile,data.mapId);for(const k of Object.keys(g.snapshot()))if(k!=='version'&&k!=='mapId'&&data[k]!==undefined)g[k]=data[k];if(!Array.isArray(g.towers)||!Array.isArray(g.enemies)||!Array.isArray(g.queue)||!Number.isFinite(g.coins)||!Number.isFinite(g.nextId)||g.nextId<1)return null;return g;}catch{return null;}}
  }
  function researchCost(profile,key){const r=RESEARCH[key];return Math.floor(r.base*Math.pow(1.65,profile.research[key]||0));}
  function purchaseResearch(profile,key){const r=RESEARCH[key];if(!r)return false;const level=profile.research[key]||0,cost=researchCost(profile,key);if(level>=r.max||profile.ore<cost)return false;profile.ore-=cost;profile.research[key]=level+1;return true;}
  const API={Game,W,H,TOWERS,ENEMIES,RESEARCH,MAPS,pathFor,routeFor,wavePlan,researchCost,purchaseResearch};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.TD=API;
})(typeof globalThis!=='undefined'?globalThis:this);
