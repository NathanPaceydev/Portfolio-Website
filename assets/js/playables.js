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
    const WIDTH = 800;
    const HEIGHT = 600;
    const PLAYER = { width: 75, height: 50, speed: 260 };
    const MISSILE = { width: 60, height: 30 };
    const STORAGE_KEY = "portfolio-asteroid-best";
    const assetRoot = "external/asteroid-belt-adventure";
    const pressed = new Set();
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      radius: randomBetween(0.8, 2.2),
      speed: randomBetween(18, 65)
    }));
    const state = {
      mode: "loading",
      player: { x: 72, y: HEIGHT / 2 - PLAYER.height / 2, width: PLAYER.width, height: PLAYER.height },
      missiles: [],
      debris: [],
      score: 0,
      best: Number(window.localStorage.getItem(STORAGE_KEY) || 0),
      attractElapsed: 0,
      missileTimer: 0,
      debrisTimer: 0,
      lastFrame: performance.now(),
      assets: {}
    };

    function setStatus(message) {
      if (statusEl) statusEl.textContent = message;
    }

    function syncUi() {
      if (scoreEl) scoreEl.textContent = String(Math.floor(state.score));
      if (bestEl) bestEl.textContent = String(Math.floor(state.best));
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
      state.missileTimer = 0;
      state.debrisTimer = 0;
      state.score = 0;
      state.attractElapsed = 0;
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
      setStatus("Live run active. Dodge the missiles.");
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

    function spawnMissile() {
      state.missiles.push({
        x: WIDTH + randomBetween(40, 140),
        y: randomBetween(18, HEIGHT - MISSILE.height - 18),
        width: MISSILE.width,
        height: MISSILE.height,
        speed: randomBetween(240, 520)
      });
    }

    function spawnDebris() {
      const names = ["asteroid", "comet", "rock", "asteroid", "asteroid"];
      const kind = names[randomInt(0, names.length - 1)];
      const size = randomBetween(50, 190);
      state.debris.push({
        kind,
        x: WIDTH + randomBetween(40, 130),
        y: randomBetween(0, HEIGHT),
        width: size,
        height: size,
        speed: randomBetween(105, 170),
        angle: randomBetween(0, Math.PI * 2),
        spin: randomBetween(-0.9, 0.9)
      });
    }

    function intersects(a, b) {
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    function drawText(text, x, y, size, color, align) {
      ctx.fillStyle = color;
      ctx.font = `600 ${size}px Poppins, Arial, sans-serif`;
      ctx.textAlign = align || "center";
      ctx.fillText(text, x, y);
    }

    function drawRocket() {
      const { rocket } = state.assets;
      const { x, y, width, height } = state.player;
      if (rocket) {
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(-Math.PI / 2);
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
        ctx.rotate(Math.PI / 2);
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
      if (image) {
        ctx.drawImage(image, -item.width / 2, -item.height / 2, item.width, item.height);
      } else {
        ctx.fillStyle = item.kind === "comet" ? "#9ca7ba" : "#707a8c";
        ctx.beginPath();
        ctx.arc(0, 0, item.width / 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function handleKey(event, active) {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "p"].includes(key)) {
        event.preventDefault();
      }

      if (key === " " && active && ["attract", "gameover"].includes(state.mode)) {
        beginGame();
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
      state.attractElapsed += delta;

      stars.forEach((star) => {
        star.x -= star.speed * delta;
        if (star.x < -4) {
          star.x = WIDTH + randomBetween(0, 60);
          star.y = Math.random() * HEIGHT;
        }
      });

      if (state.mode === "paused") return;

      state.debrisTimer += delta;
      const debrisInterval = state.mode === "playing" ? 0.92 : 1.1;
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
        while (state.missileTimer >= 0.25) {
          spawnMissile();
          state.missileTimer -= 0.25;
        }

        state.score += delta * 10;
        syncUi();
      }

      state.debris.forEach((item) => {
        item.x -= item.speed * delta;
        item.angle += item.spin * delta;
      });
      state.debris = state.debris.filter((item) => item.x + item.width > -80);

      if (state.mode === "playing") {
        state.missiles.forEach((missile) => {
          missile.x -= missile.speed * delta;
        });
        state.missiles = state.missiles.filter((missile) => missile.x + missile.width > -80);

        if (state.missiles.some((missile) => intersects(state.player, missile))) {
          setBest(state.score);
          state.mode = "gameover";
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
          drawText("Press Space to Start", WIDTH / 2, HEIGHT / 2 + 44, 22, "#7bd97f");
        }
      }
    }

    function drawScene() {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#030812";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      stars.forEach((star) => {
        ctx.globalAlpha = 0.45 + star.radius / 3.2;
        ctx.fillStyle = "#f0f6ff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      state.debris.forEach(drawDebris);
      state.missiles.forEach(drawMissile);
      drawRocket();

      ctx.fillStyle = "rgba(223, 230, 243, 0.88)";
      ctx.font = "600 18px Poppins, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score ${Math.floor(state.score)}`, 22, 34);

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
