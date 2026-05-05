(function () {
  const pageId = document.body.dataset.page;
  const data = window.SITE_DATA || {};

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function initAsteroidGame() {
    const canvas = document.querySelector("[data-asteroid-canvas]");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const startButton = document.querySelector("[data-asteroid-start]");
    const pauseButton = document.querySelector("[data-asteroid-pause]");
    const resetButton = document.querySelector("[data-asteroid-reset]");
    const statusEl = document.querySelector("[data-asteroid-status]");
    const scoreEl = document.querySelector("[data-asteroid-score]");
    const bestEl = document.querySelector("[data-asteroid-best]");
    const killsEl = document.querySelector("[data-asteroid-kills]");
    const sectorEl = document.querySelector("[data-asteroid-sector]");
    const WIDTH = 800;
    const HEIGHT = 600;
    const PLAYER = {
      width: 75,
      height: 50,
      speed: 260,
      hitbox: { x: 18, y: 11, width: 38, height: 28 }
    };
    const MISSILE = {
      width: 60,
      height: 30,
      speedMin: 240,
      speedMax: 520,
      hitbox: { x: 9, y: 7, width: 42, height: 16 }
    };
    const LASER = {
      width: 20,
      height: 6,
      speed: 690,
      cooldown: 0.22,
      hitbox: { x: 2, y: 1, width: 16, height: 4 }
    };
    const SECTOR_DURATION = 18;
    const SECTORS = [
      {
        name: "Launch Corridor",
        top: "#04101d",
        bottom: "#0a1c33",
        debrisWeights: { asteroid: 4, rock: 2, comet: 1 },
        debrisInterval: 0.98,
        missileInterval: 0.34,
        missileSpeedScale: 1,
        starSpeedScale: 1,
        nebulae: [
          { x: 0.17, y: 0.23, radius: 190, inner: "rgba(55, 125, 196, 0.18)", drift: 0.22, swing: 26 },
          { x: 0.82, y: 0.76, radius: 220, inner: "rgba(18, 71, 128, 0.22)", drift: 0.18, swing: 18 }
        ],
        bodies: [
          { x: -0.02, y: 0.84, radius: 132, fill: "#102846", glow: "rgba(78, 148, 230, 0.16)", drift: 0.11, swing: 18, ring: "rgba(179, 211, 255, 0.14)", ringScaleX: 1.95, ringScaleY: 0.34, tilt: -0.34 },
          { x: 0.86, y: 0.18, radius: 54, fill: "#16385f", glow: "rgba(63, 149, 255, 0.12)", drift: 0.15, swing: 10 }
        ]
      },
      {
        name: "Comet Wash",
        top: "#061522",
        bottom: "#133457",
        debrisWeights: { asteroid: 2, rock: 1, comet: 4 },
        debrisInterval: 0.8,
        missileInterval: 0.28,
        missileSpeedScale: 1.08,
        starSpeedScale: 1.18,
        nebulae: [
          { x: 0.12, y: 0.75, radius: 220, inner: "rgba(70, 189, 215, 0.16)", drift: 0.28, swing: 28 },
          { x: 0.72, y: 0.25, radius: 170, inner: "rgba(134, 181, 255, 0.18)", drift: 0.2, swing: 20 }
        ],
        bodies: [
          { x: 0.86, y: 0.18, radius: 84, fill: "#164362", glow: "rgba(88, 207, 236, 0.18)", drift: 0.17, swing: 12 },
          { x: 0.27, y: 0.89, radius: 62, fill: "#103046", glow: "rgba(45, 174, 208, 0.12)", drift: 0.13, swing: 16 }
        ]
      },
      {
        name: "Red Dwarf Drift",
        top: "#170814",
        bottom: "#381322",
        debrisWeights: { asteroid: 3, rock: 4, comet: 1 },
        debrisInterval: 0.66,
        missileInterval: 0.24,
        missileSpeedScale: 1.14,
        starSpeedScale: 1.28,
        nebulae: [
          { x: 0.21, y: 0.2, radius: 210, inner: "rgba(202, 74, 94, 0.2)", drift: 0.24, swing: 30 },
          { x: 0.83, y: 0.58, radius: 200, inner: "rgba(255, 122, 81, 0.12)", drift: 0.16, swing: 18 }
        ],
        bodies: [
          { x: 0.88, y: 0.74, radius: 90, fill: "#4d0f1d", glow: "rgba(255, 110, 88, 0.22)", drift: 0.1, swing: 8 },
          { x: 0.08, y: 0.1, radius: 46, fill: "#5f1f2a", glow: "rgba(255, 140, 108, 0.14)", drift: 0.18, swing: 14 }
        ]
      },
      {
        name: "Nebula Rift",
        top: "#070e1c",
        bottom: "#27114a",
        debrisWeights: { asteroid: 2, rock: 2, comet: 3 },
        debrisInterval: 0.5,
        missileInterval: 0.2,
        missileSpeedScale: 1.24,
        starSpeedScale: 1.45,
        nebulae: [
          { x: 0.18, y: 0.72, radius: 230, inner: "rgba(118, 79, 210, 0.22)", drift: 0.19, swing: 25 },
          { x: 0.76, y: 0.28, radius: 210, inner: "rgba(88, 152, 255, 0.12)", drift: 0.27, swing: 34 }
        ],
        bodies: [
          { x: 0.22, y: 0.12, radius: 76, fill: "#31125a", glow: "rgba(163, 104, 255, 0.2)", drift: 0.15, swing: 16, ring: "rgba(198, 171, 255, 0.13)", ringScaleX: 1.8, ringScaleY: 0.28, tilt: 0.22 },
          { x: 0.89, y: 0.82, radius: 58, fill: "#13244f", glow: "rgba(78, 120, 255, 0.12)", drift: 0.19, swing: 11 }
        ]
      },
      {
        name: "Relay Expanse",
        top: "#030712",
        bottom: "#0d2440",
        debrisWeights: { asteroid: 4, rock: 3, comet: 2 },
        debrisInterval: 0.38,
        missileInterval: 0.17,
        missileSpeedScale: 1.34,
        starSpeedScale: 1.62,
        nebulae: [
          { x: 0.28, y: 0.18, radius: 210, inner: "rgba(42, 163, 255, 0.16)", drift: 0.24, swing: 22 },
          { x: 0.78, y: 0.68, radius: 240, inner: "rgba(18, 67, 137, 0.2)", drift: 0.14, swing: 16 }
        ],
        bodies: [
          { x: 0.16, y: 0.2, radius: 64, fill: "#0d2848", glow: "rgba(64, 155, 255, 0.15)", drift: 0.12, swing: 10 },
          { x: 0.88, y: 0.14, radius: 98, fill: "#0f3558", glow: "rgba(96, 187, 255, 0.14)", drift: 0.1, swing: 12, ring: "rgba(167, 221, 255, 0.12)", ringScaleX: 1.95, ringScaleY: 0.22, tilt: -0.48 }
        ]
      }
    ];
    const STORAGE_KEY = "portfolio-asteroid-best";
    const assetRoot = "external/asteroid-belt-adventure";
    const pressed = new Set();
    const stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      radius: randomBetween(0.8, 2.2),
      speed: randomBetween(18, 65),
      layer: randomBetween(0.75, 1.45)
    }));
    const state = {
      mode: "loading",
      player: { x: 72, y: HEIGHT / 2 - PLAYER.height / 2, width: PLAYER.width, height: PLAYER.height },
      missiles: [],
      debris: [],
      projectiles: [],
      explosions: [],
      score: 0,
      best: Number(window.localStorage.getItem(STORAGE_KEY) || 0),
      kills: 0,
      travelTime: 0,
      attractElapsed: 0,
      missileTimer: 0,
      debrisTimer: 0,
      shotCooldown: 0,
      lastSectorIndex: -1,
      lastFrame: performance.now(),
      assets: {}
    };

    function currentSector() {
      return SECTORS[Math.min(Math.floor(state.travelTime / SECTOR_DURATION), SECTORS.length - 1)];
    }

    function setStatus(message) {
      if (statusEl) statusEl.textContent = message;
    }

    function syncUi() {
      if (scoreEl) scoreEl.textContent = String(Math.floor(state.score));
      if (bestEl) bestEl.textContent = String(Math.floor(state.best));
      if (killsEl) killsEl.textContent = String(state.kills);
      if (sectorEl) sectorEl.textContent = currentSector().name;
      if (startButton) startButton.textContent = state.mode === "playing" ? "Restart Run" : "Start Game";
      if (pauseButton) {
        pauseButton.textContent = state.mode === "paused" ? "Resume" : "Pause";
        pauseButton.disabled = !["playing", "paused"].includes(state.mode);
      }
    }

    function resetPlayer() {
      state.player.x = 72;
      state.player.y = HEIGHT / 2 - PLAYER.height / 2;
    }

    function clearRound() {
      state.missiles = [];
      state.debris = [];
      state.projectiles = [];
      state.explosions = [];
      state.missileTimer = 0;
      state.debrisTimer = 0;
      state.shotCooldown = 0;
      state.score = 0;
      state.kills = 0;
      state.travelTime = 0;
      state.attractElapsed = 0;
      state.lastSectorIndex = -1;
      resetPlayer();
      syncUi();
    }

    function setBest(score) {
      if (score <= state.best) return;
      state.best = Math.floor(score);
      window.localStorage.setItem(STORAGE_KEY, String(state.best));
    }

    function beginGame() {
      clearRound();
      state.mode = "playing";
      state.lastFrame = performance.now();
      state.lastSectorIndex = 0;
      setStatus("Live run active. Space fires lasers.");
      syncUi();
      canvas.focus();
    }

    function resetToAttract(message) {
      clearRound();
      state.mode = "attract";
      state.lastFrame = performance.now();
      setStatus(message || "Press Space or Start Game to fly.");
      syncUi();
    }

    function togglePause() {
      if (state.mode === "playing") {
        state.mode = "paused";
        setStatus("Paused. Press P or Resume to continue.");
      } else if (state.mode === "paused") {
        state.mode = "playing";
        state.lastFrame = performance.now();
        setStatus("Back in flight.");
      }
      syncUi();
    }

    function drawRoundedRect(x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    }

    function entityBox(entity, hitbox) {
      return {
        x: entity.x + hitbox.x,
        y: entity.y + hitbox.y,
        width: hitbox.width,
        height: hitbox.height
      };
    }

    function boxesIntersect(a, b) {
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    function pickDebrisKind(sector) {
      const entries = Object.entries(sector.debrisWeights);
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = Math.random() * total;
      for (const [kind, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return kind;
      }
      return entries[entries.length - 1][0];
    }

    function spawnMissile(overrides = {}) {
      const sector = currentSector();
      const missile = {
        x: overrides.x ?? WIDTH + randomBetween(40, 140),
        y: overrides.y ?? randomBetween(18, HEIGHT - MISSILE.height - 18),
        width: MISSILE.width,
        height: MISSILE.height,
        speed: overrides.speed ?? randomBetween(MISSILE.speedMin, MISSILE.speedMax) * sector.missileSpeedScale
      };
      state.missiles.push(missile);
      return missile;
    }

    function spawnDebris() {
      const sector = currentSector();
      const kind = pickDebrisKind(sector);
      const size = kind === "comet" ? randomBetween(54, 130) : randomBetween(50, 190);
      state.debris.push({
        kind,
        x: WIDTH + randomBetween(40, 130),
        y: randomBetween(0, HEIGHT),
        width: size,
        height: size,
        speed: randomBetween(105, 170),
        angle: randomBetween(0, Math.PI * 2),
        spin: randomBetween(-0.9, 0.9),
        layer: randomBetween(0.72, 1.45),
        alpha: randomBetween(0.7, 1)
      });
    }

    function spawnExplosion(x, y, color = "255, 162, 92", radius = 34) {
      state.explosions.push({
        x,
        y,
        radius,
        color,
        life: 0.36,
        maxLife: 0.36
      });
    }

    function fireLaser() {
      if (state.mode !== "playing" || state.shotCooldown > 0) return false;
      state.projectiles.push({
        x: state.player.x + state.player.width - 2,
        y: state.player.y + state.player.height / 2 - LASER.height / 2,
        width: LASER.width,
        height: LASER.height,
        speed: LASER.speed
      });
      state.shotCooldown = LASER.cooldown;
      return true;
    }

    function drawText(text, x, y, size, color, align) {
      ctx.fillStyle = color;
      ctx.font = `600 ${size}px Poppins, Arial, sans-serif`;
      ctx.textAlign = align || "center";
      ctx.fillText(text, x, y);
    }

    function drawSectorBackdrop(sector) {
      const backdropTime = state.mode === "playing" ? state.travelTime : state.attractElapsed;
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, sector.top);
      gradient.addColorStop(1, sector.bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      sector.nebulae.forEach((nebula, index) => {
        const offsetX = Math.sin(backdropTime * nebula.drift + index) * nebula.swing;
        const offsetY = Math.cos(backdropTime * (nebula.drift * 0.8) + index) * (nebula.swing * 0.35);
        const x = nebula.x * WIDTH + offsetX;
        const y = nebula.y * HEIGHT + offsetY;
        const radial = ctx.createRadialGradient(x, y, 0, x, y, nebula.radius);
        radial.addColorStop(0, nebula.inner);
        radial.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(x, y, nebula.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      sector.bodies?.forEach((body, index) => {
        const offsetX = Math.sin(backdropTime * (body.drift || 0.1) + index) * (body.swing || 0);
        const offsetY = Math.cos(backdropTime * ((body.drift || 0.1) * 0.7) + index) * ((body.swing || 0) * 0.22);
        const x = body.x * WIDTH + offsetX;
        const y = body.y * HEIGHT + offsetY;
        const glow = ctx.createRadialGradient(x, y, body.radius * 0.2, x, y, body.radius * 1.65);
        glow.addColorStop(0, body.glow || "rgba(255, 255, 255, 0.1)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, body.radius * 1.65, 0, Math.PI * 2);
        ctx.fill();

        if (body.ring) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(body.tilt || 0);
          ctx.strokeStyle = body.ring;
          ctx.lineWidth = Math.max(2, body.radius * 0.08);
          ctx.beginPath();
          ctx.ellipse(0, 0, body.radius * (body.ringScaleX || 1.6), body.radius * (body.ringScaleY || 0.3), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        const disc = ctx.createRadialGradient(x - body.radius * 0.22, y - body.radius * 0.26, body.radius * 0.12, x, y, body.radius);
        disc.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        disc.addColorStop(0.38, body.fill);
        disc.addColorStop(1, "rgba(2, 8, 17, 0.92)");
        ctx.fillStyle = disc;
        ctx.beginPath();
        ctx.arc(x, y, body.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = "rgba(196, 213, 242, 0.06)";
      ctx.lineWidth = 1;
      for (let index = 0; index < 4; index += 1) {
        const offset = ((backdropTime * 55) + index * 160) % (WIDTH + 220);
        ctx.beginPath();
        ctx.moveTo(offset - 220, HEIGHT);
        ctx.lineTo(offset + 80, 0);
        ctx.stroke();
      }
    }

    function drawRocket() {
      const { rocket } = state.assets;
      const { x, y, width, height } = state.player;
      if (rocket) {
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(rocket, -width / 2, -height / 2, width, height);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.fillStyle = "#7f95f7";
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(-width / 2, -height / 2);
      ctx.lineTo(-width / 2, height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawMissile(missile) {
      const { missile: missileImage } = state.assets;
      if (missileImage) {
        ctx.save();
        ctx.translate(missile.x + missile.width / 2, missile.y + missile.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(missileImage, -missile.width / 2, -missile.height / 2, missile.width, missile.height);
        ctx.restore();
        return;
      }

      ctx.fillStyle = "#ef4836";
      ctx.fillRect(missile.x, missile.y, missile.width, missile.height);
    }

    function drawDebris(item) {
      const image = state.assets[item.kind];
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.angle);
      ctx.globalAlpha = item.alpha;
      if (image) {
        ctx.drawImage(image, -item.width / 2, -item.height / 2, item.width, item.height);
      } else {
        ctx.fillStyle = item.kind === "comet" ? "#9ca7ba" : "#707a8c";
        ctx.beginPath();
        ctx.arc(0, 0, item.width / 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawProjectile(projectile) {
      const gradient = ctx.createLinearGradient(projectile.x, projectile.y, projectile.x + projectile.width, projectile.y);
      gradient.addColorStop(0, "rgba(255, 247, 177, 0.32)");
      gradient.addColorStop(0.45, "#fdf0a0");
      gradient.addColorStop(1, "#ff8d49");
      ctx.fillStyle = gradient;
      drawRoundedRect(projectile.x, projectile.y, projectile.width, projectile.height, projectile.height / 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      drawRoundedRect(projectile.x + 4, projectile.y + 1.5, projectile.width - 8, projectile.height - 3, projectile.height / 2);
      ctx.fill();
    }

    function drawExplosion(explosion) {
      const progress = 1 - explosion.life / explosion.maxLife;
      const radius = explosion.radius * (0.4 + progress);
      const alpha = Math.max(explosion.life / explosion.maxLife, 0);
      ctx.save();
      ctx.strokeStyle = `rgba(${explosion.color}, ${0.8 * alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(${explosion.color}, ${0.2 * alpha})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function handleKey(event, active) {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "p"].includes(key)) {
        event.preventDefault();
      }

      if (key === " " && active) {
        if (["attract", "gameover"].includes(state.mode)) {
          beginGame();
        } else if (state.mode === "playing") {
          fireLaser();
        }
        return;
      }

      if (key === "p" && active) {
        togglePause();
        return;
      }

      if (!["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) return;
      if (active) {
        pressed.add(key);
      } else {
        pressed.delete(key);
      }
    }

    function update(delta) {
      const visualSector = currentSector();
      state.attractElapsed += delta;

      stars.forEach((star) => {
        const driftScale = state.mode === "playing" ? visualSector.starSpeedScale : 0.82;
        star.x -= star.speed * star.layer * driftScale * delta;
        if (star.x < -4) {
          star.x = WIDTH + randomBetween(0, 60);
          star.y = Math.random() * HEIGHT;
        }
      });

      if (state.mode === "playing") {
        state.travelTime += delta;
        const sectorIndex = Math.min(Math.floor(state.travelTime / SECTOR_DURATION), SECTORS.length - 1);
        if (sectorIndex !== state.lastSectorIndex) {
          state.lastSectorIndex = sectorIndex;
          setStatus(`Entering ${currentSector().name}. Space fires lasers.`);
          syncUi();
        }
      }

      if (state.mode === "paused") return;

      state.shotCooldown = Math.max(0, state.shotCooldown - delta);

      state.explosions.forEach((explosion) => {
        explosion.life -= delta;
      });
      state.explosions = state.explosions.filter((explosion) => explosion.life > 0);

      state.debrisTimer += delta;
      const activeSector = currentSector();
      const debrisInterval = state.mode === "playing" ? activeSector.debrisInterval : 1.04;
      while (state.debrisTimer >= debrisInterval) {
        spawnDebris();
        state.debrisTimer -= debrisInterval;
      }

      if (state.mode === "playing") {
        if (pressed.has("arrowup") || pressed.has("w")) state.player.y -= PLAYER.speed * delta;
        if (pressed.has("arrowdown") || pressed.has("s")) state.player.y += PLAYER.speed * delta;
        if (pressed.has("arrowleft") || pressed.has("a")) state.player.x -= PLAYER.speed * delta;
        if (pressed.has("arrowright") || pressed.has("d")) state.player.x += PLAYER.speed * delta;

        state.player.x = clamp(state.player.x, 0, WIDTH - state.player.width);
        state.player.y = clamp(state.player.y, 0, HEIGHT - state.player.height);

        state.missileTimer += delta;
        while (state.missileTimer >= activeSector.missileInterval) {
          spawnMissile();
          state.missileTimer -= activeSector.missileInterval;
        }

        state.score += delta * 10;
        syncUi();
      }

      state.debris.forEach((item) => {
        item.x -= item.speed * item.layer * delta;
        item.angle += item.spin * delta;
      });
      state.debris = state.debris.filter((item) => item.x + item.width > -80);

      state.projectiles.forEach((projectile) => {
        projectile.x += projectile.speed * delta;
      });
      state.projectiles = state.projectiles.filter((projectile) => projectile.x < WIDTH + 40);

      if (state.mode === "playing") {
        state.missiles.forEach((missile) => {
          missile.x -= missile.speed * delta;
        });

        const hitMissiles = new Set();
        state.projectiles = state.projectiles.filter((projectile) => {
          const projectileBox = entityBox(projectile, LASER.hitbox);
          let collided = false;
          for (let index = 0; index < state.missiles.length; index += 1) {
            if (hitMissiles.has(index)) continue;
            const missile = state.missiles[index];
            if (boxesIntersect(projectileBox, entityBox(missile, MISSILE.hitbox))) {
              hitMissiles.add(index);
              collided = true;
              state.kills += 1;
              state.score += 25;
              spawnExplosion(missile.x + missile.width / 2, missile.y + missile.height / 2, "255, 149, 88", 32);
              break;
            }
          }
          return !collided;
        });

        state.missiles = state.missiles.filter((missile, index) => !hitMissiles.has(index) && missile.x + missile.width > -80);

        const playerHit = entityBox(state.player, PLAYER.hitbox);
        if (state.missiles.some((missile) => boxesIntersect(playerHit, entityBox(missile, MISSILE.hitbox)))) {
          setBest(state.score);
          state.mode = "gameover";
          spawnExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, "125, 170, 255", 48);
          setStatus("Impact detected. Press Space or Start Game to try again.");
          syncUi();
        }
      }
    }

    function drawOverlay() {
      if (state.mode === "playing") return;

      ctx.fillStyle = "rgba(7, 14, 25, 0.52)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (state.mode === "paused") {
        drawText("Paused", WIDTH / 2, HEIGHT / 2 - 12, 54, "#dfe6f3");
        drawText("Press P or Resume to continue", WIDTH / 2, HEIGHT / 2 + 36, 24, "#9fb0c7");
        return;
      }

      if (state.mode === "gameover") {
        drawText("Impact Detected", WIDTH / 2, HEIGHT / 2 - 20, 52, "#f6f7fb");
        drawText(`Score ${Math.floor(state.score)}   Best ${Math.floor(state.best)}`, WIDTH / 2, HEIGHT / 2 + 24, 22, "#b9c7da");
        drawText("Press Space or Start Game", WIDTH / 2, HEIGHT / 2 + 62, 21, "#7f95f7");
        return;
      }

      if (state.attractElapsed > 1.3) {
        drawText("Asteroid Belt Adventure", WIDTH / 2, HEIGHT / 2 - 20, 46, "#f6f7fb");
      }
      if (state.attractElapsed > 3.1) {
        const blink = Math.floor(state.attractElapsed * 2) % 2 === 0;
        if (blink) {
          drawText("Press Space to Start and Fire", WIDTH / 2, HEIGHT / 2 + 44, 22, "#7bd97f");
        }
      }
    }

    function drawScene() {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      drawSectorBackdrop(currentSector());

      stars.forEach((star) => {
        ctx.globalAlpha = 0.38 + star.radius / 3.3;
        ctx.fillStyle = "#f0f6ff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      state.debris.forEach(drawDebris);
      state.missiles.forEach(drawMissile);
      state.projectiles.forEach(drawProjectile);
      drawRocket();
      state.explosions.forEach(drawExplosion);

      ctx.fillStyle = "rgba(223, 230, 243, 0.88)";
      ctx.font = "600 18px Poppins, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score ${Math.floor(state.score)}`, 22, 34);
      ctx.fillText(`Hits ${state.kills}`, 22, 58);

      const sectorName = currentSector().name;
      ctx.font = "600 16px Poppins, Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(5, 12, 22, 0.52)";
      drawRoundedRect(WIDTH - 228, 18, 206, 34, 17);
      ctx.fill();
      ctx.fillStyle = "rgba(223, 230, 243, 0.92)";
      ctx.fillText(sectorName, WIDTH - 32, 41);

      drawOverlay();
    }

    function loop(timestamp) {
      const delta = Math.min((timestamp - state.lastFrame) / 1000, 0.05);
      state.lastFrame = timestamp;
      update(delta);
      drawScene();
      window.requestAnimationFrame(loop);
    }

    startButton?.addEventListener("click", beginGame);
    pauseButton?.addEventListener("click", togglePause);
    resetButton?.addEventListener("click", () => resetToAttract("Fresh field loaded. Press Space or Start Game to fly."));
    canvas.addEventListener("click", () => canvas.focus());
    window.addEventListener("keydown", (event) => handleKey(event, true));
    window.addEventListener("keyup", (event) => handleKey(event, false));

    window.__portfolioPlayables = window.__portfolioPlayables || {};
    window.__portfolioPlayables.asteroid = {
      getSnapshot() {
        return {
          mode: state.mode,
          score: Math.floor(state.score),
          best: state.best,
          kills: state.kills,
          sector: currentSector().name,
          travelTime: Number(state.travelTime.toFixed(2)),
          missiles: state.missiles.length,
          projectiles: state.projectiles.length,
          shotCooldown: Number(state.shotCooldown.toFixed(3))
        };
      },
      forceStart() {
        beginGame();
      },
      fire() {
        return fireLaser();
      },
      spawnMissileAhead(offsetX = 165, offsetY = 0) {
        return spawnMissile({
          x: state.player.x + offsetX,
          y: clamp(state.player.y + state.player.height / 2 - MISSILE.height / 2 + offsetY, 18, HEIGHT - MISSILE.height - 18),
          speed: 0
        });
      },
      setTravelTime(seconds) {
        state.travelTime = Math.max(0, Number(seconds) || 0);
        state.lastSectorIndex = Math.min(Math.floor(state.travelTime / SECTOR_DURATION), SECTORS.length - 1);
        syncUi();
        drawScene();
      }
    };

    Promise.all([
      loadImage(`${assetRoot}/rocket.png`),
      loadImage(`${assetRoot}/missile.png`),
      loadImage(`${assetRoot}/asteroid.png`),
      loadImage(`${assetRoot}/comet.png`),
      loadImage(`${assetRoot}/rock.png`)
    ]).then(([rocket, missile, asteroid, comet, rock]) => {
      state.assets = { rocket, missile, asteroid, comet, rock };
      resetToAttract("Press Space or Start Game to fly.");
    });

    syncUi();
    window.requestAnimationFrame(loop);
  }

  function initGameOfLife() {
    const canvas = document.querySelector("[data-life-canvas]");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const widthInput = document.querySelector("[data-life-width]");
    const heightInput = document.querySelector("[data-life-height]");
    const buildButton = document.querySelector("[data-life-build]");
    const stepButton = document.querySelector("[data-life-step]");
    const clearButton = document.querySelector("[data-life-clear]");
    const statusEl = document.querySelector("[data-life-status]");
    const generationEl = document.querySelector("[data-life-generation]");
    const livingEl = document.querySelector("[data-life-living]");
    const modeEl = document.querySelector("[data-life-mode]");
    const MARGIN = 5;
    const CELL = 20;
    const COLORS = {
      board: "#828282",
      dead: "#faf0fa",
      live: "#00ff00"
    };
    const state = {
      cols: 20,
      rows: 16,
      grid: [],
      generation: 0,
      started: false
    };

    function setStatus(message) {
      if (statusEl) statusEl.textContent = message;
    }

    function livingCount() {
      return state.grid.reduce((sum, row) => sum + row.reduce((line, cell) => line + cell, 0), 0);
    }

    function syncUi() {
      if (generationEl) generationEl.textContent = String(state.generation);
      if (livingEl) livingEl.textContent = String(livingCount());
      if (modeEl) modeEl.textContent = state.started ? "Stepping" : "Editing";
      if (stepButton) stepButton.textContent = state.started ? "Next" : "Start";
    }

    function resizeCanvas() {
      canvas.width = state.cols * CELL + (state.cols + 1) * MARGIN;
      canvas.height = state.rows * CELL + (state.rows + 1) * MARGIN;
    }

    function drawGrid() {
      ctx.fillStyle = COLORS.board;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let row = 0; row < state.rows; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          const x = MARGIN + col * (CELL + MARGIN);
          const y = MARGIN + row * (CELL + MARGIN);
          ctx.fillStyle = state.grid[row][col] ? COLORS.live : COLORS.dead;
          ctx.fillRect(x, y, CELL, CELL);
        }
      }
    }

    function rebuildGrid() {
      const nextCols = clamp(Number(widthInput?.value || 20), 4, 45);
      const nextRows = clamp(Number(heightInput?.value || 16), 4, 30);
      if (widthInput) widthInput.value = String(nextCols);
      if (heightInput) heightInput.value = String(nextRows);

      state.cols = nextCols;
      state.rows = nextRows;
      state.grid = Array.from({ length: state.rows }, () => Array(state.cols).fill(0));
      state.generation = 0;
      state.started = false;
      resizeCanvas();
      drawGrid();
      syncUi();
      setStatus("Grid ready. Click cells to seed the pattern.");
    }

    function clearGrid() {
      state.grid = state.grid.map((row) => row.map(() => 0));
      state.generation = 0;
      state.started = false;
      drawGrid();
      syncUi();
      setStatus("Board cleared.");
    }

    function nextGeneration(board) {
      const dirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      const result = Array.from({ length: state.rows }, () => Array(state.cols).fill(0));

      for (let row = 0; row < state.rows; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          let neighbors = 0;
          dirs.forEach(([dr, dc]) => {
            const nextRow = row + dr;
            const nextCol = col + dc;
            if (nextRow >= 0 && nextRow < state.rows && nextCol >= 0 && nextCol < state.cols && board[nextRow][nextCol] === 1) {
              neighbors += 1;
            }
          });

          if (board[row][col] === 1) {
            result[row][col] = neighbors === 2 || neighbors === 3 ? 1 : 0;
          } else {
            result[row][col] = neighbors === 3 ? 1 : 0;
          }
        }
      }

      return result;
    }

    function stepGrid() {
      state.grid = nextGeneration(state.grid);
      state.generation += 1;
      state.started = true;
      drawGrid();
      syncUi();
      if (livingCount() === 0) {
        setStatus("All cells are inactive. Edit the board or clear and start again.");
      } else {
        setStatus(`Generation ${state.generation} complete.`);
      }
    }

    function toggleCell(event) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const col = Math.floor((x - MARGIN) / (CELL + MARGIN));
      const row = Math.floor((y - MARGIN) / (CELL + MARGIN));
      if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) return;

      const cellLeft = MARGIN + col * (CELL + MARGIN);
      const cellTop = MARGIN + row * (CELL + MARGIN);
      if (x > cellLeft + CELL || y > cellTop + CELL) return;

      state.grid[row][col] = state.grid[row][col] ? 0 : 1;
      drawGrid();
      syncUi();
      setStatus("Pattern updated.");
    }

    buildButton?.addEventListener("click", rebuildGrid);
    stepButton?.addEventListener("click", stepGrid);
    clearButton?.addEventListener("click", clearGrid);
    canvas.addEventListener("click", toggleCell);
    [widthInput, heightInput].forEach((input) => {
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          rebuildGrid();
        }
      });
    });

    rebuildGrid();
  }

  if (pageId === "asteroid" && data.asteroidLaunch) {
    initAsteroidGame();
  }

  if (pageId === "life" && data.gameOfLifeLaunch) {
    initGameOfLife();
  }
})();
