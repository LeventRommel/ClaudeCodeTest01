'use strict';

// ── constants ──────────────────────────────────────────────────────────────
const W = 640, H = 480;

const STATE = { MENU:'MENU', PLAYING:'PLAYING', PAUSED:'PAUSED',
                LEVEL_CLEAR:'LEVEL_CLEAR', GAME_OVER:'GAME_OVER', VICTORY:'VICTORY' };

const PALETTE = {
  bg1:'#1a1a2e', bg2:'#16213e', tile:'#1f2b47',
  yellow:'#f1c40f', cyan:'#00e5ff', red:'#e53935',
  green:'#4caf50', white:'#eceff1', gray:'#607d8b',
  purple:'#ab47bc', orange:'#ff7043',
};

const ENEMY_DEFS = {
  grunt:   { hp:30,  radius:8,  speed:65,  contactDamage:18, bulletDamage:0,  shootInterval:0,   scoreValue:10 },
  fast:    { hp:15,  radius:6,  speed:135, contactDamage:12, bulletDamage:0,  shootInterval:0,   scoreValue:15 },
  tank:    { hp:120, radius:12, speed:38,  contactDamage:45, bulletDamage:0,  shootInterval:0,   scoreValue:40 },
  shooter: { hp:40,  radius:8,  speed:52,  contactDamage:8,  bulletDamage:15, shootInterval:1.5, scoreValue:25 },
};

const LEVELS = [
  { levelNumber:1, background:'dungeon', waves:[
    { delay:0,  spawns:[{ type:'grunt', count:4, formation:'edges' }] },
    { delay:8,  spawns:[{ type:'grunt', count:6, formation:'edges' }] },
    { delay:18, spawns:[{ type:'grunt', count:7, formation:'edges' }] },
  ]},
  { levelNumber:2, background:'dungeon', waves:[
    { delay:0,  spawns:[{ type:'grunt', count:5, formation:'edges' }, { type:'fast', count:2, formation:'top' }] },
    { delay:9,  spawns:[{ type:'grunt', count:4, formation:'edges' }, { type:'fast', count:3, formation:'sides' }] },
    { delay:20, spawns:[{ type:'grunt', count:5, formation:'edges' }, { type:'fast', count:4, formation:'corners' }] },
  ]},
  { levelNumber:3, background:'grid', waves:[
    { delay:0,  spawns:[{ type:'grunt', count:5, formation:'edges' }, { type:'fast', count:3, formation:'sides' }] },
    { delay:10, spawns:[{ type:'shooter', count:2, formation:'corners' }, { type:'grunt', count:4, formation:'edges' }] },
    { delay:22, spawns:[{ type:'shooter', count:3, formation:'edges' }, { type:'fast', count:5, formation:'top' }] },
  ]},
  { levelNumber:4, background:'grid', waves:[
    { delay:0,  spawns:[{ type:'tank', count:1, formation:'edges' }, { type:'grunt', count:6, formation:'edges' }] },
    { delay:12, spawns:[{ type:'tank', count:1, formation:'edges' }, { type:'shooter', count:3, formation:'corners' }, { type:'fast', count:4, formation:'top' }] },
    { delay:26, spawns:[{ type:'tank', count:2, formation:'sides' }, { type:'grunt', count:5, formation:'edges' }, { type:'shooter', count:2, formation:'corners' }] },
  ]},
  { levelNumber:5, background:'grid', waves:[
    { delay:0,  spawns:[{ type:'grunt', count:8, formation:'edges' }, { type:'fast', count:5, formation:'top' }] },
    { delay:12, spawns:[{ type:'shooter', count:4, formation:'corners' }, { type:'tank', count:2, formation:'sides' }] },
    { delay:26, spawns:[{ type:'tank', count:1, formation:'edges', hpOverride:300 }, { type:'shooter', count:3, formation:'corners' }] },
  ]},
];

// ── canvas setup ───────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ── input ──────────────────────────────────────────────────────────────────
const Input = {
  keys: {}, _jpPending: {},
  keysJustPressed: {},
  mouseX: W/2, mouseY: H/2,
  mouseDown: false, mouseJustPressed: false,
  _mouseRaw: false, _mousePrev: false,

  init() {
    window.addEventListener('keydown', e => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this._jpPending[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup',   e => { delete this.keys[e.code]; });
    window.addEventListener('blur',    ()=> { this.keys = {}; this._mouseRaw = false; });
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (W / r.width);
      this.mouseY = (e.clientY - r.top)  * (H / r.height);
    });
    canvas.addEventListener('mousedown', e => { if (e.button===0) this._mouseRaw = true; });
    canvas.addEventListener('mouseup',   e => { if (e.button===0) this._mouseRaw = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  },

  poll() {
    this.keysJustPressed = this._jpPending;
    this._jpPending = {};
    this.mouseJustPressed = this._mouseRaw && !this._mousePrev;
    this.mouseDown = this._mouseRaw;
    this._mousePrev = this._mouseRaw;
  },
};

// ── screen-shake fx ────────────────────────────────────────────────────────
const Fx = {
  shakeTimer: 0, shakeMag: 0,
  trigger(dur, mag) { this.shakeTimer = dur; this.shakeMag = mag; },
  update(dt) { this.shakeTimer = Math.max(0, this.shakeTimer - dt); },
  apply(ctx) {
    if (this.shakeTimer > 0) {
      ctx.translate(
        (Math.random()-0.5)*2*this.shakeMag,
        (Math.random()-0.5)*2*this.shakeMag
      );
    }
  },
};

// ── particle ───────────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, color, size, lifetime) {
    Object.assign(this, { x, y, vx, vy, color, size, lifetime, age:0, alive:true });
  }
  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vx *= Math.max(0, 1 - 4*dt);
    this.vy *= Math.max(0, 1 - 4*dt);
    this.age += dt;
    if (this.age >= this.lifetime) this.alive = false;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, 1 - this.age / this.lifetime);
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

function emitExplosion(x, y, color1='#ff6d00', color2='#ffd600') {
  for (let i = 0; i < 14; i++) {
    const angle  = Math.random() * Math.PI * 2;
    const speed  = 60 + Math.random() * 140;
    const color  = Math.random() < 0.5 ? color1 : color2;
    const size   = Math.random() < 0.4 ? 3 : 2;
    Entities.particles.push(new Particle(x, y, Math.cos(angle)*speed, Math.sin(angle)*speed, color, size, 0.5+Math.random()*0.7));
  }
}

function emitBloodSpark(x, y) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 70;
    Entities.particles.push(new Particle(x, y, Math.cos(angle)*speed, Math.sin(angle)*speed, '#e53935', 1+Math.floor(Math.random()*2), 0.2+Math.random()*0.4));
  }
}

function emitVictoryBurst() {
  const colors = [PALETTE.yellow, PALETTE.cyan, PALETTE.red, PALETTE.green, PALETTE.purple, PALETTE.orange];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 180;
    const color = colors[Math.floor(Math.random()*colors.length)];
    Entities.particles.push(new Particle(W/2, H/2, Math.cos(angle)*speed, Math.sin(angle)*speed, color, Math.random()<0.3?3:2, 1.5+Math.random()*1.2));
  }
}

// ── bullet ─────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle, speed, damage, owner) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.owner  = owner;
    this.radius = 3;
    this.alive  = true;
    this.age    = 0;
  }
  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.age += dt;
    if (this.age > 2.0 || this.x < -10 || this.x > W+10 || this.y < -10 || this.y > H+10) {
      this.alive = false;
    }
  }
  draw(ctx) {
    ctx.fillStyle = this.owner === 'player' ? '#fff176' : '#ff5252';
    ctx.fillRect(Math.round(this.x-2), Math.round(this.y-2), 4, 4);
    // glow dot
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = this.owner === 'player' ? '#fffde7' : '#ffcdd2';
    ctx.fillRect(Math.round(this.x-3), Math.round(this.y-3), 6, 6);
    ctx.globalAlpha = 1;
  }
}

function spawnBullet(x, y, angle, speed, damage, owner) {
  Entities.bullets.push(new Bullet(x, y, angle, speed, damage, owner));
}

// ── player ─────────────────────────────────────────────────────────────────
class Player {
  constructor() {
    this.x = W/2; this.y = H/2;
    this.vx = 0;  this.vy = 0;
    this.speed = 130;
    this.hp = 100; this.maxHp = 100;
    this.angle = 0;
    this.shootCooldown  = 0;
    this.shootRate      = 0.18;
    this.walkFrame      = 0;
    this.walkTimer      = 0;
    this.muzzleFlash    = 0;
    this.invincibleTimer= 0;
    this.score = 0;
    this.radius = 8;
    this.moving = false;
  }

  update(dt) {
    // movement
    let dx = 0, dy = 0;
    if (Input.keys['ArrowLeft']  || Input.keys['KeyA']) dx -= 1;
    if (Input.keys['ArrowRight'] || Input.keys['KeyD']) dx += 1;
    if (Input.keys['ArrowUp']    || Input.keys['KeyW']) dy -= 1;
    if (Input.keys['ArrowDown']  || Input.keys['KeyS']) dy += 1;
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }
    this.x = Math.max(12, Math.min(W-12, this.x + dx * this.speed * dt));
    this.y = Math.max(12, Math.min(H-12, this.y + dy * this.speed * dt));
    this.moving = len > 0;

    // aim
    this.angle = Math.atan2(Input.mouseY - this.y, Input.mouseX - this.x);

    // walk animation
    if (this.moving) {
      this.walkTimer += dt;
      if (this.walkTimer > 0.1) { this.walkTimer = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
    } else {
      this.walkFrame = 0;
    }

    // shoot
    this.shootCooldown -= dt;
    if (Input.mouseDown && this.shootCooldown <= 0) {
      const bx = this.x + Math.cos(this.angle) * 18;
      const by = this.y + Math.sin(this.angle) * 18;
      spawnBullet(bx, by, this.angle, 420, 22, 'player');
      this.shootCooldown = this.shootRate;
      this.muzzleFlash   = 0.06;
    }
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0 && currentState === STATE.PLAYING) transition(STATE.GAME_OVER);
  }
}

// ── enemy ──────────────────────────────────────────────────────────────────
class Enemy {
  constructor(x, y, type, hpOverride) {
    const def = ENEMY_DEFS[type];
    this.x = x; this.y = y;
    this.type          = type;
    this.hp            = hpOverride || def.hp;
    this.maxHp         = hpOverride || def.hp;
    this.speed         = def.speed;
    this.radius        = def.radius;
    this.contactDamage = def.contactDamage;
    this.bulletDamage  = def.bulletDamage;
    this.shootInterval = def.shootInterval;
    this.scoreValue    = def.scoreValue;
    this.angle         = 0;
    this.walkFrame     = 0;
    this.walkTimer     = 0;
    this.shootTimer    = def.shootInterval * 0.5; // stagger first shot
    this.age           = 0;
    this.flashTimer    = 0;
    this.alive         = true;
  }

  update(dt, player) {
    this.age += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);

    // walk animation
    this.walkTimer += dt;
    if (this.walkTimer > 0.15) { this.walkTimer = 0; this.walkFrame ^= 1; }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.angle = Math.atan2(dy, dx);

    switch (this.type) {
      case 'grunt':
      case 'tank': {
        this.x += (dx/dist) * this.speed * dt;
        this.y += (dy/dist) * this.speed * dt;
        break;
      }
      case 'fast': {
        const px = -dy/dist, py = dx/dist;  // perpendicular
        const lateral = Math.sin(this.age * 5) * 0.55;
        this.x += ((dx/dist) + px*lateral) * this.speed * dt;
        this.y += ((dy/dist) + py*lateral) * this.speed * dt;
        break;
      }
      case 'shooter': {
        if (dist > 185) {
          this.x += (dx/dist) * this.speed * dt;
          this.y += (dy/dist) * this.speed * dt;
        }
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
          this.shootTimer = this.shootInterval;
          spawnBullet(this.x, this.y, this.angle, 185, this.bulletDamage, 'enemy');
        }
        break;
      }
    }
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    this.flashTimer = 0.12;
    if (this.hp <= 0) {
      this.alive = false;
      LevelManager.onEnemyDied();
      Entities.player.score += this.scoreValue;
      const colors = { grunt:['#40916c','#d8f3dc'], fast:['#9c27b0','#e1bee7'], tank:['#546e7a','#eceff1'], shooter:['#40916c','#80cbc4'] };
      emitExplosion(this.x, this.y, ...colors[this.type]);
    }
  }
}

// ── level manager ──────────────────────────────────────────────────────────
const LevelManager = {
  currentLevelIdx: 0,
  waveIndex: 0,
  waveTimer: 0,
  enemiesAlive: 0,
  allWavesSpawned: false,

  init(idx) {
    this.currentLevelIdx = idx;
    this.waveIndex       = 0;
    this.waveTimer       = 0;
    this.enemiesAlive    = 0;
    this.allWavesSpawned = false;
  },

  update(dt) {
    this.waveTimer += dt;
    const level = LEVELS[this.currentLevelIdx];
    while (this.waveIndex < level.waves.length && this.waveTimer >= level.waves[this.waveIndex].delay) {
      this._spawn(level.waves[this.waveIndex]);
      this.waveIndex++;
    }
    if (this.waveIndex >= level.waves.length) this.allWavesSpawned = true;
    if (this.allWavesSpawned && this.enemiesAlive <= 0 && currentState === STATE.PLAYING) {
      transition(STATE.LEVEL_CLEAR);
    }
  },

  _spawn(wave) {
    wave.spawns.forEach(g => {
      for (let i = 0; i < g.count; i++) {
        const pos = getFormationPos(g.formation);
        Entities.enemies.push(new Enemy(pos.x, pos.y, g.type, g.hpOverride));
        this.enemiesAlive++;
      }
    });
  },

  onEnemyDied() {
    this.enemiesAlive = Math.max(0, this.enemiesAlive - 1);
  },
};

function getFormationPos(formation) {
  const m = 28;
  switch (formation) {
    case 'edges': {
      const edge = Math.floor(Math.random()*4);
      const t    = 0.1 + Math.random()*0.8;
      if (edge===0) return { x: t*W, y: -m };
      if (edge===1) return { x: W+m, y: t*H };
      if (edge===2) return { x: t*W, y: H+m };
                    return { x: -m,  y: t*H };
    }
    case 'corners': {
      const c = [{ x:-m,y:-m },{ x:W+m,y:-m },{ x:-m,y:H+m },{ x:W+m,y:H+m }];
      return c[Math.floor(Math.random()*4)];
    }
    case 'top':   return { x:(0.1+Math.random()*0.8)*W, y:-m };
    case 'sides': return Math.random()<0.5 ? { x:-m, y:(0.1+Math.random()*0.8)*H } : { x:W+m, y:(0.1+Math.random()*0.8)*H };
    default:      return { x:Math.random()*W, y:-m };
  }
}

// ── entity container ───────────────────────────────────────────────────────
const Entities = {
  player:    null,
  enemies:   [],
  bullets:   [],
  particles: [],
};

// ── collision ──────────────────────────────────────────────────────────────
function overlap(a, b) {
  const dx=a.x-b.x, dy=a.y-b.y, r=a.radius+b.radius;
  return dx*dx+dy*dy < r*r;
}

function updateCollisions() {
  const player = Entities.player;
  if (!player) return;

  // player bullets vs enemies
  for (const b of Entities.bullets) {
    if (!b.alive || b.owner !== 'player') continue;
    for (const e of Entities.enemies) {
      if (!e.alive) continue;
      if (overlap(b, e)) {
        e.takeDamage(b.damage);
        b.alive = false;
        emitBloodSpark(b.x, b.y);
        break;
      }
    }
  }

  // enemy bullets vs player
  if (player.invincibleTimer <= 0) {
    for (const b of Entities.bullets) {
      if (!b.alive || b.owner !== 'enemy') continue;
      if (overlap(b, player)) {
        player.takeDamage(b.damage);
        player.invincibleTimer = 0.5;
        b.alive = false;
        emitBloodSpark(b.x, b.y);
        Fx.trigger(0.25, 4);
        break;
      }
    }
  }

  // enemies vs player (contact)
  for (const e of Entities.enemies) {
    if (!e.alive) continue;
    if (overlap(e, player)) {
      player.takeDamage(e.contactDamage * (1/60));
    }
  }

  // enemy vs enemy separation
  for (let i = 0; i < Entities.enemies.length; i++) {
    const a = Entities.enemies[i];
    if (!a.alive) continue;
    for (let j = i+1; j < Entities.enemies.length; j++) {
      const b = Entities.enemies[j];
      if (!b.alive) continue;
      const dx=a.x-b.x, dy=a.y-b.y;
      const dist2=dx*dx+dy*dy;
      const minD=a.radius+b.radius;
      if (dist2 < minD*minD && dist2 > 0) {
        const dist=Math.sqrt(dist2);
        const push=(minD-dist)*0.5/dist;
        a.x+=dx*push; a.y+=dy*push;
        b.x-=dx*push; b.y-=dy*push;
      }
    }
  }
}

// ── state machine ──────────────────────────────────────────────────────────
let currentState    = STATE.MENU;
let currentLevelIdx = 0;
let levelStartScore = 0;

const levelClearData = { timer:0, scoreEarned:0 };

function transition(next) {
  if (currentState === next) return;
  currentState = next;
  if (next === STATE.LEVEL_CLEAR) {
    levelClearData.timer       = 3.0;
    levelClearData.scoreEarned = Entities.player.score - levelStartScore;
  }
  if (next === STATE.VICTORY) emitVictoryBurst();
}

function startGame() {
  Entities.player    = new Player();
  Entities.enemies   = [];
  Entities.bullets   = [];
  Entities.particles = [];
  currentLevelIdx    = 0;
  levelStartScore    = 0;
  LevelManager.init(0);
  transition(STATE.PLAYING);
  currentState = STATE.PLAYING;
}

function loadLevel(idx) {
  currentLevelIdx = idx;
  Entities.enemies = [];
  Entities.bullets = [];
  LevelManager.init(idx);
  const p = Entities.player;
  p.x = W/2; p.y = H/2;
  p.hp = Math.min(p.maxHp, p.hp + 20);
  p.invincibleTimer = 1.5;
  levelStartScore = p.score;
}

// ── update ─────────────────────────────────────────────────────────────────
function update(dt) {
  Fx.update(dt);

  switch (currentState) {
    case STATE.MENU:
      if (Input.keysJustPressed['Enter'] || Input.keysJustPressed['Space'] || Input.mouseJustPressed) startGame();
      break;

    case STATE.PLAYING:
      LevelManager.update(dt);
      Entities.player.update(dt);
      for (const e of Entities.enemies) e.update(dt, Entities.player);
      for (const b of Entities.bullets)  b.update(dt);
      for (const p of Entities.particles) p.update(dt);
      updateCollisions();
      Entities.enemies   = Entities.enemies.filter(e => e.alive);
      Entities.bullets   = Entities.bullets.filter(b => b.alive);
      Entities.particles = Entities.particles.filter(p => p.alive);
      if (Input.keysJustPressed['Escape']) transition(STATE.PAUSED);
      break;

    case STATE.PAUSED:
      if (Input.keysJustPressed['Escape'] || Input.keysJustPressed['Enter'] || Input.keysJustPressed['Space']) {
        transition(STATE.PLAYING);
      }
      break;

    case STATE.LEVEL_CLEAR:
      for (const p of Entities.particles) p.update(dt);
      Entities.particles = Entities.particles.filter(p => p.alive);
      levelClearData.timer -= dt;
      if (levelClearData.timer <= 0 || Input.keysJustPressed['Enter'] || Input.keysJustPressed['Space']) {
        const next = currentLevelIdx + 1;
        if (next >= LEVELS.length) {
          transition(STATE.VICTORY);
        } else {
          loadLevel(next);
          transition(STATE.PLAYING);
          currentState = STATE.PLAYING;
        }
      }
      break;

    case STATE.GAME_OVER:
      for (const p of Entities.particles) p.update(dt);
      Entities.particles = Entities.particles.filter(p => p.alive);
      if (Input.keysJustPressed['Enter'] || Input.keysJustPressed['Space'] || Input.mouseJustPressed) {
        transition(STATE.MENU);
        currentState = STATE.MENU;
      }
      break;

    case STATE.VICTORY:
      for (const p of Entities.particles) p.update(dt);
      Entities.particles = Entities.particles.filter(p => p.alive);
      if (Input.keysJustPressed['Enter'] || Input.keysJustPressed['Space'] || Input.mouseJustPressed) {
        transition(STATE.MENU);
        currentState = STATE.MENU;
      }
      break;
  }
}

// ── backgrounds ────────────────────────────────────────────────────────────
function renderBgDungeon() {
  ctx.fillStyle = '#0f1523';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#151d30';
  for (let y=0; y<H; y+=32) for (let x=0; x<W; x+=32) ctx.fillRect(x+1, y+1, 30, 30);
}

function renderBgGrid() {
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#0a1a3a';
  ctx.lineWidth = 1;
  for (let x=0; x<=W; x+=32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y=0; y<=H; y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}

function renderBackground() {
  const bg = currentState === STATE.MENU || !LEVELS[currentLevelIdx] ? 'dungeon' : LEVELS[currentLevelIdx].background;
  if (bg === 'grid') renderBgGrid(); else renderBgDungeon();
}

// ── CRT overlay ────────────────────────────────────────────────────────────
function renderCRT() {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let y=0; y<H; y+=2) ctx.fillRect(0, y, W, 1);
  const vg = ctx.createRadialGradient(W/2,H/2, H*0.28, W/2,H/2, H*0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// ── HUD ────────────────────────────────────────────────────────────────────
function renderHUD() {
  const p = Entities.player;
  if (!p) return;

  // HP bar
  const hpFrac = p.hp / p.maxHp;
  const barW = 110;
  ctx.fillStyle = '#111';
  ctx.fillRect(8, 8, barW+2, 10);
  ctx.fillStyle = hpFrac > 0.5 ? '#4caf50' : hpFrac > 0.25 ? '#ffc107' : '#f44336';
  ctx.fillRect(9, 9, Math.max(0, Math.round(barW * hpFrac)), 8);
  ctx.strokeStyle = '#546e7a';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, barW+2, 10);

  ctx.font = '8px monospace';
  ctx.fillStyle = '#eceff1';
  ctx.fillText(`HP ${p.hp}/${p.maxHp}`, 126, 17);

  // score
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.yellow;
  ctx.fillText(`SCORE ${String(p.score).padStart(6,'0')}`, W-8, 17);
  ctx.textAlign = 'left';

  // level + wave
  const lm  = LevelManager;
  const lv  = LEVELS[lm.currentLevelIdx];
  const wTotal = lv ? lv.waves.length : 0;
  ctx.fillStyle = PALETTE.cyan;
  ctx.fillText(`LVL ${lm.currentLevelIdx+1}/${LEVELS.length}`, 8, H-6);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.gray;
  ctx.fillText(`WAVE ${Math.min(lm.waveIndex, wTotal)}/${wTotal}`, W-8, H-6);
  ctx.textAlign = 'left';
}

// ── overlay helpers ────────────────────────────────────────────────────────
function overlayRect(alpha, color='#000') {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function centeredText(text, y, size, color, font='monospace') {
  ctx.font = `bold ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, W/2, y);
  ctx.textAlign = 'left';
}

function blinking(text, y, size, color) {
  if (Math.floor(performance.now()/500) % 2 === 0) centeredText(text, y, size, color);
}

// ── state screens ──────────────────────────────────────────────────────────
function renderMenu() {
  overlayRect(0.82);
  centeredText('NEON SIEGE', H/2-70, 42, PALETTE.yellow);
  centeredText('A TOP-DOWN RETRO SHOOTER', H/2-38, 10, PALETTE.gray);

  ctx.font = '10px monospace'; ctx.fillStyle = PALETTE.white; ctx.textAlign = 'center';
  ctx.fillText('WASD / ARROWS  —  move', W/2, H/2+2);
  ctx.fillText('MOUSE  —  aim', W/2, H/2+18);
  ctx.fillText('LEFT CLICK  —  shoot', W/2, H/2+34);
  ctx.fillText('ESC  —  pause', W/2, H/2+50);
  ctx.textAlign = 'left';

  blinking('PRESS ENTER TO START', H/2+90, 14, PALETTE.cyan);
}

function renderPause() {
  overlayRect(0.65);
  centeredText('PAUSED', H/2-20, 36, PALETTE.white);
  blinking('PRESS ESC OR ENTER TO RESUME', H/2+24, 11, PALETTE.cyan);
}

function renderLevelClear() {
  overlayRect(0.7, '#001a0f');
  centeredText('LEVEL CLEAR!', H/2-55, 34, PALETTE.green);
  centeredText(`+${levelClearData.scoreEarned} POINTS`, H/2-18, 16, PALETTE.yellow);
  const next = currentLevelIdx + 1;
  if (next < LEVELS.length) {
    centeredText(`LEVEL ${next+1} IN ${Math.ceil(Math.max(0,levelClearData.timer))}...`, H/2+14, 13, PALETTE.cyan);
    blinking('PRESS ENTER TO SKIP', H/2+40, 10, PALETTE.gray);
  } else {
    blinking('PRESS ENTER TO CONTINUE', H/2+20, 12, PALETTE.cyan);
  }
}

function renderGameOver() {
  overlayRect(0.78, '#1a0000');
  centeredText('GAME OVER', H/2-40, 40, PALETTE.red);
  const score = Entities.player ? Entities.player.score : 0;
  centeredText(`FINAL SCORE: ${String(score).padStart(6,'0')}`, H/2+4, 14, PALETTE.white);
  blinking('PRESS ENTER TO RETURN TO MENU', H/2+40, 10, PALETTE.cyan);
}

function renderVictory() {
  overlayRect(0.72, '#001020');
  centeredText('YOU WIN!', H/2-60, 44, PALETTE.yellow);
  const score = Entities.player ? Entities.player.score : 0;
  centeredText(`FINAL SCORE: ${String(score).padStart(6,'0')}`, H/2-12, 16, PALETTE.white);
  centeredText('ALL LEVELS CLEARED', H/2+14, 11, PALETTE.cyan);
  blinking('PRESS ENTER FOR MENU', H/2+50, 11, PALETTE.gray);
}

// ── render ─────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  Fx.apply(ctx);

  renderBackground();

  // always render particles (victory burst shows even over overlay)
  for (const p of Entities.particles) p.draw(ctx);

  if (currentState === STATE.PLAYING || currentState === STATE.PAUSED || currentState === STATE.LEVEL_CLEAR) {
    for (const e of Entities.enemies) Sprites.drawEnemy(ctx, e);
    if (Entities.player) Sprites.drawPlayer(ctx, Entities.player);
    for (const b of Entities.bullets) b.draw(ctx);
    renderHUD();
  }

  ctx.restore();

  renderCRT();

  switch (currentState) {
    case STATE.MENU:        renderMenu();       break;
    case STATE.PAUSED:      renderPause();      break;
    case STATE.LEVEL_CLEAR: renderLevelClear(); break;
    case STATE.GAME_OVER:   renderGameOver();   break;
    case STATE.VICTORY:     renderVictory();    break;
  }
}

// ── game loop ──────────────────────────────────────────────────────────────
let lastTime = 0;
const MAX_DT = 0.05;

function tick(ts) {
  const dt = Math.min((ts - lastTime) / 1000, MAX_DT);
  lastTime = ts;
  Input.poll();
  update(dt);
  render();
  requestAnimationFrame(tick);
}

// ── boot ───────────────────────────────────────────────────────────────────
Input.init();
Sprites.init();
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(tick); });
