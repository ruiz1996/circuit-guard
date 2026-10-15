const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Game,TOWERS,MAPS,ENEMIES,RESEARCH,wavePlan,purchaseResearch,researchCost}=require('../engine.js');
function advance(g,seconds){for(let i=0;i<seconds*60;i++)g.update(1/60);}
function richGame(mapId=0){const g=new Game({},mapId);g.coins=100000;return g;}

test('building validates paths, deposits, occupancy and funds without spending on failure',()=>{
  const g=new Game();assert.ok(g.build('pulse',2,2).error);assert.ok(g.build('pulse',2,7).error);assert.ok(g.build('miner',1,1).error);assert.ok(g.build('pulse',-1,0).error);assert.equal(g.coins,260);
  const {tower}=g.build('pulse',3,3);assert.ok(tower);assert.equal(g.coins,190);assert.ok(g.build('pulse',3,3).error);assert.ok(g.build('tesla',5,5).tower);assert.ok(g.build('sniper',6,5).error);
});
test('upgrading increases power, caps at five and sell refunds all investments at 70 percent',()=>{
  const g=richGame(),{tower}=g.build('pulse',3,3);const before=g.stats(tower);for(let i=0;i<4;i++)assert.ok(g.upgrade(tower.id).tower);assert.equal(tower.level,5);assert.ok(g.stats(tower).damage>before.damage);assert.ok(g.stats(tower).interval<before.interval);assert.ok(g.upgrade(tower.id).error);const balance=g.coins,spent=tower.spent;assert.equal(g.sell(tower.id),Math.floor(spent*.7));assert.equal(g.coins,balance+Math.floor(spent*.7));assert.equal(g.towers.length,0);
});
test('every map has a continuous traversable route and deposits away from paths',()=>{
  for(let i=0;i<MAPS.length;i++){const g=new Game({},i);assert.ok(g.path.length>25);for(let j=1;j<g.path.length;j++)assert.equal(Math.abs(g.path[j][0]-g.path[j-1][0])+Math.abs(g.path[j][1]-g.path[j-1][1]),1);for(const [x,y]of g.map.mines)assert.equal(g.pathSet.has(`${x},${y}`),false);assert.equal(g.position(g.route.length).x,16.5);}
});
test('wave composition introduces specialists and boss every ten waves',()=>{
  assert.equal(wavePlan(1).length,8);assert.deepEqual([...new Set(wavePlan(1))],['normal']);assert.ok(wavePlan(3).includes('runner'));assert.ok(wavePlan(5).includes('tank'));assert.ok(wavePlan(7).includes('swarm'));assert.ok(wavePlan(10).includes('boss'));assert.equal(wavePlan(11).includes('boss'),false);assert.ok(wavePlan(100).length>wavePlan(20).length);
});
test('a deployed defense can complete a wave, grant rewards exactly once and continue',()=>{
  const g=richGame();for(const [type,x,y]of[['pulse',2,1],['pulse',3,4],['sniper',7,5],['cannon',8,7]])g.build(type,x,y);
  assert.equal(g.startWave(),true);assert.equal(g.startWave(),false);advance(g,100);assert.equal(g.active,false);assert.equal(g.wave,1);assert.equal(g.kills,8);assert.equal(g.lives,20);assert.equal(g.profile.best,1);assert.ok(g.profile.ore>0);const ore=g.profile.ore;advance(g,100);assert.equal(g.profile.ore,ore);assert.equal(g.startWave(),true);assert.equal(g.wave,2);
});
test('enemies reaching core reduce lives; defeat blocks further waves',()=>{
  const g=new Game();g.lives=1;g.startWave();advance(g,100);assert.equal(g.over,true);assert.equal(g.lives,0);assert.equal(g.startWave(),false);assert.equal(g.profile.best,0);assert.ok(g.build('pulse',1,1).error);
});
test('boss leaks cause five core damage',()=>{
  const g=new Game();g.wave=10;g.active=true;g.queue=['normal'];g.spawnClock=100;const e=g.spawn('boss');e.distance=g.route.length-.001;g.update(.1);assert.equal(g.lives,15);
});
test('mining only progresses during active unpaused combat',()=>{
  const g=new Game();const {tower}=g.build('miner',2,7);advance(g,20);assert.equal(g.profile.ore,0);g.startWave();advance(g,1);assert.equal(g.profile.ore,1);assert.equal(tower.produced,1);g.paused=true;const cooldown=tower.cooldown;advance(g,20);assert.equal(g.profile.ore,1);assert.equal(tower.cooldown,cooldown);g.paused=false;advance(g,10);assert.ok(g.profile.ore>=2);
});
test('sniper ignores most armor; frost slows groups; tesla chains and cannon splashes',()=>{
  const g=richGame();g.wave=5;
  const {tower:sniper}=g.build('sniper',1,1),a=g.spawn('tank'),b=g.spawn('tank');g.hit(a,100,sniper,0);g.hit(b,100,sniper,.85);assert.ok(b.hp<a.hp);
  const {tower:frost}=g.build('frost',5,5),f=g.spawn('normal');f.x=5.5;f.y=5.5;g.fire(frost,[f],g.stats(frost));assert.equal(f.slowTime,2);assert.equal(f.slow,.45);
  const {tower:tesla}=g.build('tesla',6,5);for(const [i,e]of g.enemies.entries()){e.x=6+i*.3;e.y=5.5;}const hp=g.enemies.map(e=>e.hp);g.fire(tesla,[a],g.stats(tesla));assert.ok(g.enemies.filter((e,i)=>e.hp<hp[i]).length>=3);
  const {tower:cannon}=g.build('cannon',6,7);g.active=true;g.spawnClock=100;g.queue=['normal'];const c=g.spawn('normal'),d=g.spawn('normal');c.distance=10;d.distance=10.1;Object.assign(c,g.position(10));Object.assign(d,g.position(10.1));g.fire(cannon,[c],g.stats(cannon));const p=g.projectiles.at(-1);p.x=c.x;p.y=c.y;const hpC=c.hp,hpD=d.hp;g.update(.01);assert.ok(c.hp<hpC);assert.ok(d.hp<hpD);
});
test('research purchases spend the right amount, cap upgrades and affect future runs',()=>{
  const p={ore:10000,research:{},best:0,totalKills:0};const g=new Game(p);const c=researchCost(p,'damage');assert.equal(purchaseResearch(p,'damage'),true);assert.equal(p.ore,10000-c);assert.equal(g.level('damage'),1);const t={type:'pulse',level:1,xp:0};assert.ok(g.stats(t).damage>TOWERS.pulse.damage);purchaseResearch(p,'capital');purchaseResearch(p,'core');assert.equal(g.coins,260);assert.equal(g.maxLives,20);const next=new Game(p);assert.equal(next.coins,295);assert.equal(next.maxLives,23);p.research.range=RESEARCH.range.max;assert.equal(purchaseResearch(p,'range'),false);p.ore=0;assert.equal(purchaseResearch(p,'speed'),false);
});
test('snapshot round trip preserves an active combat including targets and projectiles',()=>{
  const g=richGame();g.build('pulse',1,1);g.startWave();advance(g,2);const data=JSON.parse(JSON.stringify(g.snapshot())),p=JSON.parse(JSON.stringify(g.profile));const restored=Game.restore(data,p);assert.ok(restored);assert.deepEqual(restored.snapshot(),data);advance(g,2);advance(restored,2);assert.deepEqual(restored.snapshot(),g.snapshot());assert.deepEqual(restored.profile,g.profile);
});
test('pause freezes the simulation and automatic waves wait three seconds',()=>{
  const g=new Game();g.paused=true;g.startWave();g.paused=true;const snapshot=JSON.stringify(g.snapshot());advance(g,10);assert.equal(JSON.stringify(g.snapshot()),snapshot);const a=new Game();a.auto=true;advance(a,2);assert.equal(a.wave,0);advance(a,2);assert.equal(a.wave,1);
});
test('all six building types remain valid through a ten wave expedition',()=>{
  const g=richGame();for(const [type,x,y]of[['pulse',2,1],['sniper',7,5],['cannon',8,7],['frost',5,5],['tesla',10,3],['miner',2,7]]){const {tower}=g.build(type,x,y);assert.ok(tower,type);for(let i=0;i<4;i++)g.upgrade(tower.id);}
  for(let i=1;i<=10;i++){assert.equal(g.startWave(),true);advance(g,220);assert.equal(g.over,false,`survive wave ${i}`);assert.equal(g.active,false,`complete wave ${i}`);}
  assert.equal(g.profile.best,10);assert.ok(g.earned>100);assert.ok(g.kills>100);assert.ok(g.towers.some(t=>t.xp>0));
});
