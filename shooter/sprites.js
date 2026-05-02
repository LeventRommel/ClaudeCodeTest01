'use strict';

window.Sprites = (() => {

  // ── pixel-art renderer ─────────────────────────────────────────────────
  function drawPixelArt(ctx, data, x, y, ps) {
    const rows = data.length, cols = data[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!data[r][c]) continue;
        ctx.fillStyle = data[r][c];
        ctx.fillRect(Math.round(x + c * ps), Math.round(y + r * ps), ps, ps);
      }
    }
  }

  // ── color palette ──────────────────────────────────────────────────────
  const _ = null;
  // player
  const SK='#f4c2a1', HR='#3d1f00', SH='#4a7c9e', PT='#1e3a5f', BT='#111111';
  // grunt
  const GD='#1b4332', GL='#40916c', GE='#000000';
  // fast
  const FD='#4a148c', FL='#9c27b0', FE='#e1bee7', FB='#1a0033';
  // tank
  const TD='#263238', TL='#546e7a', TA='#b71c1c', TE='#ff1744';
  // shooter
  const CD='#1b4332', CL='#40916c', CG='#607d8b', CG2='#37474f';

  // ── player frames (8 × 10, ps = 2 → 16 × 20 screen px) ───────────────
  const PF0 = [
    [_,_,HR,HR,HR,HR,_,_],
    [_,HR,SK,SK,SK,SK,HR,_],
    [_,HR,SK,SK,SK,SK,HR,_],
    [_,_,SK,SK,SK,SK,_,_],
    [_,SH,SH,SH,SH,SH,SH,_],
    [_,SH,SH,SH,SH,SH,SH,_],
    [_,PT,PT,PT,PT,PT,PT,_],
    [_,PT,PT,_,_,PT,PT,_],
    [_,PT,PT,_,_,PT,PT,_],
    [_,BT,BT,_,_,BT,BT,_],
  ];
  // left stride
  const PF1 = [
    [_,_,HR,HR,HR,HR,_,_],
    [_,HR,SK,SK,SK,SK,HR,_],
    [_,HR,SK,SK,SK,SK,HR,_],
    [_,_,SK,SK,SK,SK,_,_],
    [_,SH,SH,SH,SH,SH,SH,_],
    [_,SH,SH,SH,SH,SH,SH,_],
    [_,PT,PT,PT,PT,PT,PT,_],
    [PT,PT,PT,_,PT,_,_,_],
    [_,PT,PT,_,PT,_,_,_],
    [_,BT,BT,_,BT,_,_,_],
  ];
  // right stride (mirror of PF1)
  const PF3 = [
    [_,_,HR,HR,HR,HR,_,_],
    [_,HR,SK,SK,SK,SK,HR,_],
    [_,HR,SK,SK,SK,SK,HR,_],
    [_,_,SK,SK,SK,SK,_,_],
    [_,SH,SH,SH,SH,SH,SH,_],
    [_,SH,SH,SH,SH,SH,SH,_],
    [_,PT,PT,PT,PT,PT,PT,_],
    [_,_,_,PT,_,PT,PT,PT],
    [_,_,_,PT,_,PT,PT,_],
    [_,_,_,BT,_,BT,BT,_],
  ];
  const PLAYER_FRAMES = [PF0, PF1, PF0, PF3];

  // ── grunt frames (8 × 8, ps = 2) ──────────────────────────────────────
  const GF0 = [
    [_,_,GL,GL,GL,GL,_,_],
    [_,GL,GD,GL,GL,GD,GL,_],
    [_,GL,GE,GL,GL,GE,GL,_],
    [_,GL,GL,GL,GL,GL,GL,_],
    [GL,GD,GD,GD,GD,GD,GD,GL],
    [GL,GD,GD,GD,GD,GD,GD,GL],
    [_,GD,GD,_,_,GD,GD,_],
    [_,GD,GD,_,_,GD,GD,_],
  ];
  const GF1 = [
    [_,_,GL,GL,GL,GL,_,_],
    [_,GL,GD,GL,GL,GD,GL,_],
    [_,GL,GE,GL,GL,GE,GL,_],
    [_,GL,GL,GL,GL,GL,GL,_],
    [GL,GD,GD,GD,GD,GD,GD,GL],
    [GL,GD,GD,GD,GD,GD,GD,GL],
    [GD,GD,GD,_,_,GD,_,_],
    [_,GD,GD,_,_,GD,_,_],
  ];
  const GRUNT_FRAMES = [GF0, GF1];

  // ── fast frames (6 × 6, ps = 2) ───────────────────────────────────────
  const FF0 = [
    [_,FL,FL,FL,FL,_],
    [FL,FD,FE,FE,FD,FL],
    [FL,FB,FE,FE,FB,FL],
    [FL,FD,FD,FD,FD,FL],
    [_,FD,_,_,FD,_],
    [_,FB,_,_,FB,_],
  ];
  const FF1 = [
    [_,FL,FL,FL,FL,_],
    [FL,FD,FE,FE,FD,FL],
    [FL,FB,FE,FE,FB,FL],
    [FL,FD,FD,FD,FD,FL],
    [FD,FD,_,_,_,_],
    [_,FB,_,_,_,_],
  ];
  const FAST_FRAMES = [FF0, FF1];

  // ── tank frames (12 × 12, ps = 2) ─────────────────────────────────────
  const TF0 = [
    [_,_,TD,TD,TD,TD,TD,TD,TD,TD,_,_],
    [_,TD,TL,TL,TL,TL,TL,TL,TL,TL,TD,_],
    [TD,TL,TA,TL,TL,TL,TL,TL,TL,TA,TL,TD],
    [TD,TL,TL,TE,TL,TL,TL,TL,TE,TL,TL,TD],
    [TD,TL,TL,TL,TL,TL,TL,TL,TL,TL,TL,TD],
    [TD,TL,TL,TL,TL,TL,TL,TL,TL,TL,TL,TD],
    [TD,TA,TL,TL,TL,TL,TL,TL,TL,TL,TA,TD],
    [TD,TL,TL,TL,TL,TL,TL,TL,TL,TL,TL,TD],
    [_,TD,TL,TL,TL,TL,TL,TL,TL,TL,TD,_],
    [_,TD,TD,TL,_,_,_,_,TL,TD,TD,_],
    [_,_,TD,TL,_,_,_,_,TL,TD,_,_],
    [_,_,TD,TD,_,_,_,_,TD,TD,_,_],
  ];
  const TF1 = [
    [_,_,TD,TD,TD,TD,TD,TD,TD,TD,_,_],
    [_,TD,TL,TL,TL,TL,TL,TL,TL,TL,TD,_],
    [TD,TL,TA,TL,TL,TL,TL,TL,TL,TA,TL,TD],
    [TD,TL,TL,TE,TL,TL,TL,TL,TE,TL,TL,TD],
    [TD,TL,TL,TL,TL,TL,TL,TL,TL,TL,TL,TD],
    [TD,TL,TL,TL,TL,TL,TL,TL,TL,TL,TL,TD],
    [TD,TA,TL,TL,TL,TL,TL,TL,TL,TL,TA,TD],
    [TD,TL,TL,TL,TL,TL,TL,TL,TL,TL,TL,TD],
    [_,TD,TL,TL,TL,TL,TL,TL,TL,TL,TD,_],
    [_,TD,TD,TL,TL,_,_,TL,TL,TD,TD,_],
    [_,_,_,TL,TL,_,_,TL,TL,_,_,_],
    [_,_,_,TD,TD,_,_,TD,TD,_,_,_],
  ];
  const TANK_FRAMES = [TF0, TF1];

  // ── shooter frames (8 × 8, ps = 2) ────────────────────────────────────
  const SF0 = [
    [_,_,CL,CL,CL,CL,_,_],
    [_,CL,CD,CL,CL,CD,CL,_],
    [_,CL,CG2,CL,CL,CG2,CL,_],
    [_,CL,CL,CL,CL,CL,CL,_],
    [CG,CG,CG2,CG2,CG2,CG2,CL,CL],
    [CG,CG,CG2,CG2,CG2,CG2,CL,CL],
    [_,CD,CD,_,_,CD,CD,_],
    [_,CD,CD,_,_,CD,CD,_],
  ];
  const SF1 = [
    [_,_,CL,CL,CL,CL,_,_],
    [_,CL,CD,CL,CL,CD,CL,_],
    [_,CL,CG2,CL,CL,CG2,CL,_],
    [_,CL,CL,CL,CL,CL,CL,_],
    [CG,CG,CG2,CG2,CG2,CG2,CL,CL],
    [CG,CG,CG2,CG2,CG2,CG2,CL,CL],
    [CD,CD,CD,_,_,CD,_,_],
    [_,CD,CD,_,_,CD,_,_],
  ];
  const SHOOTER_FRAMES = [SF0, SF1];

  // ── pre-render to off-screen canvases ─────────────────────────────────
  function prerenderFrames(frames, ps) {
    return frames.map(data => {
      const oc = document.createElement('canvas');
      oc.width  = data[0].length * ps;
      oc.height = data.length    * ps;
      drawPixelArt(oc.getContext('2d'), data, 0, 0, ps);
      return oc;
    });
  }

  let PCACHE, GCACHE, FCACHE, TCACHE, SCACHE;

  function init() {
    PCACHE = prerenderFrames(PLAYER_FRAMES, 2);
    GCACHE = prerenderFrames(GRUNT_FRAMES,  2);
    FCACHE = prerenderFrames(FAST_FRAMES,   2);
    TCACHE = prerenderFrames(TANK_FRAMES,   2);
    SCACHE = prerenderFrames(SHOOTER_FRAMES,2);
  }

  // ── public draw: player ───────────────────────────────────────────────
  function drawPlayer(ctx, player) {
    const frame = PCACHE[player.walkFrame];
    ctx.drawImage(frame, Math.round(player.x - frame.width / 2), Math.round(player.y - frame.height / 2));

    // gun arm (rotates toward mouse)
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));
    ctx.rotate(player.angle);
    ctx.fillStyle = '#37474f';
    ctx.fillRect(2, -4, 9, 7);   // grip
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(6, -2, 14, 4);  // barrel
    ctx.restore();

    // muzzle flash
    if (player.muzzleFlash > 0) {
      const bx = Math.cos(player.angle) * 20;
      const by = Math.sin(player.angle) * 20;
      ctx.save();
      ctx.translate(Math.round(player.x), Math.round(player.y));
      ctx.globalAlpha = Math.min(1, player.muzzleFlash / 0.03);
      ctx.fillStyle = '#fff9c4';
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // invincibility flicker
    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#29b6f6';
      ctx.beginPath();
      ctx.arc(Math.round(player.x), Math.round(player.y), 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ── public draw: enemy ────────────────────────────────────────────────
  function drawEnemy(ctx, enemy) {
    const caches = { grunt: GCACHE, fast: FCACHE, tank: TCACHE, shooter: SCACHE };
    const cache = caches[enemy.type];
    const frame = cache[enemy.walkFrame % cache.length];
    ctx.drawImage(frame, Math.round(enemy.x - frame.width / 2), Math.round(enemy.y - frame.height / 2));

    // shooter gun
    if (enemy.type === 'shooter') {
      ctx.save();
      ctx.translate(Math.round(enemy.x), Math.round(enemy.y));
      ctx.rotate(enemy.angle);
      ctx.fillStyle = '#37474f';
      ctx.fillRect(4, -2, 12, 4);
      ctx.restore();
    }

    // damage flash
    if (enemy.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, enemy.flashTimer / 0.06);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.round(enemy.x), Math.round(enemy.y), enemy.radius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // HP bar (only when damaged)
    if (enemy.hp < enemy.maxHp) {
      const bw = enemy.radius * 2 + 6;
      const bx = Math.round(enemy.x - bw / 2);
      const by = Math.round(enemy.y - enemy.radius - 7);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = '#e53935';
      ctx.fillRect(bx, by, Math.round(bw * (enemy.hp / enemy.maxHp)), 3);
    }
  }

  return { init, drawPlayer, drawEnemy };
})();
