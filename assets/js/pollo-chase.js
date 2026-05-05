(function () {
  const canvas = document.getElementById("pollo-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const overlay = document.querySelector("[data-pollo-overlay]");
  const overlayKicker = document.querySelector("[data-pollo-overlay-kicker]");
  const overlayTitle = document.querySelector("[data-pollo-overlay-title]");
  const overlayText = document.querySelector("[data-pollo-overlay-text]");
  const primaryButton = document.querySelector("[data-pollo-start]");
  const secondaryButton = document.querySelector("[data-pollo-continue]");
  const tertiaryButton = document.querySelector("[data-pollo-reset-save]");
  const levelEl = document.querySelector("[data-pollo-level]");
  const flowersEl = document.querySelector("[data-pollo-flowers]");
  const bellsEl = document.querySelector("[data-pollo-bells]");
  const timeEl = document.querySelector("[data-pollo-time]");
  const storyEl = document.querySelector("[data-pollo-story]");
  const secretsEl = document.querySelector("[data-pollo-secrets]");

  const VIEW = { width: 960, height: 540 };
  const TILE = 48;
  const PLAYER = { width: 28, height: 40, speed: 300, jump: 640, gravity: 1760, maxFall: 900 };
  const STORAGE_KEY = "pollo-chase-save-v1";
  const CODE_TARGET = "POLLO";
  const BONUS_LEVEL_INDEX = 4;

  const keyState = new Set();
  const pressedThisFrame = new Set();
  let typedBuffer = "";
  let audioContext = null;

  const defaultSave = () => ({
    furthestLevel: 0,
    flowers: {},
    bells: {},
    bestTime: null,
    discovered: [],
    chickenMode: false,
    bonusUnlocked: false,
    bonusComplete: false,
    mainComplete: false
  });

  const save = loadSave();
  const state = {
    mode: "menu",
    currentLevelIndex: 0,
    currentLevel: null,
    cameraX: 0,
    sceneTime: 0,
    time: 0,
    levelTime: 0,
    storyTimer: 0,
    baseStory: "A ring, a mountain, and a very fast Pollo.",
    story: "A ring, a mountain, and a very fast Pollo.",
    photoMode: false,
    particles: [],
    player: createPlayer(),
    flash: 0,
    confetti: false,
    bonusShown: false,
    debug: false
  };

  function syncPhotoMode() {
    document.body.classList.toggle("photo-mode", state.photoMode);
  }

  function loadSave() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      return { ...defaultSave(), ...parsed };
    } catch (error) {
      return defaultSave();
    }
  }

  function persistSave() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }

  function createPlayer() {
    return {
      x: 72,
      y: 300,
      width: PLAYER.width,
      height: PLAYER.height,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      standingOn: null,
      coyote: 0,
      jumpBuffer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      invuln: 0,
      spawnX: 72,
      spawnY: 300,
      scarf: false,
      jumpCut: false
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
  }

  function intersects(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function getRect(entity) {
    return { x: entity.x, y: entity.y, width: entity.width, height: entity.height };
  }

  function hasBell(id) {
    return Boolean(save.bells[id]);
  }

  function hasFlower(id) {
    return Boolean(save.flowers[id]);
  }

  function totalFlowers() {
    return Object.keys(save.flowers).length;
  }

  function totalBells() {
    return Object.keys(save.bells).length;
  }

  function mainBellIds() {
    return LEVELS.filter((level) => !level.bonus).map((level) => level.bellId);
  }

  function discovered(label) {
    return save.discovered.includes(label);
  }

  function markDiscovered(label, line) {
    if (discovered(label)) return;
    save.discovered.push(label);
    persistSave();
    if (line) announce(line, 5);
    syncSecrets();
  }

  function announce(message, duration = 3.5) {
    state.story = message;
    state.storyTimer = duration;
    syncPanels();
  }

  function ensureAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
  }

  function tone(frequency, duration, type = "square", volume = 0.025, when = 0) {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + when;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  function playSfx(kind) {
    if (!audioContext) return;
    if (kind === "jump") {
      tone(420, 0.08, "square", 0.03);
      tone(620, 0.06, "triangle", 0.02, 0.03);
    } else if (kind === "dash") {
      tone(240, 0.08, "sawtooth", 0.035);
      tone(160, 0.1, "triangle", 0.018, 0.02);
    } else if (kind === "flower") {
      tone(640, 0.08, "triangle", 0.03);
      tone(820, 0.1, "triangle", 0.022, 0.04);
    } else if (kind === "bell") {
      tone(523, 0.12, "triangle", 0.035);
      tone(659, 0.18, "triangle", 0.026, 0.05);
      tone(783, 0.2, "triangle", 0.02, 0.1);
    } else if (kind === "hurt") {
      tone(190, 0.14, "sawtooth", 0.04);
      tone(120, 0.18, "square", 0.03, 0.06);
    } else if (kind === "goal") {
      tone(523, 0.12, "triangle", 0.03);
      tone(659, 0.12, "triangle", 0.028, 0.08);
      tone(783, 0.18, "triangle", 0.026, 0.16);
      tone(1046, 0.24, "triangle", 0.022, 0.26);
    }
  }

  function spawnParticles(x, y, count, color, speed = 120, shape = "spark") {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const magnitude = speed * (0.5 + Math.random() * 0.7);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * magnitude,
        vy: Math.sin(angle) * magnitude - 30,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 0.8 + Math.random() * 0.4,
        color,
        shape
      });
    }
  }

  function p(x, y, width, height = 18, style = "grass") {
    return { kind: "platform", x, y, width, height, style };
  }

  function moving(x, y, width, height, dx, dy, duration, style = "wood") {
    return { kind: "moving", x, y, width, height, style, dx, dy, duration, timer: 0, prevX: x, prevY: y };
  }

  function crumble(x, y, width, height = 18, style = "stone") {
    return { kind: "crumble", x, y, width, height, style, timer: 0, broken: false, respawn: 0 };
  }

  function spring(x, y, width = 48, height = 16, power = 860) {
    return { x, y, width, height, power };
  }

  function wind(x, y, width, height, force = 1050, push = 0) {
    return { x, y, width, height, force, push };
  }

  function flower(id, x, y) {
    return { id, x, y, width: 18, height: 18, bob: Math.random() * Math.PI * 2 };
  }

  function bell(id, x, y) {
    return { id, x, y, width: 20, height: 24, bob: Math.random() * Math.PI * 2 };
  }

  function checkpoint(x, y) {
    return { x, y, width: 24, height: 72, active: false };
  }

  function hint(x, y, text, variant = "marmot") {
    return { x, y, width: 26, height: 24, text, variant };
  }

  function polloSpot(x, y, text) {
    return { x, y, text, triggered: false };
  }

  function goal(x, y, width, height, text) {
    return { x, y, width, height, text };
  }

  function hazard(kind, x, y, width, height, min, max, speed, options = {}) {
    return {
      kind,
      x,
      y,
      width,
      height,
      min,
      max,
      speed,
      dir: 1,
      baseY: y,
      phase: Math.random() * Math.PI * 2,
      ...options
    };
  }

  const LEVELS = [
    {
      id: "grindelwald",
      name: "Grindelwald Grind",
      subtitle: "Alpine starter route beneath the Eiger",
      location: "Grindelwald",
      theme: "grindelwald",
      width: 4300,
      bonus: false,
      bellId: "bell-grindelwald",
      intro: "Pollo has already taken the scenic route. Learn the trail, dodge goats, and keep that ring out of the snow.",
      clear: "Pollo waved from the ridge and bolted for Lauterbrunnen. She absolutely saw the ring.",
      endText: "Onward to Lauterbrunnen.",
      start: { x: 72, y: 350 },
      platforms: [
        p(0, 440, 700, 120, "grass"),
        p(830, 440, 350, 120, "grass"),
        p(1340, 440, 360, 120, "grass"),
        p(1870, 440, 540, 120, "grass"),
        p(2590, 440, 420, 120, "grass"),
        p(3140, 400, 450, 140, "grass"),
        p(3740, 350, 560, 190, "snow"),
        p(230, 330, 120, 18, "wood"),
        p(420, 280, 120, 18, "wood"),
        p(620, 240, 100, 18, "stone"),
        moving(1020, 326, 130, 18, 210, 0, 3.3, "gondola"),
        p(1450, 300, 120, 18, "stone"),
        p(1675, 255, 120, 18, "stone"),
        p(2015, 340, 140, 18, "wood"),
        p(2250, 288, 150, 18, "wood"),
        p(2450, 238, 120, 18, "stone"),
        p(2790, 320, 140, 18, "grass"),
        p(2990, 250, 110, 18, "stone"),
        p(3360, 310, 140, 18, "grass"),
        p(3620, 238, 110, 18, "snow"),
        p(3900, 250, 120, 18, "snow")
      ],
      crumble: [crumble(2205, 388, 96, 16, "wood")],
      springs: [spring(2868, 424), spring(3420, 384)],
      winds: [],
      flowers: [
        flower("flower-gr-1", 468, 250),
        flower("flower-gr-2", 1704, 225),
        flower("flower-gr-3", 3626, 208)
      ],
      bells: [bell("bell-grindelwald", 650, 205)],
      checkpoints: [checkpoint(1370, 368), checkpoint(3130, 330)],
      hints: [
        hint(158, 396, "Marmot tip: the bells hide where Pollo stopped to admire the view."),
        hint(3210, 360, "Use the hay bale bounce. Romance sometimes requires a little vertical ambition.")
      ],
      hazards: [
        hazard("goat", 1480, 278, 34, 24, 1440, 1560, 64),
        hazard("goat", 2835, 296, 34, 24, 2790, 2895, 72)
      ],
      polloSpots: [
        polloSpot(1140, 282, "Pollo: You're cute when you huff uphill."),
        polloSpot(2480, 188, "Pollo: You brought the ring? Keep up then."),
        polloSpot(3980, 140, "Pollo: Last one to the ridge buys hot chocolate.")
      ],
      goal: goal(4090, 170, 120, 140, "Pollo vanished into the Lauterbrunnen mist.")
    },
    {
      id: "lauterbrunnen",
      name: "Lauterbrunnen Leap",
      subtitle: "Waterfalls, cliff paths, and valley wind",
      location: "Lauterbrunnen",
      theme: "lauterbrunnen",
      width: 4650,
      bonus: false,
      bellId: "bell-lauterbrunnen",
      intro: "The valley is all cliffs and spray. Trust the wind, but not too much.",
      clear: "A note fluttered out of the mist: 'Catch me in Bern if your rooftop game is good enough.'",
      endText: "Bern rooftops unlocked.",
      start: { x: 72, y: 350 },
      platforms: [
        p(0, 440, 560, 120, "grass"),
        p(760, 440, 360, 120, "grass"),
        p(1360, 440, 320, 120, "grass"),
        p(1910, 440, 380, 120, "grass"),
        p(2650, 440, 330, 120, "grass"),
        p(3360, 440, 380, 120, "grass"),
        p(4090, 360, 460, 180, "snow"),
        p(430, 340, 120, 18, "stone"),
        p(650, 280, 110, 18, "stone"),
        p(960, 300, 120, 18, "wood"),
        p(1170, 240, 120, 18, "stone"),
        p(1520, 320, 110, 18, "wood"),
        crumble(1700, 280, 110, 18, "wood"),
        p(2005, 320, 140, 18, "stone"),
        moving(2270, 328, 120, 18, 0, -120, 2.9, "wood"),
        p(2520, 220, 120, 18, "stone"),
        p(2880, 300, 150, 18, "wood"),
        moving(3140, 260, 130, 18, 170, 0, 3.2, "gondola"),
        p(3605, 230, 130, 18, "snow"),
        p(3870, 190, 140, 18, "snow")
      ],
      crumble: [crumble(1710, 280, 100, 18, "wood")],
      springs: [spring(2730, 424)],
      winds: [wind(595, 110, 120, 280, 1200), wind(2410, 140, 120, 280, 1080)],
      flowers: [
        flower("flower-la-1", 670, 160),
        flower("flower-la-2", 2550, 182),
        flower("flower-la-3", 3885, 155)
      ],
      bells: [bell("bell-lauterbrunnen", 2445, 104)],
      checkpoints: [checkpoint(1395, 368), checkpoint(3385, 368)],
      hints: [
        hint(470, 398, "Pollo left footprints by the spray. Ride the updraft, not the panic."),
        hint(3020, 398, "Behind every waterfall is either romance or a shortcut. Sometimes both.")
      ],
      hazards: [
        hazard("bird", 1260, 210, 34, 20, 1240, 1610, 120, { amplitude: 26 }),
        hazard("bird", 3410, 190, 34, 20, 3380, 3840, 136, { amplitude: 18 }),
        hazard("goat", 2875, 278, 34, 24, 2870, 2975, 68)
      ],
      polloSpots: [
        polloSpot(1155, 184, "Pollo: This valley makes you look dramatic."),
        polloSpot(2640, 140, "Pollo: If you fall, I am absolutely laughing first and helping second."),
        polloSpot(4140, 150, "Pollo: Bern. Rooftops. Try not to trip over your own devotion.")
      ],
      goal: goal(4280, 150, 120, 150, "Pollo skipped onto the Bern rooftops.")
    },
    {
      id: "bern",
      name: "Bern Rooftop Rush",
      subtitle: "Clock towers, tiled roofs, and old-town chaos",
      location: "Bern",
      theme: "bern",
      width: 4300,
      bonus: false,
      bellId: "bell-bern",
      intro: "Pollo turned the old town into a speedrun. Mind the gaps, the birds, and the clock tower lift.",
      clear: "A rose garden breeze carried her laugh east toward Gruyères.",
      endText: "Castle country ahead.",
      start: { x: 72, y: 320 },
      platforms: [
        p(0, 420, 420, 120, "roof"),
        p(520, 380, 220, 160, "roof"),
        p(860, 430, 240, 110, "roof"),
        p(1210, 360, 200, 180, "roof"),
        p(1500, 420, 260, 120, "roof"),
        p(1880, 320, 160, 220, "stone"),
        p(2200, 410, 260, 130, "roof"),
        p(2590, 350, 200, 190, "roof"),
        p(2910, 430, 230, 110, "roof"),
        p(3270, 350, 240, 190, "roof"),
        p(3650, 280, 160, 260, "stone"),
        p(3920, 220, 260, 320, "garden"),
        p(300, 300, 110, 18, "wood"),
        p(640, 300, 90, 18, "wood"),
        moving(1730, 380, 110, 18, 0, -130, 2.7, "clock"),
        p(2290, 300, 120, 18, "wood"),
        p(2740, 260, 110, 18, "wood"),
        p(3400, 270, 100, 18, "stone")
      ],
      crumble: [crumble(1110, 312, 90, 16, "roof"), crumble(3140, 302, 86, 16, "roof")],
      springs: [spring(4025, 202)],
      winds: [],
      flowers: [
        flower("flower-be-1", 342, 268),
        flower("flower-be-2", 1945, 150),
        flower("flower-be-3", 3380, 240)
      ],
      bells: [bell("bell-bern", 1935, 120)],
      checkpoints: [checkpoint(1235, 288), checkpoint(3290, 278)],
      hints: [
        hint(84, 376, "Pollo note: Bern is basically a love letter written in rooftops."),
        hint(3705, 240, "The clock tower hides a bell. Obviously it does.")
      ],
      hazards: [
        hazard("cat", 1560, 396, 30, 22, 1520, 1715, 68),
        hazard("bird", 2470, 230, 34, 20, 2410, 2860, 132, { amplitude: 12 }),
        hazard("cat", 3300, 326, 30, 22, 3280, 3460, 76)
      ],
      polloSpots: [
        polloSpot(1280, 308, "Pollo: Roof tiles are more romantic than sidewalks."),
        polloSpot(2600, 220, "Pollo: The clocktower says you're still late."),
        polloSpot(3980, 170, "Pollo: Gruyères next. Bring courage. Maybe cheese too.")
      ],
      goal: goal(4070, 120, 100, 160, "Pollo vaulted toward Gruyères.")
    },
    {
      id: "gruyeres",
      name: "Gruyères Castle Chase",
      subtitle: "Stone walls, cheese wheels, and the proposal climb",
      location: "Gruyères",
      theme: "gruyeres",
      width: 4700,
      bonus: false,
      bellId: "bell-gruyeres",
      intro: "Stone steps, castle lifts, and one final sprint. Try not to get flattened by enthusiastic cheese.",
      clear: "Pollo finally stopped running. The ring made it all the way up the mountain.",
      endText: "Proposal delivered.",
      start: { x: 72, y: 350 },
      platforms: [
        p(0, 440, 620, 120, "meadow"),
        p(760, 440, 400, 120, "meadow"),
        p(1340, 440, 380, 120, "castle"),
        p(1940, 440, 460, 120, "castle"),
        p(2680, 440, 360, 120, "castle"),
        p(3240, 390, 360, 150, "castle"),
        p(3820, 340, 280, 200, "castle"),
        p(4160, 240, 460, 300, "snow"),
        p(320, 330, 120, 18, "wood"),
        p(560, 280, 120, 18, "wood"),
        moving(1110, 350, 120, 18, 0, -110, 2.8, "lift"),
        p(1550, 300, 120, 18, "castle"),
        p(1770, 240, 110, 18, "castle"),
        p(2150, 330, 140, 18, "wood"),
        moving(2440, 350, 120, 18, 150, 0, 3.4, "lift"),
        p(2820, 280, 130, 18, "castle"),
        p(3370, 310, 120, 18, "castle"),
        p(3620, 250, 110, 18, "castle"),
        p(3900, 210, 120, 18, "snow")
      ],
      crumble: [crumble(2280, 392, 90, 16, "wood")],
      springs: [spring(4315, 220)],
      winds: [],
      flowers: [
        flower("flower-gru-1", 600, 248),
        flower("flower-gru-2", 1800, 208),
        flower("flower-gru-3", 3920, 182)
      ],
      bells: [bell("bell-gruyeres", 3635, 160)],
      checkpoints: [checkpoint(1375, 368), checkpoint(3260, 318)],
      hints: [
        hint(110, 398, "Castle etiquette: breathe, dodge cheese, do not drop ring."),
        hint(3400, 280, "A final bell waits in the high tower for anyone still snooping.")
      ],
      hazards: [
        hazard("cheese", 1440, 410, 34, 34, 1400, 1690, 120),
        hazard("cheese", 2690, 410, 34, 34, 2670, 3000, 132),
        hazard("goat", 3380, 286, 34, 24, 3360, 3480, 72)
      ],
      polloSpots: [
        polloSpot(1640, 190, "Pollo: This is the point where normal people would have sent a text."),
        polloSpot(2960, 228, "Pollo: If you make it, maybe I stop running."),
        polloSpot(4300, 158, "Pollo: Okay, okay. You caught me. Bring the ring, mountain man.")
      ],
      goal: goal(4410, 150, 120, 160, "Pollo finally stopped at the castle terrace.")
    },
    {
      id: "matterhorn",
      name: "Matterhorn Moonrise",
      subtitle: "Secret bonus run for relentless romantics",
      location: "Proposal Peak",
      theme: "matterhorn",
      width: 3300,
      bonus: true,
      bellId: "bell-bonus",
      intro: "All four cowbells rang. One more moonlit sprint for style points and fireworks.",
      clear: "The whole mountain lit up. Pollo said yes before the final firework had even cooled.",
      endText: "Secret ending unlocked.",
      start: { x: 72, y: 330 },
      platforms: [
        p(0, 440, 520, 120, "snow"),
        p(680, 440, 320, 120, "snow"),
        p(1120, 390, 260, 150, "snow"),
        p(1510, 330, 220, 210, "snow"),
        p(1860, 280, 180, 260, "snow"),
        p(2160, 240, 180, 300, "snow"),
        p(2490, 210, 170, 330, "snow"),
        p(2790, 170, 360, 370, "snow"),
        moving(520, 330, 120, 18, 130, 0, 2.5, "gondola"),
        moving(1340, 290, 110, 18, 120, 0, 2.6, "gondola"),
        moving(1710, 250, 110, 18, 120, 0, 2.6, "gondola"),
        moving(2350, 200, 110, 18, 110, 0, 2.8, "gondola")
      ],
      crumble: [],
      springs: [spring(2860, 142, 48, 16, 940)],
      winds: [wind(2020, 160, 120, 220, 940)],
      flowers: [],
      bells: [],
      checkpoints: [checkpoint(1135, 318), checkpoint(2510, 138)],
      hints: [
        hint(240, 396, "Moonlight challenge: style matters now."),
        hint(2850, 128, "One last bounce and the whole mountain belongs to you two.")
      ],
      hazards: [
        hazard("bird", 1240, 230, 34, 20, 1180, 1660, 150, { amplitude: 22 }),
        hazard("bird", 2250, 168, 34, 20, 2210, 2760, 165, { amplitude: 18 })
      ],
      polloSpots: [
        polloSpot(1700, 190, "Pollo: Secret level? Fine. Impress me."),
        polloSpot(2950, 110, "Pollo: This is absurdly romantic. Don't mess up now.")
      ],
      goal: goal(3070, 80, 120, 160, "Bonus summit reached.")
    }
  ];

  function cloneLevel(levelIndex) {
    const raw = LEVELS[levelIndex];
    const cloned = JSON.parse(JSON.stringify(raw));
    cloned.platforms = cloned.platforms.map((platform) => ({
      ...platform,
      prevX: platform.x,
      prevY: platform.y
    }));
    cloned.collapse = (cloned.collapse || []).map((item) => ({ ...item }));
    return cloned;
  }

  function startRun(levelIndex = 0, options = {}) {
    const { resetTimer = false } = options;
    ensureAudio();
    state.currentLevelIndex = levelIndex;
    state.currentLevel = cloneLevel(levelIndex);
    state.cameraX = 0;
    state.levelTime = 0;
    if (resetTimer) state.time = 0;
    state.storyTimer = 0;
    state.baseStory = state.currentLevel.intro;
    state.story = state.currentLevel.intro;
    state.confetti = false;
    state.flash = 0;
    state.player = createPlayer();
    state.player.x = state.currentLevel.start.x;
    state.player.y = state.currentLevel.start.y;
    state.player.spawnX = state.currentLevel.start.x;
    state.player.spawnY = state.currentLevel.start.y;
    state.player.scarf = totalFlowers() >= 6;
    state.mode = "playing";
    hideOverlay();
    syncHud();
    syncPanels();
    syncPhotoMode();
    canvas.focus();
  }

  function continueRun() {
    const availableLevel = save.mainComplete && save.bonusUnlocked && !save.bonusComplete
      ? BONUS_LEVEL_INDEX
      : clamp(save.furthestLevel, 0, save.bonusUnlocked ? BONUS_LEVEL_INDEX : 3);
    startRun(availableLevel, { resetTimer: true });
  }

  function resetSave() {
    Object.assign(save, defaultSave());
    persistSave();
    syncSecrets();
    showMenu(true);
  }

  function showMenu(showResetNote = false) {
    state.mode = "menu";
    state.time = 0;
    state.photoMode = false;
    state.baseStory = "A ring, a mountain, and a very fast Pollo.";
    state.story = showResetNote ? "Save reset. Fresh mountain, same romantic chaos." : state.baseStory;
    state.storyTimer = 0;
    overlay.classList.remove("hidden");
    overlayKicker.textContent = "Swiss Pixel Platformer";
    overlayTitle.textContent = "Pollo Chase";
    overlayText.textContent = "Paulette is already halfway up the mountain. Nate has a ring, a dangerous amount of optimism, and every intention of proposing at the summit.";
    bindButton(primaryButton, "Start Adventure", () => startRun(0, { resetTimer: true }), false);
    const canContinue = save.furthestLevel > 0 || save.mainComplete || save.bonusUnlocked;
    bindButton(secondaryButton, canContinue ? "Continue Adventure" : "", continueRun, !canContinue);
    bindButton(tertiaryButton, "Reset Save", resetSave, false);
    syncHud();
    syncPanels();
    syncPhotoMode();
  }

  function showPause() {
    state.mode = "paused";
    overlay.classList.remove("hidden");
    overlayKicker.textContent = state.currentLevel.location;
    overlayTitle.textContent = "Pause for Breath";
    overlayText.textContent = "Pollo is still somewhere uphill. Breathe, stretch, and then get back after her.";
    bindButton(primaryButton, "Resume", resumeGame, false);
    bindButton(secondaryButton, "Restart Level", () => startRun(state.currentLevelIndex), false, true);
    bindButton(tertiaryButton, "Back to Menu", showMenu, false, true);
  }

  function showLevelClear(message, nextAction, nextLabel, showBonusHint = false) {
    state.mode = "overlay";
    overlay.classList.remove("hidden");
    overlayKicker.textContent = state.currentLevel.location;
    overlayTitle.textContent = state.currentLevel.name;
    overlayText.textContent = showBonusHint
      ? `${message} You found all four cowbells, so a secret moonlit bonus run just opened.`
      : message;
    bindButton(primaryButton, nextLabel, nextAction, false);
    bindButton(secondaryButton, "Replay Level", () => startRun(state.currentLevelIndex), false, true);
    bindButton(tertiaryButton, "Back to Menu", showMenu, false, true);
  }

  function showEnding(text, kicker = "Proposal Peak") {
    state.mode = "ending";
    overlay.classList.remove("hidden");
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = "Caught Her";
    overlayText.textContent = text;
    bindButton(primaryButton, "Play Again", () => startRun(0), false);
    bindButton(secondaryButton, save.bonusUnlocked ? "Jump to Bonus Run" : "", () => startRun(BONUS_LEVEL_INDEX), !save.bonusUnlocked, true);
    bindButton(tertiaryButton, "Back to Menu", showMenu, false, true);
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function bindButton(button, label, handler, hidden, secondary = false) {
    button.textContent = label;
    button.classList.toggle("hidden", hidden);
    button.classList.toggle("secondary", secondary);
    button.onclick = hidden ? null : handler;
  }

  function resumeGame() {
    state.mode = "playing";
    hideOverlay();
    canvas.focus();
  }

  function syncHud() {
    const current = LEVELS[state.currentLevelIndex] || LEVELS[0];
    levelEl.textContent = current.name;
    flowersEl.textContent = `${totalFlowers()} / 12`;
    bellsEl.textContent = `${Math.min(totalBells(), 4)} / 4`;
    timeEl.textContent = formatTime(state.time);
  }

  function syncPanels() {
    storyEl.textContent = state.story;
  }

  function syncSecrets() {
    const lines = [
      "Four secret cowbells unlock a bonus moonrise run.",
      "Typing POLLO swaps in a deeply unserious chicken disguise.",
      "Photo mode hides the HUD for scenic Swiss screenshots."
    ];

    if (save.chickenMode) lines.unshift("Chicken mode discovered. Nate now looks dramatically more ridiculous.");
    if (save.bonusUnlocked) lines.unshift("Bonus summit unlocked. The Matterhorn moonrise route is open.");
    if (save.bonusComplete) lines.unshift("Secret ending complete. Pollo absolutely said yes.");
    if (totalFlowers() === 12) lines.unshift("Every Edelweiss found. Swiss flower supremacy achieved.");

    secretsEl.innerHTML = lines.map((line) => `<li>${line}</li>`).join("");
  }

  function updateMovingPlatforms(dt) {
    for (const platform of state.currentLevel.platforms) {
      if (platform.kind !== "moving") continue;
      platform.prevX = platform.x;
      platform.prevY = platform.y;
      platform.timer = (platform.timer + dt) % platform.duration;
      const t = easeInOutSine(platform.timer / platform.duration);
      platform.x = (platform.x - platform.prevX) + platform.prevX;
      platform.y = (platform.y - platform.prevY) + platform.prevY;
      platform.x = platform.startX !== undefined ? platform.startX : platform.x;
      platform.y = platform.startY !== undefined ? platform.startY : platform.y;
      if (platform.startX === undefined) {
        platform.startX = platform.prevX;
        platform.startY = platform.prevY;
      }
      platform.x = platform.startX + platform.dx * t;
      platform.y = platform.startY + platform.dy * t;
    }
  }

  function solids() {
    return state.currentLevel.platforms.filter((platform) => platform.kind !== "crumble" || !platform.broken);
  }

  function stepCrumble(dt) {
    for (const platform of state.currentLevel.platforms) {
      if (platform.kind !== "crumble") continue;
      if (platform.broken) {
        platform.respawn -= dt;
        if (platform.respawn <= 0) {
          platform.broken = false;
          platform.timer = 0;
        }
      } else if (platform.timer > 0) {
        platform.timer -= dt;
        if (platform.timer <= 0) {
          platform.broken = true;
          platform.respawn = 2.8;
          spawnParticles(platform.x + platform.width / 2, platform.y + 8, 9, "#8fa4c6", 90, "shard");
        }
      }
    }
  }

  function playerInput(dt) {
    const player = state.player;
    player.jumpBuffer = clamp(player.jumpBuffer - dt, 0, 0.18);
    player.coyote = clamp(player.coyote - dt, 0, 0.12);
    player.dashCooldown = clamp(player.dashCooldown - dt, 0, 8);
    player.invuln = clamp(player.invuln - dt, 0, 8);

    const movingLeft = keyState.has("arrowleft") || keyState.has("a");
    const movingRight = keyState.has("arrowright") || keyState.has("d");
    const jumpHeld = keyState.has("arrowup") || keyState.has("w") || keyState.has(" ");
    const wantsJump = pressedThisFrame.has("arrowup") || pressedThisFrame.has("w") || pressedThisFrame.has(" ");
    const wantsDash = pressedThisFrame.has("shift");
    const wantsHeart = pressedThisFrame.has("b");

    if (wantsJump) player.jumpBuffer = 0.16;

    if (pressedThisFrame.has("h")) {
      state.photoMode = !state.photoMode;
      markDiscovered("photo-mode", state.photoMode ? "Photo mode on. Switzerland has never looked so dramatic." : "Photo mode off.");
      syncPhotoMode();
    }

    if (pressedThisFrame.has("p")) {
      showPause();
      return;
    }

    if (pressedThisFrame.has("r")) {
      startRun(state.currentLevelIndex);
      return;
    }

    if (pressedThisFrame.has("]") && state.debug) {
      finishLevel(true);
      return;
    }

    const input = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
    if (input !== 0) player.facing = input;

    if (wantsDash && player.dashCooldown <= 0) {
      player.dashTimer = 0.16;
      player.dashCooldown = 0.52;
      player.vx = player.facing * 620;
      player.vy = Math.min(player.vy, 60);
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 8, "#9dd7ff", 120, "trail");
      playSfx("dash");
    }

    if (player.dashTimer > 0) {
      player.dashTimer = clamp(player.dashTimer - dt, 0, 1);
      player.vx = player.facing * 620;
    } else {
      const maxSpeed = PLAYER.speed;
      const accel = player.onGround ? 1900 : 1300;
      const friction = player.onGround ? 2200 : 760;
      if (input !== 0) {
        player.vx = lerp(player.vx, input * maxSpeed, clamp((accel * dt) / maxSpeed, 0, 1));
      } else {
        const drag = friction * dt * Math.sign(player.vx);
        if (Math.abs(drag) > Math.abs(player.vx)) player.vx = 0;
        else player.vx -= drag;
      }
    }

    if (player.jumpBuffer > 0 && player.coyote > 0) {
      player.jumpBuffer = 0;
      player.coyote = 0;
      player.onGround = false;
      player.vy = -PLAYER.jump;
      playSfx("jump");
      spawnParticles(player.x + player.width / 2, player.y + player.height, 6, "#d7f0ff", 75);
    }

    if (!jumpHeld && player.vy < -180 && !player.jumpCut) {
      player.vy *= 0.82;
      player.jumpCut = true;
    }
    if (jumpHeld) player.jumpCut = false;

    if (wantsHeart) {
      spawnParticles(player.x + player.width / 2, player.y + 8, 6, "#ff8fb8", 90, "heart");
      markDiscovered("heart-burst", "Heart burst discovered. Pollo definitely noticed.");
      const closeSpot = state.currentLevel.polloSpots.find((spot) => Math.abs(spot.x - player.x) < 140);
      if (closeSpot) announce("Pollo laughed, but in a suspiciously affectionate way.", 3.8);
    }
  }

  function applyWorldForces(dt) {
    const player = state.player;
    for (const zone of state.currentLevel.winds) {
      if (intersects(getRect(player), zone)) {
        player.vy -= zone.force * dt;
        player.vx += zone.push * dt;
      }
    }
  }

  function movePlayer(dt) {
    const player = state.player;
    if (player.standingOn && player.standingOn.kind === "moving") {
      player.x += player.standingOn.x - player.standingOn.prevX;
      player.y += player.standingOn.y - player.standingOn.prevY;
    }

    if (player.dashTimer <= 0) {
      player.vy = clamp(player.vy + PLAYER.gravity * dt, -999, PLAYER.maxFall);
    }

    applyWorldForces(dt);

    const solidPlatforms = solids();

    const previousX = player.x;
    player.x += player.vx * dt;
    for (const solid of solidPlatforms) {
      if (!intersects(getRect(player), solid)) continue;
      if (player.vx > 0) player.x = solid.x - player.width;
      else if (player.vx < 0) player.x = solid.x + solid.width;
      player.vx = 0;
    }

    const previousY = player.y;
    player.y += player.vy * dt;
    player.onGround = false;
    player.standingOn = null;
    for (const solid of solidPlatforms) {
      if (!intersects(getRect(player), solid)) continue;
      const fromAbove = previousY + player.height <= solid.y + 12;
      const fromBelow = previousY >= solid.y + solid.height - 12;
      if (player.vy >= 0 && fromAbove) {
        player.y = solid.y - player.height;
        player.vy = 0;
        player.onGround = true;
        player.coyote = 0.12;
        player.standingOn = solid;
        if (solid.kind === "crumble" && !solid.broken && solid.timer <= 0) {
          solid.timer = 0.52;
        }
      } else if (player.vy < 0 && fromBelow) {
        player.y = solid.y + solid.height;
        player.vy = 0;
      } else if (player.x > previousX) {
        player.x = solid.x - player.width;
        player.vx = 0;
      } else {
        player.x = solid.x + solid.width;
        player.vx = 0;
      }
    }

    for (const bumper of state.currentLevel.springs) {
      const playerFeet = { x: player.x + 4, y: player.y + player.height - 4, width: player.width - 8, height: 8 };
      if (intersects(playerFeet, bumper) && player.vy >= 0) {
        player.y = bumper.y - player.height + 2;
        player.vy = -bumper.power;
        player.coyote = 0;
        spawnParticles(player.x + player.width / 2, bumper.y, 10, "#ffe08b", 110);
        playSfx("jump");
      }
    }

    if (player.y > VIEW.height + 180) {
      respawn("The slope won that exchange. Try again.");
    }
  }

  function updateHazards(dt) {
    for (const hazardItem of state.currentLevel.hazards) {
      if (hazardItem.kind === "bird") {
        hazardItem.x += hazardItem.speed * hazardItem.dir * dt;
        if (hazardItem.x < hazardItem.min || hazardItem.x > hazardItem.max) {
          hazardItem.dir *= -1;
        }
        hazardItem.y = hazardItem.baseY + Math.sin(state.levelTime * 3 + hazardItem.phase) * (hazardItem.amplitude || 14);
      } else {
        hazardItem.x += hazardItem.speed * hazardItem.dir * dt;
        if (hazardItem.x < hazardItem.min || hazardItem.x > hazardItem.max) {
          hazardItem.dir *= -1;
          hazardItem.x = clamp(hazardItem.x, hazardItem.min, hazardItem.max);
        }
      }

      if (state.player.invuln <= 0 && intersects(getRect(state.player), hazardItem)) {
        respawn(`${hazardName(hazardItem.kind)} said absolutely not.`);
      }
    }
  }

  function hazardName(kind) {
    if (kind === "goat") return "A determined goat";
    if (kind === "cat") return "A judgemental rooftop cat";
    if (kind === "cheese") return "A runaway cheese wheel";
    return "A dramatic alpine bird";
  }

  function updateCollectibles() {
    const playerRect = getRect(state.player);
    for (const flowerItem of state.currentLevel.flowers) {
      if (flowerItem.collected || hasFlower(flowerItem.id)) {
        flowerItem.collected = true;
        continue;
      }
      if (intersects(playerRect, flowerItem)) {
        flowerItem.collected = true;
        save.flowers[flowerItem.id] = true;
        persistSave();
        spawnParticles(flowerItem.x + 8, flowerItem.y + 8, 10, "#ffffff", 85, "flower");
        playSfx("flower");
        announce("Edelweiss found. Pollo would definitely approve of the effort.", 3.5);
      }
    }

    for (const bellItem of state.currentLevel.bells) {
      if (bellItem.collected || hasBell(bellItem.id)) {
        bellItem.collected = true;
        continue;
      }
      if (intersects(playerRect, bellItem)) {
        bellItem.collected = true;
        save.bells[bellItem.id] = true;
        if (mainBellIds().every((id) => hasBell(id) || id === bellItem.id)) {
          save.bonusUnlocked = true;
          markDiscovered("bonus-unlocked", "All four cowbells found. A moonrise bonus route has unlocked.");
        }
        persistSave();
        spawnParticles(bellItem.x + 10, bellItem.y + 10, 14, "#ffd76a", 105, "bell");
        playSfx("bell");
        announce("Secret cowbell found. Switzerland itself seems impressed.", 4.2);
      }
    }
  }

  function updateCheckpoints() {
    const playerRect = getRect(state.player);
    for (const checkpointItem of state.currentLevel.checkpoints) {
      if (!checkpointItem.active && intersects(playerRect, checkpointItem)) {
        checkpointItem.active = true;
        state.player.spawnX = checkpointItem.x - 10;
        state.player.spawnY = checkpointItem.y - 60;
        announce("Checkpoint lit. If romance goes sideways, you restart here.", 3.2);
      }
    }
  }

  function updateHints() {
    const player = state.player;
    const currentHint = state.currentLevel.hints.find((item) => Math.abs(item.x - player.x) < 56 && Math.abs(item.y - player.y) < 72);
    if (currentHint && state.storyTimer <= 0) {
      state.story = currentHint.text;
      syncPanels();
    } else if (!currentHint && state.storyTimer <= 0) {
      state.story = state.baseStory;
      syncPanels();
    }

    for (const spot of state.currentLevel.polloSpots) {
      if (!spot.triggered && state.player.x + 60 >= spot.x) {
        spot.triggered = true;
        announce(spot.text, 3.2);
      }
    }
  }

  function updateGoal() {
    if (!state.currentLevel || state.mode !== "playing") return;
    if (intersects(getRect(state.player), state.currentLevel.goal)) {
      finishLevel(false);
    }
  }

  function finishLevel(skipped) {
    playSfx("goal");
    const index = state.currentLevelIndex;
    save.furthestLevel = Math.max(save.furthestLevel, Math.min(index + 1, 3));
    if (index === 3) save.mainComplete = true;
    if (index === BONUS_LEVEL_INDEX) save.bonusComplete = true;
    if (save.bestTime === null || state.time < save.bestTime) save.bestTime = state.time;
    if (mainBellIds().every((id) => hasBell(id))) save.bonusUnlocked = true;
    persistSave();
    syncSecrets();

    if (index === 3) {
      const perfectMain = totalFlowers() >= 12;
      const gotBonus = save.bonusUnlocked;
      const endingText = gotBonus
        ? `On the Gruyères terrace, Nate finally caught Pollo and offered the ring. She said yes, then pointed at a moonlit ridge and said there was still one secret route left for romantics with stamina.${perfectMain ? " Also: every Edelweiss was collected, which is honestly absurdly impressive." : ""}`
        : `On the Gruyères terrace, Nate finally caught Pollo and offered the ring. She said yes. Somewhere in the wind, four secret cowbells suggested there might still be one more hidden route.`;
      state.confetti = true;
      if (gotBonus) showLevelClear(endingText, () => startRun(BONUS_LEVEL_INDEX), "Play Bonus Level", true);
      else showEnding(endingText, "Castle Terrace");
      return;
    }

    if (index === BONUS_LEVEL_INDEX) {
      const extra = save.chickenMode ? " Pollo also confirmed the chicken disguise should never disappear." : "";
      showEnding(`At the moonlit summit, fireworks cracked over the Matterhorn while Nate gave Pollo the ring for real. It was ridiculous, dramatic, and perfect.${extra}`, "Secret Ending");
      return;
    }

    showLevelClear(
      skipped ? `Debug hop complete. ${state.currentLevel.endText}` : `${state.currentLevel.clear} ${state.currentLevel.endText}`,
      () => startRun(index + 1),
      `Next Stop: ${LEVELS[index + 1].location}`
    );
  }

  function respawn(reason) {
    if (state.player.invuln > 0) return;
    playSfx("hurt");
    state.player.x = state.player.spawnX;
    state.player.y = state.player.spawnY;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.invuln = 1.2;
    state.player.dashCooldown = 0.25;
    state.player.dashTimer = 0;
    state.flash = 0.25;
    spawnParticles(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, 12, "#ff8da1", 120, "heart");
    announce(reason, 2.8);
  }

  function updateParticles(dt) {
    state.particles = state.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 180 * dt;
      return particle.life > 0;
    });
  }

  function update(dt) {
    state.sceneTime += dt;
    if (state.flash > 0) state.flash -= dt;
    if (state.storyTimer > 0) {
      state.storyTimer -= dt;
      if (state.storyTimer <= 0) {
        state.story = state.baseStory;
        syncPanels();
      }
    }

    if (state.mode !== "playing") {
      updateParticles(dt);
      syncHud();
      return;
    }

    state.time += dt;
    state.levelTime += dt;
    updateMovingPlatforms(dt);
    stepCrumble(dt);
    playerInput(dt);
    if (state.mode !== "playing") return;
    movePlayer(dt);
    updateHazards(dt);
    updateCollectibles();
    updateCheckpoints();
    updateHints();
    updateGoal();
    updateParticles(dt);
    state.cameraX = clamp(state.player.x - VIEW.width * 0.34, 0, state.currentLevel.width - VIEW.width);
    syncHud();
  }

  function rectOnScreen(entity) {
    return entity.x + entity.width >= state.cameraX - 120 && entity.x <= state.cameraX + VIEW.width + 120;
  }

  function renderBackground() {
    const theme = state.currentLevel ? state.currentLevel.theme : "grindelwald";
    const gradients = {
      grindelwald: ["#79b7ff", "#dff1ff"],
      lauterbrunnen: ["#7bc2ff", "#dff6ff"],
      bern: ["#8db6ff", "#ffe0ba"],
      gruyeres: ["#a7b8ff", "#ffddb7"],
      matterhorn: ["#182f6f", "#7e8fff"]
    };
    const [top, bottom] = gradients[theme] || gradients.grindelwald;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    sky.addColorStop(0, top);
    sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    if (theme === "matterhorn") {
      drawStars();
    } else {
      drawClouds(theme);
    }

    drawMountainLayer(theme, state.cameraX * 0.15, 380, "#9bb0d9", 120, 42);
    drawMountainLayer(theme, state.cameraX * 0.28, 420, "#6f89b8", 154, 58);
    drawMountainLayer(theme, state.cameraX * 0.46, 450, "#46608d", 194, 78);
    drawThemeLandmarks(theme);
  }

  function drawStars() {
    for (let i = 0; i < 70; i += 1) {
      const x = (i * 137 + state.sceneTime * 4) % VIEW.width;
      const y = (i * 53) % 220;
      const size = i % 4 === 0 ? 3 : 2;
      ctx.fillStyle = i % 5 === 0 ? "#ffe7af" : "#f7fbff";
      ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    }
  }

  function drawClouds(theme) {
    const tint = theme === "bern" ? "rgba(255, 244, 225, 0.75)" : "rgba(255,255,255,0.7)";
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 220) - state.cameraX * (0.06 + i * 0.01) + state.sceneTime * (5 + i)) % (VIEW.width + 260) - 80;
      const y = 55 + (i % 3) * 45;
      ctx.fillStyle = tint;
      ctx.fillRect(Math.floor(x), y, 74, 16);
      ctx.fillRect(Math.floor(x + 16), y - 10, 54, 14);
      ctx.fillRect(Math.floor(x + 26), y + 10, 40, 10);
    }
  }

  function drawMountainLayer(theme, offset, baseY, color, span, height) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.height);
    for (let x = -span; x <= VIEW.width + span; x += span) {
      const worldX = x + offset;
      const peak = Math.round((Math.sin(worldX * 0.0031) * 0.45 + Math.cos(worldX * 0.0019) * 0.55) * 24);
      const summit = baseY - height + peak;
      ctx.lineTo(x, baseY);
      ctx.lineTo(x + span * 0.5, summit);
      ctx.lineTo(x + span, baseY);
    }
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.closePath();
    ctx.fill();

    if (theme === "grindelwald" || theme === "matterhorn") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let x = -span; x <= VIEW.width + span; x += span) {
        const worldX = x + offset;
        const peak = Math.round((Math.sin(worldX * 0.0031) * 0.45 + Math.cos(worldX * 0.0019) * 0.55) * 24);
        const summit = baseY - height + peak;
        ctx.beginPath();
        ctx.moveTo(x + span * 0.38, summit + 18);
        ctx.lineTo(x + span * 0.5, summit);
        ctx.lineTo(x + span * 0.62, summit + 18);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawThemeLandmarks(theme) {
    if (theme === "grindelwald") {
      drawCableLine(40, 120, 760, 220, "#324c72");
      drawChalet(180, 330, 0.6);
      drawChalet(640, 350, 0.5);
    } else if (theme === "lauterbrunnen") {
      drawWaterfall(130, 70, 46, 260);
      drawWaterfall(660, 90, 36, 240);
      drawWaterfall(778, 80, 22, 300);
    } else if (theme === "bern") {
      drawClockTower(620, 178, 0.72);
      drawBernRows();
    } else if (theme === "gruyeres") {
      drawCastle(590, 188, 0.7);
      drawCow(100, 392, 0.9);
      drawCow(760, 404, 0.75);
    } else if (theme === "matterhorn") {
      drawMatterhorn();
      drawAurora();
    }
  }

  function drawCableLine(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) {
      const t = i / 2;
      const x = lerp(x1, x2, t);
      const y = lerp(y1, y2, t);
      ctx.fillStyle = "#aa1d29";
      ctx.fillRect(Math.round(x) - 18, Math.round(y), 36, 20);
      ctx.fillStyle = "#f6f7fb";
      ctx.fillRect(Math.round(x) - 12, Math.round(y) + 4, 24, 10);
    }
  }

  function drawChalet(x, y, scale) {
    ctx.fillStyle = "#6d3d22";
    ctx.fillRect(x, y, 96 * scale, 46 * scale);
    ctx.fillStyle = "#4f2f1c";
    ctx.beginPath();
    ctx.moveTo(x - 6 * scale, y);
    ctx.lineTo(x + 48 * scale, y - 28 * scale);
    ctx.lineTo(x + 102 * scale, y);
    ctx.fill();
    ctx.fillStyle = "#ffda8a";
    ctx.fillRect(x + 14 * scale, y + 12 * scale, 14 * scale, 12 * scale);
    ctx.fillRect(x + 48 * scale, y + 12 * scale, 14 * scale, 12 * scale);
  }

  function drawWaterfall(x, y, width, height) {
    ctx.fillStyle = "rgba(205, 241, 255, 0.74)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.46)";
    for (let i = 0; i < width; i += 8) {
      ctx.fillRect(x + i, y, 3, height);
    }
  }

  function drawClockTower(x, y, scale) {
    ctx.fillStyle = "#7d6b5d";
    ctx.fillRect(x, y, 72 * scale, 184 * scale);
    ctx.fillStyle = "#36537e";
    ctx.fillRect(x - 12 * scale, y + 172 * scale, 96 * scale, 18 * scale);
    ctx.fillStyle = "#f0e2b8";
    ctx.beginPath();
    ctx.arc(x + 36 * scale, y + 58 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6b5338";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 36 * scale, y + 58 * scale);
    ctx.lineTo(x + 36 * scale, y + 46 * scale);
    ctx.moveTo(x + 36 * scale, y + 58 * scale);
    ctx.lineTo(x + 48 * scale, y + 58 * scale);
    ctx.stroke();
  }

  function drawBernRows() {
    ctx.fillStyle = "rgba(133, 84, 64, 0.78)";
    for (let i = 0; i < 9; i += 1) {
      const x = 80 + i * 110 - (state.cameraX * 0.08) % 110;
      const y = 320 + (i % 2) * 16;
      ctx.fillRect(x, y, 86, 56);
      ctx.fillStyle = "#7b3030";
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 42, y - 22);
      ctx.lineTo(x + 90, y);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 235, 188, 0.82)";
      ctx.fillRect(x + 14, y + 18, 10, 12);
      ctx.fillRect(x + 38, y + 18, 10, 12);
      ctx.fillRect(x + 62, y + 18, 10, 12);
      ctx.fillStyle = "rgba(133, 84, 64, 0.78)";
    }
  }

  function drawCastle(x, y, scale) {
    ctx.fillStyle = "#8c8b90";
    ctx.fillRect(x, y + 32 * scale, 170 * scale, 86 * scale);
    ctx.fillRect(x + 18 * scale, y, 34 * scale, 120 * scale);
    ctx.fillRect(x + 118 * scale, y + 6 * scale, 36 * scale, 114 * scale);
    ctx.fillStyle = "#f5d27d";
    ctx.fillRect(x + 78 * scale, y + 64 * scale, 20 * scale, 42 * scale);
    ctx.fillStyle = "#d45e5e";
    ctx.fillRect(x + 29 * scale, y - 18 * scale, 6 * scale, 20 * scale);
    ctx.fillRect(x + 133 * scale, y - 12 * scale, 6 * scale, 20 * scale);
  }

  function drawCow(x, y, scale) {
    ctx.fillStyle = "#fff6de";
    ctx.fillRect(x, y, 42 * scale, 20 * scale);
    ctx.fillRect(x + 28 * scale, y - 14 * scale, 18 * scale, 14 * scale);
    ctx.fillStyle = "#4a321f";
    ctx.fillRect(x + 4 * scale, y + 6 * scale, 10 * scale, 8 * scale);
    ctx.fillRect(x + 16 * scale, y + 2 * scale, 12 * scale, 10 * scale);
  }

  function drawMatterhorn() {
    ctx.fillStyle = "#6d7cc7";
    ctx.beginPath();
    ctx.moveTo(390, 510);
    ctx.lineTo(520, 110);
    ctx.lineTo(640, 510);
    ctx.fill();
    ctx.fillStyle = "#b8c6ff";
    ctx.beginPath();
    ctx.moveTo(520, 110);
    ctx.lineTo(560, 220);
    ctx.lineTo(520, 200);
    ctx.lineTo(468, 290);
    ctx.lineTo(452, 220);
    ctx.fill();
  }

  function drawAurora() {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#7af0ff";
    ctx.beginPath();
    ctx.moveTo(0, 88);
    ctx.bezierCurveTo(180, 40, 260, 160, 430, 120);
    ctx.bezierCurveTo(560, 90, 680, 30, 960, 100);
    ctx.lineTo(960, 136);
    ctx.bezierCurveTo(720, 66, 580, 132, 430, 160);
    ctx.bezierCurveTo(250, 194, 180, 74, 0, 130);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawPlatform(platform) {
    const sx = Math.round(platform.x - state.cameraX);
    const sy = Math.round(platform.y);
    if (sx > VIEW.width + 80 || sx + platform.width < -80) return;

    const styles = {
      grass: { top: "#70b454", body: "#6d4d2d" },
      meadow: { top: "#82bc57", body: "#6d5132" },
      wood: { top: "#8b623d", body: "#6a4627" },
      stone: { top: "#9aa3b4", body: "#6d7586" },
      snow: { top: "#eff8ff", body: "#a8bfe4" },
      roof: { top: "#c35a5a", body: "#7f5254" },
      castle: { top: "#a8acb7", body: "#7d8290" },
      garden: { top: "#7ab15e", body: "#5e6c55" },
      gondola: { top: "#af1c2a", body: "#5c1622" },
      lift: { top: "#d2b483", body: "#745b3b" },
      clock: { top: "#d5c097", body: "#7f6a4d" }
    };
    const style = styles[platform.style] || styles.grass;
    ctx.fillStyle = style.body;
    ctx.fillRect(sx, sy, platform.width, platform.height);
    ctx.fillStyle = style.top;
    ctx.fillRect(sx, sy, platform.width, Math.min(10, platform.height));

    if (platform.kind === "crumble" && platform.timer > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(sx + 4, sy + 4, platform.width - 8, platform.height - 8);
    }

    if (platform.style === "roof") {
      ctx.fillStyle = "rgba(90, 28, 28, 0.26)";
      for (let x = sx; x < sx + platform.width; x += 18) {
        ctx.fillRect(x, sy + 8, 14, 2);
      }
    }
  }

  function drawCollectibles() {
    for (const item of state.currentLevel.flowers) {
      if (item.collected || hasFlower(item.id)) continue;
      drawFlower(item.x, item.y, item.bob);
    }
    for (const item of state.currentLevel.bells) {
      if (item.collected || hasBell(item.id)) continue;
      drawBell(item.x, item.y, item.bob);
    }
  }

  function drawFlower(x, y, bob) {
    const sx = Math.round(x - state.cameraX);
    const sy = Math.round(y + Math.sin(state.sceneTime * 4 + bob) * 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx + 6, sy, 6, 18);
    ctx.fillRect(sx, sy + 6, 18, 6);
    ctx.fillStyle = "#ffd55f";
    ctx.fillRect(sx + 6, sy + 6, 6, 6);
  }

  function drawBell(x, y, bob) {
    const sx = Math.round(x - state.cameraX);
    const sy = Math.round(y + Math.sin(state.sceneTime * 3 + bob) * 5);
    ctx.fillStyle = "#f6c94f";
    ctx.fillRect(sx + 4, sy + 4, 12, 14);
    ctx.fillRect(sx + 6, sy, 8, 6);
    ctx.fillStyle = "#6b4f12";
    ctx.fillRect(sx + 8, sy + 18, 4, 4);
  }

  function drawCheckpoints() {
    for (const point of state.currentLevel.checkpoints) {
      const sx = Math.round(point.x - state.cameraX);
      if (sx > VIEW.width + 20 || sx < -40) continue;
      ctx.fillStyle = "#42516c";
      ctx.fillRect(sx, point.y, 4, point.height);
      ctx.fillStyle = point.active ? "#87f0a3" : "#ffd26c";
      ctx.beginPath();
      ctx.moveTo(sx + 4, point.y);
      ctx.lineTo(sx + 28, point.y + 8);
      ctx.lineTo(sx + 4, point.y + 18);
      ctx.fill();
    }
  }

  function drawHints() {
    for (const item of state.currentLevel.hints) {
      const sx = Math.round(item.x - state.cameraX);
      if (sx > VIEW.width + 50 || sx < -50) continue;
      drawHintSprite(item.variant, sx, item.y);
    }
  }

  function drawHintSprite(variant, x, y) {
    if (variant === "marmot") {
      ctx.fillStyle = "#8a6038";
      ctx.fillRect(x, y, 18, 18);
      ctx.fillRect(x + 4, y - 8, 10, 10);
      ctx.fillStyle = "#f5e7d0";
      ctx.fillRect(x + 7, y - 4, 4, 4);
    } else {
      ctx.fillStyle = "#a7834f";
      ctx.fillRect(x, y, 20, 22);
      ctx.fillStyle = "#efd49a";
      ctx.fillRect(x + 3, y + 4, 14, 4);
    }
  }

  function drawHazards() {
    for (const item of state.currentLevel.hazards) {
      if (!rectOnScreen(item)) continue;
      const sx = Math.round(item.x - state.cameraX);
      const sy = Math.round(item.y);
      if (item.kind === "goat") {
        ctx.fillStyle = "#f6f3e5";
        ctx.fillRect(sx, sy + 6, 34, 18);
        ctx.fillRect(sx + 20, sy - 2, 12, 10);
        ctx.fillStyle = "#6a4a31";
        ctx.fillRect(sx + 24, sy - 6, 3, 5);
        ctx.fillRect(sx + 29, sy - 6, 3, 5);
      } else if (item.kind === "cat") {
        ctx.fillStyle = "#283245";
        ctx.fillRect(sx, sy + 6, 30, 16);
        ctx.fillRect(sx + 18, sy, 10, 8);
        ctx.fillRect(sx + 19, sy - 4, 3, 4);
        ctx.fillRect(sx + 24, sy - 4, 3, 4);
      } else if (item.kind === "cheese") {
        ctx.fillStyle = "#f2c75c";
        ctx.beginPath();
        ctx.arc(sx + 17, sy + 17, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#dfad39";
        ctx.fillRect(sx + 10, sy + 8, 5, 5);
        ctx.fillRect(sx + 18, sy + 15, 4, 4);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx, sy + 8, 26, 10);
        ctx.fillRect(sx + 20, sy + 4, 14, 8);
        ctx.fillStyle = "#f5ca58";
        ctx.fillRect(sx + 28, sy + 10, 6, 2);
      }
    }
  }

  function drawGoal() {
    const goalZone = state.currentLevel.goal;
    const sx = Math.round(goalZone.x - state.cameraX);
    if (sx > VIEW.width + 40 || sx < -140) return;
    const flowerY = goalZone.y + goalZone.height - 6;
    drawGoalFlowers(sx + 4, flowerY, 0.9);
    drawGoalFlowers(sx + 34, flowerY - 2, 1.1);
    drawPolloSprite(sx + 24, goalZone.y + goalZone.height - 64, 1.3, true);
    drawHeart(sx + 16, goalZone.y + 28, 0.8);
    drawHeart(sx + 74, goalZone.y + 10, 1);
    ctx.fillStyle = "rgba(255, 242, 247, 0.55)";
    ctx.fillRect(sx + 28, goalZone.y + goalZone.height - 6, 42, 4);
  }

  function drawPolloSpot(spot) {
    const sx = Math.round(spot.x - state.cameraX);
    if (sx > VIEW.width + 40 || sx < -80) return;
    drawPolloSprite(sx, spot.y, 1);
  }

  function drawPlayer() {
    const player = state.player;
    const sx = Math.round(player.x - state.cameraX);
    const sy = Math.round(player.y);
    ctx.save();
    if (player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0) ctx.globalAlpha = 0.45;
    if (save.chickenMode) {
      drawChickenNate(sx, sy, player.facing, player.scarf);
    } else {
      drawNate(sx, sy, player.facing, player.scarf);
    }
    drawRing(sx - 10 * player.facing, sy + 12);
    ctx.restore();
  }

  function drawNate(x, y, facing, scarf) {
    ctx.fillStyle = "#f6d5be";
    ctx.fillRect(x + 8, y, 12, 12);
    ctx.fillStyle = "#40261b";
    ctx.fillRect(x + 6, y, 16, 6);
    ctx.fillStyle = "#2f66d0";
    ctx.fillRect(x + 6, y + 12, 16, 14);
    ctx.fillStyle = "#172a45";
    ctx.fillRect(x + 6, y + 26, 6, 14);
    ctx.fillRect(x + 16, y + 26, 6, 14);
    ctx.fillStyle = "#f6d5be";
    if (facing > 0) ctx.fillRect(x + 21, y + 14, 6, 4);
    else ctx.fillRect(x + 1, y + 14, 6, 4);
    if (scarf) {
      ctx.fillStyle = "#ff6f86";
      ctx.fillRect(x + 6, y + 12, 16, 4);
      ctx.fillRect(facing > 0 ? x + 2 : x + 20, y + 12, 6, 12);
    }
  }

  function drawChickenNate(x, y, facing, scarf) {
    ctx.fillStyle = "#fff2cf";
    ctx.fillRect(x + 4, y + 4, 20, 20);
    ctx.fillRect(x + 8, y, 12, 8);
    ctx.fillStyle = "#ffbd42";
    ctx.fillRect(facing > 0 ? x + 22 : x + 2, y + 10, 6, 4);
    ctx.fillStyle = "#e75353";
    ctx.fillRect(x + 10, y - 4, 8, 4);
    ctx.fillRect(x + 8, y - 8, 12, 4);
    ctx.fillStyle = "#202f48";
    ctx.fillRect(x + 7, y + 24, 6, 16);
    ctx.fillRect(x + 15, y + 24, 6, 16);
    if (scarf) {
      ctx.fillStyle = "#ff6f86";
      ctx.fillRect(x + 6, y + 16, 16, 4);
    }
  }

  function drawPolloSprite(x, y, scale, holdingFlowers = false) {
    const s = scale;
    const px = (value) => Math.round(value * s);
    const skin = "#f4e6dc";
    const hair = "#8b5b39";
    const dress = "#d7ebff";
    const apron = "#f7fbff";
    const ribbon = "#ff9cbb";

    ctx.fillStyle = hair;
    ctx.fillRect(x + px(4), y + px(3), px(16), px(11));
    ctx.fillRect(x + px(15), y + px(10), px(4), px(14));
    ctx.fillRect(x + px(17), y + px(22), px(3), px(6));

    ctx.fillStyle = skin;
    ctx.fillRect(x + px(7), y, px(10), px(10));
    ctx.fillRect(x + px(5), y + px(12), px(3), px(8));
    ctx.fillRect(x + px(17), y + px(12), px(3), px(8));

    ctx.fillStyle = dress;
    ctx.fillRect(x + px(5), y + px(10), px(14), px(18));
    ctx.fillStyle = apron;
    ctx.fillRect(x + px(9), y + px(14), px(6), px(10));
    ctx.fillStyle = ribbon;
    ctx.fillRect(x + px(5), y + px(10), px(14), px(3));
    ctx.fillRect(x + px(11), y + px(24), px(2), px(4));

    ctx.fillStyle = ribbon;
    ctx.fillRect(x + px(6), y + px(1), px(2), px(2));
    ctx.fillRect(x + px(10), y - px(1), px(2), px(2));
    ctx.fillRect(x + px(14), y + px(1), px(2), px(2));
    ctx.fillStyle = "#ffe46f";
    ctx.fillRect(x + px(8), y, px(2), px(2));
    ctx.fillRect(x + px(12), y, px(2), px(2));

    ctx.fillStyle = "#f4c85b";
    ctx.fillRect(x + px(8), y + px(28), px(3), px(8));
    ctx.fillRect(x + px(14), y + px(28), px(3), px(8));

    if (holdingFlowers) {
      drawBouquet(x + px(19), y + px(15), s);
    } else {
      ctx.fillStyle = skin;
      ctx.fillRect(x + px(19), y + px(13), px(3), px(7));
      ctx.fillStyle = ribbon;
      ctx.fillRect(x + px(20), y + px(12), px(2), px(2));
    }
  }

  function drawBouquet(x, y, scale) {
    const s = scale;
    const px = (value) => Math.max(1, Math.round(value * s));
    ctx.fillStyle = "#5d9b53";
    ctx.fillRect(x + px(1), y + px(5), px(2), px(7));
    ctx.fillRect(x + px(4), y + px(5), px(2), px(8));
    ctx.fillRect(x + px(7), y + px(5), px(2), px(7));
    ctx.fillStyle = "#ff9db7";
    ctx.fillRect(x, y + px(1), px(4), px(4));
    ctx.fillStyle = "#f8d86b";
    ctx.fillRect(x + px(3), y, px(4), px(4));
    ctx.fillStyle = "#f7fbff";
    ctx.fillRect(x + px(6), y + px(1), px(4), px(4));
    ctx.fillStyle = "#86c977";
    ctx.fillRect(x + px(2), y + px(8), px(6), px(3));
  }

  function drawGoalFlowers(x, y, scale) {
    const s = scale;
    const px = (value) => Math.max(1, Math.round(value * s));
    const palette = [
      { blossom: "#ff9db7", center: "#ffe46f", dx: 0 },
      { blossom: "#f7fbff", center: "#ffd869", dx: 10 },
      { blossom: "#9ed6ff", center: "#ffe46f", dx: 20 },
      { blossom: "#ffbdd0", center: "#ffe46f", dx: 31 }
    ];

    for (const flower of palette) {
      const fx = x + px(flower.dx);
      ctx.fillStyle = "#6aac5f";
      ctx.fillRect(fx + px(3), y - px(10), px(2), px(12));
      ctx.fillStyle = flower.blossom;
      ctx.fillRect(fx, y - px(14), px(8), px(4));
      ctx.fillRect(fx + px(2), y - px(16), px(4), px(8));
      ctx.fillStyle = flower.center;
      ctx.fillRect(fx + px(3), y - px(13), px(2), px(2));
    }
  }

  function drawRing(x, y) {
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#07111d";
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e4f0ff";
    ctx.fillRect(x - 1, y - 8, 3, 3);
  }

  function drawHeart(x, y, scale) {
    ctx.fillStyle = "#ff8fb8";
    ctx.fillRect(x + 2 * scale, y, 4 * scale, 4 * scale);
    ctx.fillRect(x + 8 * scale, y, 4 * scale, 4 * scale);
    ctx.fillRect(x, y + 4 * scale, 14 * scale, 4 * scale);
    ctx.fillRect(x + 2 * scale, y + 8 * scale, 10 * scale, 4 * scale);
    ctx.fillRect(x + 4 * scale, y + 12 * scale, 6 * scale, 4 * scale);
  }

  function drawParticles() {
    for (const particle of state.particles) {
      const sx = Math.round(particle.x - state.cameraX);
      const sy = Math.round(particle.y);
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      if (particle.shape === "heart") {
        drawHeart(sx, sy, 0.5);
      } else if (particle.shape === "bell") {
        ctx.fillRect(sx, sy, 4, 8);
      } else if (particle.shape === "flower") {
        ctx.fillRect(sx, sy, 4, 4);
        ctx.fillRect(sx - 4, sy + 4, 12, 4);
      } else {
        ctx.fillRect(sx, sy, 4, 4);
      }
      ctx.globalAlpha = 1;
    }
  }

  function render() {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    renderBackground();

    if (state.currentLevel) {
      for (const platform of state.currentLevel.platforms) drawPlatform(platform);
      drawCheckpoints();
      drawCollectibles();
      drawHints();
      for (const spot of state.currentLevel.polloSpots) drawPolloSpot(spot);
      drawGoal();
      drawHazards();
      drawPlayer();
      drawParticles();
    } else {
      drawMountainLayer("grindelwald", state.sceneTime * 12, 400, "#8ba7d8", 140, 64);
    }

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.flash * 0.6})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }

    if (!state.photoMode && state.currentLevel) {
      drawCaption();
    }
  }

  function drawCaption() {
    ctx.fillStyle = "rgba(7, 17, 29, 0.62)";
    ctx.fillRect(18, 18, 250, 60);
    ctx.fillStyle = "#edf4ff";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(state.currentLevel.location, 30, 42);
    ctx.fillStyle = "#9ab0d0";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(state.currentLevel.subtitle, 30, 62);
  }

  function handleCodeInput(key) {
    if (!/^[a-z]$/i.test(key)) return;
    typedBuffer = `${typedBuffer}${key.toUpperCase()}`.slice(-CODE_TARGET.length);
    if (typedBuffer === CODE_TARGET) {
      save.chickenMode = !save.chickenMode;
      persistSave();
      markDiscovered("chicken-mode", save.chickenMode ? "Code accepted. Nate now chases love in full chicken mode." : "Chicken mode disabled. Dignity partially restored.");
    }
  }

  function onKeyDown(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
    if (!keyState.has(key)) pressedThisFrame.add(key);
    keyState.add(key);
    handleCodeInput(key);

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift"].includes(key)) {
      event.preventDefault();
    }

    if (event.key === "Enter" && state.mode === "menu") {
      startRun(0);
    } else if (event.key === "Escape" && state.mode === "playing") {
      showPause();
    } else if (event.key === "Enter" && state.mode === "paused") {
      resumeGame();
    }
  }

  function onKeyUp(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
    keyState.delete(key);
  }

  function frame(now) {
    if (!state.lastTime) state.lastTime = now;
    const dt = clamp((now - state.lastTime) / 1000, 0.001, 0.033);
    state.lastTime = now;
    update(dt);
    render();
    pressedThisFrame.clear();
    requestAnimationFrame(frame);
  }

  function exposeDebug() {
    window.__polloDebug = {
      start: () => startRun(0, { resetTimer: true }),
      continue: continueRun,
      nextLevel: () => {
        const nextIndex = clamp(state.currentLevelIndex + 1, 0, LEVELS.length - 1);
        startRun(nextIndex, { resetTimer: false });
      },
      setLevel: (index) => startRun(clamp(index, 0, LEVELS.length - 1), { resetTimer: false }),
      unlockBonus: () => {
        for (const id of mainBellIds()) save.bells[id] = true;
        save.bonusUnlocked = true;
        persistSave();
        syncSecrets();
      },
      getState: () => ({
        mode: state.mode,
        currentLevel: state.currentLevel ? state.currentLevel.id : null,
        playerX: state.player.x,
        playerY: state.player.y,
        flowers: totalFlowers(),
        bells: totalBells(),
        chickenMode: save.chickenMode
      }),
      teleportToGoal: () => {
        if (!state.currentLevel) return;
        const goalZone = state.currentLevel.goal;
        state.player.x = goalZone.x - 56;
        state.player.y = goalZone.y + goalZone.height - state.player.height;
        state.player.vx = 0;
        state.player.vy = 0;
        state.cameraX = clamp(goalZone.x - VIEW.width * 0.58, 0, state.currentLevel.width - VIEW.width);
      }
    };
  }

  canvas.tabIndex = 0;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  primaryButton.addEventListener("click", () => ensureAudio(), { once: true });
  secondaryButton.addEventListener("click", () => ensureAudio(), { once: true });
  syncSecrets();
  syncHud();
  syncPanels();
  showMenu();
  exposeDebug();
  requestAnimationFrame(frame);
})();
