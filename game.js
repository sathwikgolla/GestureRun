(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const statusEl = document.getElementById('status');
  const overlayEl = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const secureHintEl = document.getElementById('secureHint');
  const startForm = document.getElementById('startForm');
  const gameInfo = document.getElementById('gameInfo');
  const playerNameInput = document.getElementById('playerName');
  const themeSelect = document.getElementById('themeSelect');

  let W = canvas.width;
  let H = canvas.height;
  let dpr = 1;
  let scale = 1;
  let currentTheme = 'normal';
  let playerName = '';

  const STATE = {
    WAITING: 'WAITING',
    RUNNING: 'RUNNING',
    GAME_OVER: 'GAME_OVER',
  };

  const road = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };

  function laneX(lane) {
    const t = (1 + lane * 2) / 6;
    return road.left + (road.right - road.left) * t;
  }

  function updateLayout() {
    scale = Math.max(0.75, Math.min(1.65, Math.min(W, H) / 720));
    road.top = Math.round(H * 0.14);
    road.bottom = Math.round(H * 0.92);
    road.left = Math.round(W * 0.24);
    road.right = Math.round(W * 0.76);

    player.w = 56 * scale;
    player.hStand = 98 * scale;
    player.hSlide = 58 * scale;
    player.w = Math.round(player.w);
    player.hStand = Math.round(player.hStand);
    player.hSlide = Math.round(player.hSlide);

    if (player.onGround) {
      player.y = road.bottom;
      player.vy = 0;
    } else {
      player.y = Math.min(player.y, road.bottom);
    }
  }

  function resizeCanvas() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    updateLayout();
    player.x = laneX(player.laneTarget);
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Game parameters
  const cfg = {
    speedStart: 620,
    speedMax: 1550,
    speedRamp: 26,
    spawnMin: 0.52,
    spawnMax: 1.05,
    gravity: 3200,
    jumpVel: 1180,
    laneLerp: 14,
    slideDuration: 0.55,
    minGestureInterval: 0.18,
    coinChance: 0.55,
  };

  const player = {
    lane: 1,
    laneTarget: 1,
    x: 0,
    y: 0,
    vy: 0,
    onGround: true,
    w: 56,
    h: 92,
    hStand: 92,
    hSlide: 54,
    isSliding: false,
    slideT: 0,
    lastActionT: -999,
  };

  const obstacles = [];
  const coins = [];

  let gameState = STATE.WAITING;
  let score = 0;
  let coinCount = 0;
  let speed = cfg.speedStart;
  let lastTs = 0;
  let spawnTimer = 0;
  let nextSpawn = 0.9;

  function resetGame() {
    obstacles.length = 0;
    coins.length = 0;
    score = 0;
    coinCount = 0;
    speed = cfg.speedStart * scale;
    spawnTimer = 0;
    nextSpawn = rand(cfg.spawnMin, cfg.spawnMax);

    player.lane = 1;
    player.laneTarget = 1;
    player.x = laneX(1);
    player.y = road.bottom;
    player.vy = 0;
    player.onGround = true;
    player.isSliding = false;
    player.slideT = 0;
    player.lastActionT = -999;

    scoreEl.textContent = '0';
    if (coinsEl) coinsEl.textContent = '0';
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      playerName = playerNameInput.value.trim() || 'Player';
      currentTheme = themeSelect.value;
      startForm.style.display = 'none';
      gameInfo.style.display = 'block';
      window.GestureRunner.start();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      window.GestureRunner.restart();
    });
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function hash01(n) {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function showOverlay(title, buttonText) {
    overlayEl.classList.remove('hidden');
    overlayEl.querySelector('h1').textContent = title;
    if (startBtn) startBtn.textContent = buttonText || 'Start';
  }

  function hideOverlay() {
    overlayEl.classList.add('hidden');
  }

  function nowSec(ts) {
    return ts / 1000;
  }

  function canAct(ts) {
    return nowSec(ts) - player.lastActionT >= cfg.minGestureInterval;
  }

  function moveLane(dir, ts) {
    if (!canAct(ts)) return;
    player.laneTarget = clamp(player.laneTarget + dir, 0, 2);
    player.lastActionT = nowSec(ts);
  }

  function jump(ts) {
    if (!canAct(ts)) return;
    if (!player.onGround) return;
    player.vy = -cfg.jumpVel * scale;
    player.onGround = false;
    player.isSliding = false;
    player.slideT = 0;
    player.lastActionT = nowSec(ts);
  }

  function slide(ts) {
    if (!canAct(ts)) return;
    if (!player.onGround) return;
    player.isSliding = true;
    player.slideT = cfg.slideDuration;
    player.lastActionT = nowSec(ts);
  }

  // Expose gesture-controlled API (no keyboard/mouse)
  window.GestureRunner = {
    start() {
      if (gameState === STATE.RUNNING) return;
      resetGame();
      gameState = STATE.RUNNING;
      hideOverlay();
      setStatus('Running');
    },
    restart() {
      resetGame();
      gameState = STATE.RUNNING;
      hideOverlay();
      setStatus('Running');
    },
    gameOver() {
      if (gameState !== STATE.RUNNING) return;
      gameState = STATE.GAME_OVER;
      setStatus('Game Over');
      showOverlay('Game Over', 'Restart');
    },
    onGesture(gesture, ts) {
      // Allow "UP" (JUMP) gesture to start/restart without any mouse/keyboard.
      if (gameState === STATE.WAITING && gesture === 'JUMP') {
        window.GestureRunner.start();
        return;
      }
      if (gameState === STATE.GAME_OVER && gesture === 'JUMP') {
        window.GestureRunner.restart();
        return;
      }
      if (gameState !== STATE.RUNNING) return;
      if (!ts) ts = performance.now();
      switch (gesture) {
        case 'LEFT':
          moveLane(-1, ts);
          break;
        case 'RIGHT':
          moveLane(1, ts);
          break;
        case 'JUMP':
          jump(ts);
          break;
        case 'SLIDE':
          slide(ts);
          break;
        default:
          break;
      }
    },
    getState() {
      return gameState;
    },
  };

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);

    let kind;
    if (currentTheme === 'city') {
      const r = Math.random();
      kind = r < 0.42 ? 'BARRIER' : r < 0.64 ? 'CONE' : r < 0.83 ? 'OVERHEAD' : 'TRAIN';
    } else if (currentTheme === 'forest') {
      const r = Math.random();
      kind = r < 0.42 ? 'LOG' : r < 0.64 ? 'ROCK' : r < 0.83 ? 'VINE' : 'BOULDER';
    } else {
      const r = Math.random();
      kind = r < 0.42 ? 'BARRIER' : r < 0.64 ? 'CONE' : r < 0.83 ? 'OVERHEAD' : 'TRAIN';
    }

    obstacles.push({ lane, y: road.top - 140 * scale, kind, passed: false });

    if (Math.random() < cfg.coinChance) {
      const coinLane = Math.random() < 0.7 ? lane : Math.floor(Math.random() * 3);
      coins.push({ lane: coinLane, y: road.top - 220 * scale });
    }
  }

  function update(dt, ts) {
    if (gameState !== STATE.RUNNING) return;

    // Speed ramp
    speed = Math.min(cfg.speedMax * scale, speed + cfg.speedRamp * scale * dt);

    // Score
    score += dt * 12;
    scoreEl.textContent = Math.floor(score).toString();

    // Player lane smoothing
    const targetX = laneX(player.laneTarget);
    const k = 1 - Math.exp(-cfg.laneLerp * dt);
    player.x = player.x + (targetX - player.x) * k;

    // Snap lane index if close enough
    if (Math.abs(player.x - targetX) < 0.5) {
      player.x = targetX;
      player.lane = player.laneTarget;
    }

    // Jump physics
    player.vy += cfg.gravity * scale * dt;
    player.y += player.vy * dt;

    if (player.y >= road.bottom) {
      player.y = road.bottom;
      player.vy = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    // Slide
    if (player.isSliding) {
      player.slideT -= dt;
      if (player.slideT <= 0) {
        player.isSliding = false;
        player.slideT = 0;
      }
    }

    // Spawning
    spawnTimer += dt;
    if (spawnTimer >= nextSpawn) {
      spawnTimer = 0;
      nextSpawn = rand(cfg.spawnMin, cfg.spawnMax);
      spawnObstacle();
    }

    // Move obstacles towards the player (down the screen)
    const obsSpeed = speed;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += obsSpeed * dt;
      if (o.y > H + 220 * scale) {
        obstacles.splice(i, 1);
      }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.y += obsSpeed * dt;
      if (c.y > H + 160 * scale) coins.splice(i, 1);
    }

    // Collision
    const pRect = getPlayerRect();
    for (const o of obstacles) {
      const oRect = getObstacleRect(o);
      if (rectsOverlap(pRect, oRect)) {
        window.GestureRunner.gameOver();
        break;
      }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (coinOverlap(pRect, c)) {
        coins.splice(i, 1);
        coinCount += 1;
        score += 55;
        if (coinsEl) coinsEl.textContent = coinCount.toString();
      }
    }
  }

  function getPlayerRect() {
    const h = player.isSliding ? player.hSlide : player.hStand;
    const w = player.w;
    const x = player.x - w / 2;
    const y = player.y - h;
    return { x, y, w, h };
  }

  function getObstacleRect(o) {
    const xCenter = laneX(o.lane);

    // City obstacles
    if (o.kind === 'BARRIER') {
      const w = 84 * scale;
      const h = 78 * scale;
      return { x: xCenter - w / 2, y: o.y - h, w, h };
    }
    if (o.kind === 'CONE') {
      const w = 52 * scale;
      const h = 62 * scale;
      return { x: xCenter - w / 2, y: o.y - h, w, h };
    }
    if (o.kind === 'OVERHEAD') {
      const w = 150 * scale;
      const h = 26 * scale;
      const lift = 92 * scale;
      return { x: xCenter - w / 2, y: o.y - lift - h, w, h };
    }
    if (o.kind === 'TRAIN') {
      const w = 122 * scale;
      const h = 170 * scale;
      return { x: xCenter - w / 2, y: o.y - h, w, h };
    }

    // Forest obstacles
    if (o.kind === 'LOG') {
      const w = 84 * scale;
      const h = 78 * scale;
      return { x: xCenter - w / 2, y: o.y - h, w, h };
    }
    if (o.kind === 'ROCK') {
      const w = 52 * scale;
      const h = 62 * scale;
      return { x: xCenter - w / 2, y: o.y - h, w, h };
    }
    if (o.kind === 'VINE') {
      const w = 150 * scale;
      const h = 26 * scale;
      const lift = 92 * scale;
      return { x: xCenter - w / 2, y: o.y - lift - h, w, h };
    }
    // BOULDER fallback
    const w = 122 * scale;
    const h = 170 * scale;
    return { x: xCenter - w / 2, y: o.y - h, w, h };
  }

  function coinOverlap(pRect, c) {
    const x = laneX(c.lane);
    const y = c.y;
    const r = 14 * scale;

    const cx = clamp(x, pRect.x, pRect.x + pRect.w);
    const cy = clamp(y, pRect.y, pRect.y + pRect.h);
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy < r * r;
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    drawBackground(ts);
    drawRoad(ts);
    drawCoins(ts);
    drawObstacles();
    drawPlayer();

    if (gameState === STATE.WAITING) {
      drawCenterText('Allow camera, then press Start');
    }

    if (gameState === STATE.GAME_OVER) {
      drawCenterText('Game Over');
    }
  }

  function drawRoad(ts) {
    const w = road.right - road.left;
    const h = road.bottom - road.top;

    const base = ctx.createLinearGradient(road.left, road.top, road.right, road.bottom);
    base.addColorStop(0, 'rgba(255,255,255,0.08)');
    base.addColorStop(0.35, 'rgba(255,255,255,0.03)');
    base.addColorStop(1, 'rgba(0,0,0,0.22)');

    ctx.fillStyle = base;
    roundRect(ctx, road.left, road.top, w, h, 22);
    ctx.fill();

    let edge;
    if (currentTheme === 'city') {
      edge = ctx.createLinearGradient(0, road.top, 0, road.bottom);
      edge.addColorStop(0, 'rgba(70, 220, 255, 0.35)');
      edge.addColorStop(0.5, 'rgba(124, 92, 255, 0.22)');
      edge.addColorStop(1, 'rgba(255, 120, 60, 0.20)');
    } else if (currentTheme === 'forest') {
      edge = ctx.createLinearGradient(0, road.top, 0, road.bottom);
      edge.addColorStop(0, 'rgba(80, 120, 60, 0.35)');
      edge.addColorStop(0.5, 'rgba(34, 68, 34, 0.22)');
      edge.addColorStop(1, 'rgba(101, 67, 33, 0.20)');
    } else {
      // Normal
      edge = ctx.createLinearGradient(0, road.top, 0, road.bottom);
      edge.addColorStop(0, 'rgba(70, 220, 255, 0.35)');
      edge.addColorStop(0.5, 'rgba(124, 92, 255, 0.22)');
      edge.addColorStop(1, 'rgba(255, 120, 60, 0.20)');
    }

    ctx.strokeStyle = edge;
    ctx.lineWidth = 4;
    roundRect(ctx, road.left + 2, road.top + 2, w - 4, h - 4, 22);
    ctx.stroke();

    const lineA = road.left + w * (2 / 6);
    const lineB = road.left + w * (4 / 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18 * scale, 22 * scale]);

    ctx.beginPath();
    ctx.moveTo(lineA, road.top + 18);
    ctx.lineTo(lineA, road.bottom - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lineB, road.top + 18);
    ctx.lineTo(lineB, road.bottom - 10);
    ctx.stroke();

    ctx.setLineDash([]);

    const t = nowSec(ts);
    const stripeGap = 96 * scale;
    const stripeLen = 42 * scale;
    const scroll = (t * speed) % stripeGap;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 6 * scale;
    for (let y = road.top + 18 - scroll; y < road.bottom; y += stripeGap) {
      ctx.beginPath();
      ctx.moveTo(laneX(1), y);
      ctx.lineTo(laneX(1), y + stripeLen);
      ctx.stroke();
    }
  }

  function drawBackground(ts) {
    const t = nowSec(ts);
    const hue = (t * 10) % 360;

    let sky, glow;
    if (currentTheme === 'city') {
      sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `hsla(${(hue + 220) % 360}, 70%, 18%, 1)`);
      sky.addColorStop(0.55, `hsla(${(hue + 260) % 360}, 70%, 10%, 1)`);
      sky.addColorStop(1, 'rgba(0,0,0,1)');

      glow = ctx.createRadialGradient(W * 0.5, H * 0.2, 0, W * 0.5, H * 0.25, Math.max(W, H));
      glow.addColorStop(0, `hsla(${(hue + 290) % 360}, 80%, 60%, 0.16)`);
      glow.addColorStop(0.35, `hsla(${(hue + 160) % 360}, 80%, 60%, 0.10)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (currentTheme === 'forest') {
      sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `hsla(${(hue + 100) % 360}, 45%, 12%, 1)`);
      sky.addColorStop(0.55, `hsla(${(hue + 120) % 360}, 50%, 8%, 1)`);
      sky.addColorStop(1, 'rgba(0,0,0,1)');

      glow = ctx.createRadialGradient(W * 0.5, H * 0.2, 0, W * 0.5, H * 0.25, Math.max(W, H));
      glow.addColorStop(0, `hsla(${(hue + 70) % 360}, 70%, 30%, 0.12)`);
      glow.addColorStop(0.35, `hsla(${(hue + 40) % 360}, 70%, 20%, 0.08)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      // Normal
      sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `hsla(${(hue + 220) % 360}, 70%, 18%, 1)`);
      sky.addColorStop(0.55, `hsla(${(hue + 260) % 360}, 70%, 10%, 1)`);
      sky.addColorStop(1, 'rgba(0,0,0,1)');

      glow = ctx.createRadialGradient(W * 0.5, H * 0.2, 0, W * 0.5, H * 0.25, Math.max(W, H));
      glow.addColorStop(0, `hsla(${(hue + 290) % 360}, 80%, 60%, 0.16)`);
      glow.addColorStop(0.35, `hsla(${(hue + 160) % 360}, 80%, 60%, 0.10)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
    }

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const sideW = Math.max(80, (W - (road.right - road.left)) * 0.5);
    drawParallaxSide(0, sideW, t, 0.35);
    drawParallaxSide(W - sideW, sideW, t, 0.55);
  }

  function drawParallaxSide(x0, w, t, depth) {
    const scroll = (t * speed * depth) % (140 * scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, H);
    ctx.clip();

    const step = 140 * scale;
    let i = 0;
    for (let y = -scroll; y < H + 160 * scale; y += step) {
      const seed = (x0 + 1) * 0.001 + i * 0.13;
      const r1 = hash01(seed);
      const r2 = hash01(seed + 9.7);
      const bw = w * (0.33 + r1 * 0.28);
      const bx = x0 + (w - bw) * 0.5 + (r2 - 0.5) * (w * 0.08);
      const bh = (90 + r2 * 160) * scale;

      if (currentTheme === 'city') {
        ctx.fillStyle = `rgba(255,255,255,${0.03 + depth * 0.03})`;
        ctx.fillRect(bx, y, bw, bh);
        ctx.fillStyle = `rgba(90,200,255,${0.05 + depth * 0.04})`;
        ctx.fillRect(bx + bw * 0.18, y + bh * 0.25, bw * 0.12, 10 * scale);
        ctx.fillStyle = `rgba(124,92,255,${0.05 + depth * 0.04})`;
        ctx.fillRect(bx + bw * 0.62, y + bh * 0.45, bw * 0.14, 10 * scale);
      } else if (currentTheme === 'forest') {
        ctx.fillStyle = `rgba(40, 30, 20, ${0.35 + depth * 0.08})`;
        ctx.fillRect(bx, y, bw, bh);
        ctx.fillStyle = `rgba(34, 68, 34, ${0.45 + depth * 0.1})`;
        ctx.beginPath();
        ctx.arc(bx + bw / 2, y, bw * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(80, 120, 60, ${0.25 + depth * 0.07})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.18, y);
        ctx.lineTo(bx + bw * 0.18, y + bh * 0.6);
        ctx.stroke();
      } else {
        // Normal
        ctx.fillStyle = `rgba(255,255,255,${0.03 + depth * 0.03})`;
        ctx.fillRect(bx, y, bw, bh);
        ctx.fillStyle = `rgba(90,200,255,${0.05 + depth * 0.04})`;
        ctx.fillRect(bx + bw * 0.18, y + bh * 0.25, bw * 0.12, 10 * scale);
        ctx.fillStyle = `rgba(124,92,255,${0.05 + depth * 0.04})`;
        ctx.fillRect(bx + bw * 0.62, y + bh * 0.45, bw * 0.14, 10 * scale);
      }

      i++;
    }

    ctx.restore();
  }

  function drawCoins(ts) {
    for (const c of coins) {
      const x = laneX(c.lane);
      const y = c.y;
      const r = 14 * scale;

      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      g.addColorStop(0.2, 'rgba(255, 238, 120, 0.95)');
      g.addColorStop(1, 'rgba(255, 150, 40, 0.95)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r - 2, 0, Math.PI * 2);
      ctx.stroke();

      // Glow effect
      ctx.shadowColor = 'rgba(255, 238, 120, 0.6)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function drawObstacles() {
    for (const o of obstacles) {
      const r = getObstacleRect(o);
      const xCenter = laneX(o.lane);

      // City obstacles
      if (o.kind === 'CONE') {
        ctx.fillStyle = 'rgba(255, 140, 60, 0.95)';
        ctx.beginPath();
        ctx.moveTo(xCenter, r.y);
        ctx.lineTo(r.x + r.w, r.y + r.h);
        ctx.lineTo(r.x, r.y + r.h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(r.x + r.w * 0.2, r.y + r.h * 0.55, r.w * 0.6, 6 * scale);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(r.x + r.w * 0.18, r.y + r.h * 0.88, r.w * 0.64, 5 * scale);
      } else if (o.kind === 'OVERHEAD') {
        ctx.fillStyle = 'rgba(90, 200, 255, 0.90)';
        roundRect(ctx, r.x, r.y, r.w, r.h, 10);
        ctx.fill();

        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        roundRect(ctx, r.x + 6 * scale, r.y + 4 * scale, r.w - 12 * scale, r.h - 8 * scale, 8);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x + 12 * scale, r.y + r.h / 2);
        ctx.lineTo(r.x + r.w - 12 * scale, r.y + r.h / 2);
        ctx.stroke();
      } else if (o.kind === 'TRAIN') {
        const body = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        body.addColorStop(0, 'rgba(255, 70, 120, 0.92)');
        body.addColorStop(1, 'rgba(124, 92, 255, 0.90)');
        ctx.fillStyle = body;
        roundRect(ctx, r.x, r.y, r.w, r.h, 18);
        ctx.fill();

        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        roundRect(ctx, r.x + 8 * scale, r.y + 18 * scale, r.w - 16 * scale, 40 * scale, 12);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 3; i++) {
          const wx = r.x + (18 + i * 30) * scale;
          roundRect(ctx, wx, r.y + 26 * scale, 18 * scale, 22 * scale, 6);
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(r.x + 10 * scale, r.y + r.h - 22 * scale, r.w - 20 * scale, 8 * scale);
      } else if (o.kind === 'BARRIER') {
        const body = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        body.addColorStop(0, 'rgba(255, 90, 90, 0.95)');
        body.addColorStop(1, 'rgba(255, 190, 70, 0.90)');
        ctx.fillStyle = body;
        roundRect(ctx, r.x, r.y, r.w, r.h, 14);
        ctx.fill();

        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(r.x + 8 * scale, r.y + 10 * scale, r.w - 16 * scale, 10 * scale);
        ctx.fillRect(r.x + 8 * scale, r.y + 30 * scale, r.w - 16 * scale, 10 * scale);

        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(r.x + 10 * scale, r.y + r.h - 12 * scale);
        ctx.lineTo(r.x + r.w - 10 * scale, r.y + r.h - 12 * scale);
        ctx.stroke();
      }
      // Forest obstacles
      else if (o.kind === 'LOG') {
        const body = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        body.addColorStop(0, 'rgba(101, 67, 33, 0.95)');
        body.addColorStop(0.5, 'rgba(139, 90, 43, 0.95)');
        body.addColorStop(1, 'rgba(101, 67, 33, 0.95)');
        ctx.fillStyle = body;
        roundRect(ctx, r.x, r.y, r.w, r.h, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(61, 43, 31, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(r.x + 8 * scale, r.y + (12 + i * 18) * scale);
          ctx.lineTo(r.x + r.w - 8 * scale, r.y + (12 + i * 18) * scale);
          ctx.stroke();
        }
      } else if (o.kind === 'ROCK') {
        ctx.fillStyle = 'rgba(105, 105, 105, 0.95)';
        ctx.beginPath();
        ctx.ellipse(xCenter, r.y + r.h * 0.6, r.w * 0.5, r.h * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(80, 80, 80, 0.6)';
        ctx.beginPath();
        ctx.ellipse(xCenter - r.w * 0.15, r.y + r.h * 0.5, r.w * 0.15, r.h * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === 'VINE') {
        ctx.strokeStyle = 'rgba(80, 120, 60, 0.90)';
        ctx.lineWidth = 8 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xCenter, r.y);
        ctx.lineTo(xCenter, r.y + r.h);
        ctx.stroke();

        ctx.fillStyle = 'rgba(34, 68, 34, 0.85)';
        for (let i = 0; i < 4; i++) {
          const ly = r.y + (i + 1) * (r.h / 5);
          ctx.beginPath();
          ctx.ellipse(xCenter - 12 * scale, ly, 10 * scale, 4 * scale, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(xCenter + 12 * scale, ly + 6 * scale, 10 * scale, 4 * scale, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (o.kind === 'BOULDER') {
        const body = ctx.createRadialGradient(xCenter, r.y + r.h * 0.6, 1, xCenter, r.y + r.h * 0.6, r.w * 0.5);
        body.addColorStop(0, 'rgba(139, 90, 43, 0.95)');
        body.addColorStop(0.6, 'rgba(101, 67, 33, 0.95)');
        body.addColorStop(1, 'rgba(61, 43, 31, 0.95)');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(xCenter, r.y + r.h * 0.6, r.w * 0.5, r.h * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(40, 30, 20, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xCenter - r.w * 0.2, r.y + r.h * 0.4);
        ctx.lineTo(xCenter + r.w * 0.1, r.y + r.h * 0.7);
        ctx.stroke();
      }
    }
  }

  function drawPlayer() {
    const r = getPlayerRect();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(player.x, road.bottom + 8 * scale, 42 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyGrad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    bodyGrad.addColorStop(0, 'rgba(124, 92, 255, 0.95)');
    bodyGrad.addColorStop(1, 'rgba(70, 220, 255, 0.85)');

    ctx.fillStyle = bodyGrad;
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    ctx.stroke();

    // Face-ish
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(r.x + r.w * 0.35, r.y + r.h * 0.25, 5, 0, Math.PI * 2);
    ctx.arc(r.x + r.w * 0.65, r.y + r.h * 0.25, 5, 0, Math.PI * 2);
    ctx.fill();

    // Slide indicator
    if (player.isSliding) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 3;
      roundRect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 18);
      ctx.stroke();
    }
  }

  function drawCenterText(text) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '800 30px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function tick(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.034, (ts - lastTs) / 1000);
    lastTs = ts;

    update(dt, ts);
    draw(ts);

    requestAnimationFrame(tick);
  }

  function updateSecureHint() {
    // Helpful hint: camera requires https or localhost
    const isLocalhost =
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '';

    if (location.protocol !== 'https:' && !isLocalhost) {
      secureHintEl.textContent =
        'Camera access may be blocked unless you use HTTPS or run from http://localhost.';
    } else if (location.protocol === 'file:') {
      secureHintEl.textContent =
        'If camera permission fails when opening the file directly, run a simple local server and open via http://localhost.';
    } else {
      secureHintEl.textContent = '';
    }
  }

  function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    resetGame();
    setStatus('Waiting…');
    showOverlay('Gesture Runner', 'Start');
    updateSecureHint();
    requestAnimationFrame(tick);
  }

  init();
})();
