(function () {
  "use strict";

  var S = window.KoalaSprite;
  var M = window.KoalaMessages;

  var canvas = document.getElementById("world");
  var ctx = canvas.getContext("2d");
  var bubble = document.getElementById("bubble");
  var bubbleText = document.getElementById("bubble-text");
  var bar = document.getElementById("bar");
  var sleepBtn = document.getElementById("btn-sleep");

  var view = { dpr: 1, scale: 4, W: 120, H: 260, k: 2 };
  var layout = { groundY: 200, branchY: 110, trunkX: 100, branchX0: 64, safeTop: 0 };
  var bg = document.createElement("canvas");
  var bgKey = "";
  var phase = "day";
  var snowSeason = false;

  var store = loadStore();

  function loadStore() {
    try {
      var raw = localStorage.getItem("koala.v1");
      if (raw) return JSON.parse(raw) || {};
    } catch (e) {}
    return {};
  }

  function saveStore() {
    try {
      localStorage.setItem("koala.v1", JSON.stringify(store));
    } catch (e) {}
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function chance(p) {
    return Math.random() < p;
  }

  var bags = {};
  function pick(name) {
    var bag = bags[name];
    if (!bag || bag.length === 0) {
      bag = M[name].slice();
      for (var i = bag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
      bags[name] = bag;
    }
    return bag.pop();
  }

  function randomMessage() {
    var r = Math.random();
    if (r < 0.4) return pick("Doruk");
    if (r < 0.58) return pick("Funny");
    return pick("Love");
  }

  function seeded(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var PHASES = {
    night: { sky: ["#0d1230", "#1c2350", "#2e3473"], far: "#232a5c", near: "#1d3a4a", grass: "#2f6b4a", grassDark: "#245a3d", grassLight: "#3f8458", bark: "#9d968c", barkDark: "#6e675f", leaf: "#3f6e5d", leafDark: "#2d5446", leafLight: "#5a8a78" },
    dawn: { sky: ["#6f6db3", "#ef9fae", "#ffd6a6"], far: "#9a7fb4", near: "#5f9a6c", grass: "#78b85a", grassDark: "#5f9c48", grassLight: "#9ad16f", bark: "#e2d6c4", barkDark: "#a8977f", leaf: "#6aa486", leafDark: "#4c8569", leafLight: "#98c8a8" },
    day: { sky: ["#58afe8", "#8ccff4", "#c9edfb"], far: "#8cc0d8", near: "#69b072", grass: "#7cc35c", grassDark: "#62a64a", grassLight: "#a2db74", bark: "#e8ddcc", barkDark: "#ad9c84", leaf: "#6faa8b", leafDark: "#4e8a6d", leafLight: "#a0cfb1" },
    dusk: { sky: ["#3a3878", "#b5679a", "#f7a37c"], far: "#7a5a8e", near: "#4f7f5f", grass: "#5f9c52", grassDark: "#4c8444", grassLight: "#7fb866", bark: "#cfbfae", barkDark: "#8f7d6c", leaf: "#5a8e78", leafDark: "#41705c", leafLight: "#86b39b" }
  };

  function currentPhase() {
    var h = new Date().getHours();
    if (h >= 21 || h < 5) return "night";
    if (h < 8) return "dawn";
    if (h < 17) return "day";
    return "dusk";
  }

  function hexToRgb(h) {
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }

  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return "rgb(" + Math.round(x[0] + (y[0] - x[0]) * t) + "," + Math.round(x[1] + (y[1] - x[1]) * t) + "," + Math.round(x[2] + (y[2] - x[2]) * t) + ")";
  }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var cssW = window.innerWidth;
    var cssH = window.innerHeight;
    var scale = Math.max(2, Math.round((cssW * dpr) / 124));
    view.dpr = dpr;
    view.scale = scale;
    view.W = Math.ceil((cssW * dpr) / scale);
    view.H = Math.ceil((cssH * dpr) / scale);
    view.k = scale / dpr;
    canvas.width = view.W;
    canvas.height = view.H;
    canvas.style.width = view.W * view.k + "px";
    canvas.style.height = view.H * view.k + "px";

    var barH = bar.getBoundingClientRect().height;
    var probe = getComputedStyle(document.documentElement).getPropertyValue("--sat");
    layout.safeTop = parseFloat(probe) || 0;
    layout.groundY = Math.round(view.H - barH / view.k - 7);
    layout.trunkX = view.W - 20;
    layout.branchX0 = layout.trunkX - 40;
    layout.branchY = Math.round(Math.max(layout.safeTop / view.k + 96, layout.groundY * 0.52));
    bgKey = "";
    if (koala) clampKoala();
  }

  function buildBackground() {
    phase = currentPhase();
    var m = new Date().getMonth();
    snowSeason = m === 11 || m === 0 || m === 1;
    var key = phase + "|" + view.W + "|" + view.H + "|" + layout.groundY + "|" + snowSeason;
    if (key === bgKey) return;
    bgKey = key;
    var P = PHASES[phase];
    var W = view.W, H = view.H, gy = layout.groundY;
    bg.width = W;
    bg.height = H;
    var g = bg.getContext("2d");
    var rnd = seeded(20251202);

    var band = 5;
    for (var y = 0; y < gy; y += band) {
      var t = Math.min(1, y / (gy - 20));
      var c = t < 0.5 ? mix(P.sky[0], P.sky[1], t * 2) : mix(P.sky[1], P.sky[2], (t - 0.5) * 2);
      g.fillStyle = c;
      g.fillRect(0, y, W, band);
      var t2 = Math.min(1, (y + band) / (gy - 20));
      var c2 = t2 < 0.5 ? mix(P.sky[0], P.sky[1], t2 * 2) : mix(P.sky[1], P.sky[2], (t2 - 0.5) * 2);
      g.fillStyle = c2;
      for (var x = (y / band) % 2; x < W; x += 2) g.fillRect(x, y + band - 1, 1, 1);
    }

    if (phase === "night") {
      drawDisc(g, 24, Math.round(layout.safeTop / view.k) + 26, 7, "#fff3c4", "#e8d9a0");
      g.fillStyle = "#e8d9a0";
      g.fillRect(21, Math.round(layout.safeTop / view.k) + 24, 2, 2);
      g.fillRect(26, Math.round(layout.safeTop / view.k) + 29, 2, 1);
    } else if (phase === "day") {
      drawDisc(g, 24, Math.round(layout.safeTop / view.k) + 28, 8, "#ffe27a", "#ffd04a");
    } else {
      drawDisc(g, 30, gy - 34, 9, phase === "dawn" ? "#ffe0a0" : "#ffb070", phase === "dawn" ? "#ffcf80" : "#ff9a5a");
    }

    for (var hx = 0; hx < W; hx++) {
      var top = Math.round(gy - 30 + Math.sin(hx * 0.05) * 6 + Math.sin(hx * 0.13 + 1) * 3);
      g.fillStyle = P.far;
      g.fillRect(hx, top, 1, gy - top);
      if (snowSeason) {
        g.fillStyle = "#eef3ff";
        g.fillRect(hx, top, 1, 1);
      }
    }
    for (var nx = 0; nx < W; nx++) {
      var ntop = Math.round(gy - 14 + Math.sin(nx * 0.08 + 2) * 4 + Math.sin(nx * 0.21) * 1.5);
      g.fillStyle = P.near;
      g.fillRect(nx, ntop, 1, gy - ntop);
      if (snowSeason) {
        g.fillStyle = "#f4f7ff";
        g.fillRect(nx, ntop, 1, 2);
      }
    }

    var gt = gy - 4;
    g.fillStyle = P.grass;
    g.fillRect(0, gt, W, H - gt);
    g.fillStyle = snowSeason ? "#f4f7ff" : P.grassLight;
    g.fillRect(0, gt, W, snowSeason ? 2 : 1);
    for (var i = 0; i < W * (H - gt) * 0.06; i++) {
      g.fillStyle = rnd() < 0.5 ? P.grassDark : P.grassLight;
      g.fillRect(Math.floor(rnd() * W), gt + 2 + Math.floor(rnd() * (H - gt)), 1, 1);
    }
    for (var tx = 0; tx < W; tx += 3 + Math.floor(rnd() * 4)) {
      g.fillStyle = snowSeason ? "#f4f7ff" : P.grassLight;
      g.fillRect(tx, gt - 1, 1, 1);
      if (rnd() < 0.4) g.fillRect(tx + 1, gt - 2, 1, 2);
    }
    if (!snowSeason) {
      var petals = phase === "night" ? ["#b8a6d8", "#8fa4d6"] : ["#ff9ab8", "#ffffff", "#ffd45c", "#c9a2ff"];
      for (var f = 0; f < W / 7; f++) {
        var fx = Math.floor(rnd() * W);
        var fy = gy + 3 + Math.floor(rnd() * Math.max(4, H - gy - 6));
        g.fillStyle = petals[Math.floor(rnd() * petals.length)];
        g.fillRect(fx - 1, fy, 1, 1);
        g.fillRect(fx + 1, fy, 1, 1);
        g.fillRect(fx, fy - 1, 1, 1);
        g.fillRect(fx, fy + 1, 1, 1);
        g.fillStyle = "#ffe066";
        g.fillRect(fx, fy, 1, 1);
      }
    }

    drawTree(g, P, rnd);
  }

  function drawDisc(g, cx, cy, r, color, shade) {
    for (var y = -r; y <= r; y++) {
      for (var x = -r; x <= r; x++) {
        var d = (x + 0.5) * (x + 0.5) + (y + 0.5) * (y + 0.5);
        if (d <= r * r) {
          g.fillStyle = d > (r - 1.5) * (r - 1.5) || (x > r / 3 && y > r / 3) ? shade : color;
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
  }

  function blob(g, cx, cy, rx, ry, P, rnd) {
    for (var y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        var d = dx * dx + dy * dy;
        if (d > 1 + (rnd() - 0.5) * 0.25) continue;
        var light = dx + dy < -0.7 ? P.leafLight : dx + dy > 0.6 ? P.leafDark : P.leaf;
        if (rnd() < 0.12) light = rnd() < 0.5 ? P.leafLight : P.leafDark;
        g.fillStyle = light;
        g.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawTree(g, P, rnd) {
    var tx = layout.trunkX, by = layout.branchY, gy = layout.groundY, bx0 = layout.branchX0;
    var trunkTop = by - 36;
    blob(g, tx + 2, trunkTop - 6, 20, 14, P, rnd);
    blob(g, tx - 16, trunkTop + 4, 14, 10, P, rnd);
    blob(g, tx + 12, trunkTop + 12, 11, 9, P, rnd);

    g.fillStyle = P.barkDark;
    g.fillRect(tx - 4, trunkTop, 8, gy - trunkTop + 2);
    g.fillStyle = P.bark;
    g.fillRect(tx - 3, trunkTop, 6, gy - trunkTop + 2);
    g.fillStyle = P.barkDark;
    g.fillRect(tx - 6, gy - 1, 3, 3);
    g.fillRect(tx + 3, gy - 1, 3, 3);
    for (var y = trunkTop + 3; y < gy; y += 5 + Math.floor(rnd() * 4)) {
      g.fillRect(tx - 2 + Math.floor(rnd() * 3), y, 2, 2 + Math.floor(rnd() * 2));
    }

    g.fillStyle = P.barkDark;
    g.fillRect(bx0, by - 1, tx - bx0, 5);
    g.fillStyle = P.bark;
    g.fillRect(bx0 + 1, by, tx - bx0 - 1, 3);
    g.fillStyle = P.barkDark;
    for (var x = bx0 + 4; x < tx - 4; x += 7) g.fillRect(x, by + 1, 2, 1);
    g.fillRect(bx0 - 3, by - 3, 4, 2);
    g.fillRect(bx0 - 5, by - 5, 3, 2);
    blob(g, bx0 - 6, by - 8, 6, 4, P, rnd);
    if (snowSeason) {
      g.fillStyle = "#f4f7ff";
      g.fillRect(bx0, by - 1, tx - bx0, 1);
    }

    for (var l = 0; l < 7; l++) {
      var lx = bx0 + 6 + Math.floor(rnd() * (tx - bx0 - 10));
      g.fillStyle = l % 2 ? P.leaf : P.leafDark;
      g.fillRect(lx, by + 4, 1, 2);
      g.fillRect(lx + 1, by + 6, 1, 1);
    }
  }

  var spriteCache = {};
  function sprite(look, frame, blink, blush, flip) {
    var key = look + frame + (blink ? 1 : 0) + (blush ? 1 : 0) + (flip ? 1 : 0);
    var c = spriteCache[key];
    if (!c) {
      c = S.toCanvas(S.build(look, frame, blink, blush), flip);
      spriteCache[key] = c;
    }
    return c;
  }

  var ICON_COLORS = { o: "#3a3347", W: "#ffffff", R: "#ff6f9a", Q: "#ffc2d4", L: "#6dbb73", l: "#3f8048", Y: "#ffd65c", y: "#e8a93a" };
  var ICONS = {
    leaf: ["......LL", "....LLLl", "...LLLl.", "..LLLl..", ".LLLl...", ".Ll.....", "l.......", "........"],
    mail: ["oooooooooo", "ooWWWWWWoo", "oWoWWWWoWo", "oWWoWWoWWo", "oWWWooWWWo", "oWWWWWWWWo", "oooooooooo"],
    heart: [".RR.RR.", "RQRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."],
    moon: ["..yyy..", ".yYYy..", "yYYy...", "yYYy...", "yYYy...", ".yYYy..", "..yyy.."],
    sun: ["...Y...", ".Y...Y.", "..YYY..", "YYYYYYY", "..YYY..", ".Y...Y.", "...Y..."]
  };

  function iconUrl(name) {
    var rows = ICONS[name];
    var c = document.createElement("canvas");
    c.width = rows[0].length;
    c.height = rows.length;
    var g = c.getContext("2d");
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < rows[y].length; x++) {
        var k = rows[y][x];
        if (ICON_COLORS[k]) {
          g.fillStyle = ICON_COLORS[k];
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    return c.toDataURL();
  }

  var koala = null;
  var particles = [];
  var leaf = null;
  var clouds = [];
  var stars = [];
  var flies = [];
  var flakes = [];
  var butterfly = { x: 20, y: 80, t: 0 };

  function newKoala() {
    return {
      x: Math.round(view.W * 0.4),
      y: layout.groundY,
      vx: 0,
      vy: 0,
      facing: 1,
      on: "ground",
      state: "fall",
      t: 0,
      dur: 0,
      plan: [],
      blink: false,
      blinkT: 3,
      blush: 0,
      hold: false,
      fallFrom: 0
    };
  }

  function clampKoala() {
    if (koala.on === "branch") {
      koala.y = layout.branchY;
      koala.x = Math.max(layout.branchX0 + 10, Math.min(layout.trunkX - 8, koala.x));
    } else if (koala.on === "ground") {
      koala.y = layout.groundY;
      koala.x = Math.max(14, Math.min(view.W - 14, koala.x));
    }
  }

  function setState(state, dur) {
    if (koala.state === "sleep" && state !== "sleep" && state !== "fall" && state !== "held" && chance(0.35) && !speech.text) {
      say(pick("Waking"), 3);
    }
    koala.state = state;
    koala.t = 0;
    koala.dur = dur || 0;
    koala.hold = false;
    updateSleepButton();
  }

  function routeTo(target, x) {
    var plan = [];
    var k = koala;
    var branchMin = layout.branchX0 + 10, branchMax = layout.trunkX - 8;
    if (target === "branch") {
      x = Math.max(branchMin, Math.min(branchMax, x));
      if (k.on === "ground") {
        plan.push({ type: "walk", x: layout.trunkX });
        plan.push({ type: "climbUp" });
      }
      plan.push({ type: "walk", x: x });
    } else {
      x = Math.max(14, Math.min(view.W - 14, x));
      if (k.on === "branch") {
        plan.push({ type: "walk", x: branchMax });
        plan.push({ type: "climbDown" });
      }
      plan.push({ type: "walk", x: x });
    }
    return plan;
  }

  function startPlan(plan) {
    koala.plan = plan;
    nextStep();
  }

  function nextStep() {
    var step = koala.plan.shift();
    if (!step) {
      setState("idle", rand(0.6, 1.4));
      return;
    }
    if (step.type === "walk") {
      if (Math.abs(step.x - koala.x) < 1.5) {
        nextStep();
        return;
      }
      setState("walk", 0);
      koala.targetX = step.x;
      koala.facing = step.x > koala.x ? 1 : -1;
    } else if (step.type === "climbUp") {
      setState("climbUp", 0);
      koala.on = "trunk";
      koala.x = layout.trunkX;
    } else if (step.type === "climbDown") {
      setState("climbDown", 0);
      koala.on = "trunk";
      koala.x = layout.trunkX;
      koala.y = layout.branchY;
    } else if (step.type === "do") {
      step.fn();
    }
  }

  function chooseNext() {
    var h = new Date().getHours();
    var night = h >= 23 || h < 6;
    var r = Math.random();
    if (night && r < 0.5) {
      setState("sleep", rand(30, 60));
      return;
    }
    if (koala.on === "branch") {
      if (r < 0.25) startPlan(routeTo("branch", rand(layout.branchX0 + 10, layout.trunkX - 8)));
      else if (r < 0.45) setState("sit", rand(5, 9));
      else if (r < 0.6) setState("sleep", rand(15, 30));
      else if (r < 0.75) startPlan(routeTo("ground", rand(14, layout.trunkX - 30)));
      else if (r < 0.82) setState("wave", 2);
      else setState("idle", rand(2, 4));
      return;
    }
    if (r < 0.3) startPlan(routeTo("ground", rand(14, view.W - 14)));
    else if (r < 0.45) setState("sit", rand(5, 9));
    else if (r < 0.52) setState("wave", 2);
    else if (r < 0.62) startPlan(routeTo("branch", rand(layout.branchX0 + 10, layout.trunkX - 8)));
    else if (r < 0.7) setState("sleep", rand(15, 30));
    else if (r < 0.8) {
      setState("idle", rand(3, 5));
      koala.hold = true;
    } else setState("idle", rand(2, 4));
  }

  var speech = { text: "", shown: 0, left: 0, queue: [] };

  function say(text, seconds) {
    speech.text = text;
    speech.shown = 0;
    speech.left = seconds + text.length / 30;
    bubbleText.textContent = "";
    bubble.classList.remove("show");
    void bubble.offsetWidth;
    bubble.classList.add("show");
  }

  function sayLater(text, seconds, delay) {
    speech.queue.push({ text: text, seconds: seconds, at: performance.now() + delay * 1000 });
  }

  function updateSpeech(dt) {
    if (speech.queue.length && (!speech.text || speech.left < 0.5) && performance.now() >= speech.queue[0].at) {
      var q = speech.queue.shift();
      say(q.text, q.seconds);
    }
    if (!speech.text) return;
    speech.left -= dt;
    if (speech.shown < speech.text.length) {
      speech.shown = Math.min(speech.text.length, speech.shown + dt * 34);
      bubbleText.textContent = speech.text.slice(0, Math.ceil(speech.shown));
    }
    if (speech.left <= 0) {
      speech.text = "";
      bubble.classList.remove("show");
    }
  }

  function placeBubble() {
    if (!speech.text && !bubble.classList.contains("show")) return;
    var k = view.k;
    var headY = koala.y - (koala.state === "sit" || koala.state === "sleep" ? 33 : 36);
    var ax = koala.x * k;
    var ay = headY * k;
    var w = bubble.offsetWidth;
    var h = bubble.offsetHeight;
    var left = Math.max(10, Math.min(window.innerWidth - w - 10, ax - w / 2));
    var top = Math.max(layout.safeTop + 10, ay - h - 12);
    bubble.style.transform = "translate(" + Math.round(left) + "px," + Math.round(top) + "px)";
    bubble.style.setProperty("--tail", Math.round(Math.max(18, Math.min(w - 18, ax - left))) + "px");
  }

  function spawnHeart(x, y, vx, vy, big) {
    var life = rand(1.2, 2);
    particles.push({ kind: big ? "heart" : "mini", x: x, y: y, vx: vx, vy: vy, life: life, max: life, hue: Math.floor(Math.random() * 3) });
  }

  function hearts(n) {
    for (var i = 0; i < n; i++) spawnHeart(koala.x + rand(-8, 8), koala.y - rand(26, 34), rand(-14, 14), rand(-30, -14), chance(0.5));
  }

  function heartRain() {
    for (var i = 0; i < 26; i++) {
      var life = rand(2, 3.4);
      particles.push({ kind: chance(0.6) ? "heart" : "mini", x: rand(4, view.W - 4), y: layout.groundY + rand(0, 20), vx: rand(-6, 6), vy: rand(-46, -24), life: life, max: life, hue: Math.floor(Math.random() * 3) });
    }
  }

  function spawnZ() {
    particles.push({ kind: "z", x: koala.x + 6 * (koala.facing || 1), y: koala.y - 34, vx: 0, vy: -7, life: 2.4, max: 2.4, seed: Math.random() * 6 });
  }

  var HEART = [".RR.RR.", "RQRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."];
  var MINI = [".R.R.", "RRRRR", "RRRRR", ".RRR.", "..R.."];
  var HEART_HUES = [["#ff6f9a", "#ffc2d4"], ["#ff8fb8", "#ffe0ea"], ["#e8507e", "#ff9fbd"]];
  var ZGLYPH = ["oooo", "..o.", ".o..", "oooo"];

  function drawMap(map, x, y, colors) {
    for (var j = 0; j < map.length; j++) {
      for (var i = 0; i < map[j].length; i++) {
        var c = colors[map[j][i]];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x + i, y + j, 1, 1);
        }
      }
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      if (p.kind === "z") {
        p.x += Math.sin(clock * 2 + p.seed) * 6 * dt;
      } else {
        p.vx *= 1 - dt * 0.8;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.life < 0.45 && Math.floor(p.life * 16) % 2 === 0) continue;
      var x = Math.round(p.x), y = Math.round(p.y);
      if (p.kind === "z") {
        drawMap(ZGLYPH, x, y, { o: phase === "night" ? "#c9d4ff" : "#5a6bb0" });
      } else {
        var hue = HEART_HUES[p.hue];
        drawMap(p.kind === "heart" ? HEART : MINI, x - 3, y - 3, { R: hue[0], Q: hue[1] });
      }
    }
  }

  function initAmbient() {
    var rnd = seeded(77);
    clouds = [];
    for (var i = 0; i < 4; i++) clouds.push({ x: rnd() * view.W, y: 18 + rnd() * (layout.branchY * 0.6), v: 1.5 + rnd() * 2.5, w: 14 + Math.floor(rnd() * 10) });
    stars = [];
    for (var s = 0; s < 40; s++) stars.push({ x: Math.floor(rnd() * view.W), y: Math.floor(rnd() * (layout.groundY - 40)), p: rnd() * 6, big: rnd() < 0.15 });
    flies = [];
    for (var f = 0; f < 6; f++) flies.push({ x: rnd() * view.W, y: layout.groundY - 10 - rnd() * 60, p: rnd() * 6 });
    flakes = [];
    for (var n = 0; n < 50; n++) flakes.push({ x: rnd() * view.W, y: rnd() * view.H, v: 8 + rnd() * 10, p: rnd() * 6 });
  }

  function drawCloud(c) {
    var x = Math.round(c.x), y = Math.round(c.y), w = c.w;
    var light = phase === "dusk" ? "#f6c6c8" : phase === "dawn" ? "#fff0ec" : "#ffffff";
    var shade = phase === "dusk" ? "#d89aaf" : phase === "dawn" ? "#f3cfd3" : "#dbeaf6";
    ctx.fillStyle = light;
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x + 2, y - 2, w - 6, 2);
    ctx.fillRect(x + Math.floor(w / 3), y - 4, Math.floor(w / 3), 2);
    ctx.fillStyle = shade;
    ctx.fillRect(x + 1, y + 3, w - 2, 1);
  }

  function drawAmbient(dt) {
    var W = view.W;
    if (phase === "night") {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var on = Math.sin(clock * 1.7 + s.p * 3) > -0.6;
        if (!on) continue;
        ctx.fillStyle = "#fff6d8";
        ctx.fillRect(s.x, s.y, 1, 1);
        if (s.big && Math.sin(clock + s.p) > 0.3) {
          ctx.fillStyle = "rgba(255,246,216,0.55)";
          ctx.fillRect(s.x - 1, s.y, 1, 1);
          ctx.fillRect(s.x + 1, s.y, 1, 1);
          ctx.fillRect(s.x, s.y - 1, 1, 1);
          ctx.fillRect(s.x, s.y + 1, 1, 1);
        }
      }
    } else {
      for (var c = 0; c < clouds.length; c++) {
        var cl = clouds[c];
        cl.x += cl.v * dt;
        if (cl.x > W + 4) cl.x = -cl.w - 4;
        drawCloud(cl);
      }
    }
  }

  function drawForegroundAmbient(dt) {
    if (phase === "night") {
      for (var i = 0; i < flies.length; i++) {
        var f = flies[i];
        f.x += Math.sin(clock * 0.7 + f.p) * 5 * dt;
        f.y += Math.cos(clock * 0.9 + f.p * 2) * 4 * dt;
        if (Math.sin(clock * 2.3 + f.p * 5) > 0) {
          ctx.fillStyle = "rgba(255,240,140,0.35)";
          ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y), 3, 1);
          ctx.fillRect(Math.round(f.x), Math.round(f.y) - 1, 1, 3);
          ctx.fillStyle = "#fff59a";
          ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
        }
      }
    } else if (phase === "day" && !snowSeason) {
      var b = butterfly;
      b.t += dt;
      b.x = (view.W * 0.45) + Math.sin(b.t * 0.23) * view.W * 0.4;
      b.y = layout.groundY - 40 + Math.sin(b.t * 0.9) * 14 + Math.sin(b.t * 3.1) * 3;
      var flap = Math.floor(b.t * 8) % 2;
      var bx = Math.round(b.x), by = Math.round(b.y);
      ctx.fillStyle = "#ff9ac0";
      if (flap) {
        ctx.fillRect(bx - 2, by - 1, 2, 2);
        ctx.fillRect(bx + 1, by - 1, 2, 2);
      } else {
        ctx.fillRect(bx - 1, by - 2, 1, 2);
        ctx.fillRect(bx + 1, by - 2, 1, 2);
      }
      ctx.fillStyle = "#3a3347";
      ctx.fillRect(bx, by - 1, 1, 2);
    }
    if (snowSeason) {
      ctx.fillStyle = "#ffffff";
      for (var n = 0; n < flakes.length; n++) {
        var fl = flakes[n];
        fl.y += fl.v * dt;
        fl.x += Math.sin(clock + fl.p) * 4 * dt;
        if (fl.y > view.H) {
          fl.y = -2;
          fl.x = Math.random() * view.W;
        }
        ctx.fillRect(Math.round(fl.x), Math.round(fl.y), 1, 1);
      }
    }
  }

  function spawnLeaf() {
    if (leaf) return false;
    var max = koala.on === "branch" ? layout.trunkX - 30 : view.W - 14;
    leaf = { x: rand(16, max), y: -6, vy: 16, landed: false, t: 0, fade: 0 };
    return true;
  }

  var LEAF = ["...LL", "..LLl", ".LLl.", "LLl..", "l...."];
  function drawLeaf() {
    if (!leaf) return;
    if (leaf.fade > 0 && Math.floor(leaf.fade * 12) % 2 === 0) return;
    var flip = !leaf.landed && Math.floor(leaf.t * 3) % 2 === 0;
    var map = flip ? LEAF.map(function (r) { return r.split("").reverse().join(""); }) : LEAF;
    drawMap(map, Math.round(leaf.x) - 2, Math.round(leaf.y) - 4, { L: "#6dbb73", l: "#3f8048" });
  }

  function updateLeaf(dt) {
    if (!leaf) return;
    leaf.t += dt;
    if (leaf.fade > 0) {
      leaf.fade -= dt;
      if (leaf.fade <= 0) leaf = null;
      return;
    }
    if (!leaf.landed) {
      leaf.y += leaf.vy * dt;
      leaf.x += Math.sin(leaf.t * 2.4) * 10 * dt;
      if (leaf.y >= layout.groundY) {
        leaf.y = layout.groundY;
        leaf.landed = true;
        onLeafLanded();
      }
    }
  }

  function isFull() {
    return store.feedDate === today() && (store.feeds || 0) >= 6;
  }

  function onLeafLanded() {
    if (busy()) return;
    if (isFull()) {
      say(pick("Full"), 3);
      leaf.fade = 2.5;
      return;
    }
    goEat();
  }

  function goEat() {
    if (!leaf) return;
    var plan = routeTo("ground", leaf.x + (leaf.x > koala.x ? -5 : 5));
    plan.push({ type: "do", fn: function () {
      if (!leaf) {
        setState("idle", 1);
        return;
      }
      koala.facing = leaf.x >= koala.x ? 1 : -1;
      leaf = null;
      setState("eat", 3);
    } });
    startPlan(plan);
  }

  var clock = 0;
  var chatTimer = rand(35, 60);

  function update(dt) {
    var k = koala;
    k.t += dt;
    clock += dt;

    if (k.blinkT > 0) {
      k.blinkT -= dt;
      if (k.blinkT <= 0) {
        k.blink = true;
        setTimeout(function () { koala.blink = false; }, 130);
        k.blinkT = rand(2, 5);
      }
    }
    k.blush = Math.max(0, k.blush - dt * 0.4);

    switch (k.state) {
      case "walk":
        var speed = 20;
        var dir = k.targetX > k.x ? 1 : -1;
        k.facing = dir;
        k.x += dir * speed * dt;
        if ((dir > 0 && k.x >= k.targetX) || (dir < 0 && k.x <= k.targetX)) {
          k.x = k.targetX;
          nextStep();
        }
        break;
      case "climbUp":
        k.y -= 16 * dt;
        if (k.y <= layout.branchY) {
          k.y = layout.branchY;
          k.on = "branch";
          k.x = layout.trunkX - 8;
          k.facing = -1;
          if (chance(0.4)) say(pick("Tree"), 3);
          nextStep();
        }
        break;
      case "climbDown":
        k.y += 20 * dt;
        if (k.y >= layout.groundY) {
          k.y = layout.groundY;
          k.on = "ground";
          k.x = layout.trunkX - 10;
          nextStep();
        }
        break;
      case "fall":
        var before = k.y;
        k.vy += 420 * dt;
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        if (k.x < 12 || k.x > view.W - 12) {
          k.x = Math.max(12, Math.min(view.W - 12, k.x));
          k.vx = -k.vx * 0.45;
        }
        if (k.y < 40) {
          k.y = 40;
          k.vy = Math.abs(k.vy) * 0.3;
        }
        if (k.vx !== 0) k.facing = k.vx > 0 ? 1 : -1;
        if (k.vy > 0 && before <= layout.branchY && k.y >= layout.branchY && k.x > layout.branchX0 + 6 && k.x < layout.trunkX - 2) {
          land("branch", layout.branchY);
        } else if (k.y >= layout.groundY) {
          land("ground", layout.groundY);
        }
        break;
      case "held":
        break;
      case "sleep":
        k.zT = (k.zT || 0) - dt;
        if (k.zT <= 0) {
          k.zT = 1.3;
          spawnZ();
        }
        if (k.t > k.dur) chooseNext();
        break;
      case "eat":
        if (k.t > k.dur) {
          if (store.feedDate !== today()) {
            store.feedDate = today();
            store.feeds = 0;
          }
          store.feeds = (store.feeds || 0) + 1;
          saveStore();
          k.blush = 1;
          hearts(4);
          say(pick("Eat"), 3);
          setState("happy", 1.2);
        }
        break;
      default:
        if (k.dur > 0 && k.t > k.dur) {
          if (leaf && leaf.landed && !leaf.fade && !isFull()) goEat();
          else chooseNext();
        }
    }

    chatTimer -= dt;
    if (chatTimer <= 0) {
      chatTimer = rand(40, 80);
      if (k.state !== "sleep" && k.state !== "held" && k.state !== "fall" && k.state !== "eat" && !speech.text) {
        if (k.state === "idle" || k.state === "sit") setState("wave", 2.5);
        say(randomMessage(), 5);
      }
    }

    updateLeaf(dt);
    updateParticles(dt);
    updateSpeech(dt);

    var bgPhase = currentPhase();
    if (bgPhase !== phase) bgKey = "";
  }

  function land(on, y) {
    var k = koala;
    var drop = y - k.fallFrom;
    k.on = on;
    k.y = y;
    k.vx = 0;
    k.vy = 0;
    setState("idle", rand(0.8, 1.6));
    if (drop > 50 && chance(0.5) && !speech.text) say(pick("Landed"), 2.5);
  }

  function lookFor(k) {
    switch (k.state) {
      case "walk": return { look: "walk", frame: Math.floor(k.t * 8) % 4 };
      case "climbUp":
      case "climbDown": return { look: "climb", frame: Math.floor(k.t * 5) % 2 };
      case "sit": return { look: "sit", frame: 0 };
      case "sleep": return { look: "sleep", frame: Math.floor(k.t * 0.8) % 2 };
      case "wave": return { look: "wave", frame: Math.floor(k.t * 4) % 2 };
      case "happy": return { look: "happy", frame: Math.floor(k.t * 10) % 4 };
      case "fall": return { look: "fall", frame: Math.floor(k.t * 12) % 2 };
      case "held": return { look: "held", frame: Math.floor(k.t * 6) % 2 };
      case "eat": return { look: "eat", frame: Math.floor(k.t * 4) % 2 };
      case "hug": return { look: "hug", frame: Math.floor(k.t * 3) % 2 };
      default: return { look: k.hold ? "heart" : "stand", frame: 0 };
    }
  }

  function render(dt) {
    buildBackground();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, 0, 0);
    drawAmbient(dt);

    var k = koala;
    var lf = lookFor(k);
    var airborne = k.state === "fall" || k.state === "held";
    if (k.on === "ground" || airborne) {
      var sw = airborne ? 10 : 18;
      ctx.fillStyle = "rgba(20,10,40,0.18)";
      ctx.fillRect(Math.round(k.x - sw / 2), layout.groundY - 1, sw, 2);
    }
    drawLeaf();
    var img = sprite(lf.look, lf.frame, k.blink, k.blush > 0.4, k.facing < 0 && lf.look !== "climb");
    ctx.drawImage(img, Math.round(k.x - 16), Math.round(k.y - S.H));
    drawParticles();
    drawForegroundAmbient(dt);
    placeBubble();
  }

  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (dt > 0) update(dt);
    render(dt);
    requestAnimationFrame(frame);
  }

  function toWorld(e) {
    return { x: e.clientX / view.k, y: e.clientY / view.k };
  }

  function hitsKoala(p) {
    var k = koala;
    return p.x > k.x - 13 && p.x < k.x + 13 && p.y > k.y - S.H + 2 && p.y < k.y + 2;
  }

  function hitsTree(p) {
    var tx = layout.trunkX, by = layout.branchY;
    if (p.x > tx - 6 && p.x < tx + 6 && p.y > by - 40 && p.y < layout.groundY + 2) return true;
    if (p.x > layout.branchX0 - 4 && p.x < tx && p.y > by - 6 && p.y < by + 6) return true;
    var dx = (p.x - tx) / 22, dy = (p.y - (by - 42)) / 16;
    return dx * dx + dy * dy < 1;
  }

  var touch = null;
  var tapStreak = 0;
  var lastTap = 0;

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    var p = toWorld(e);
    touch = { id: e.pointerId, start: p, cssX: e.clientX, cssY: e.clientY, onKoala: hitsKoala(p), dragging: false, last: p, lastT: performance.now(), vx: 0, vy: 0 };
    if (touch.onKoala) {
      touch.off = { x: koala.x - p.x, y: koala.y - p.y };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!touch || touch.id !== e.pointerId || !touch.onKoala) return;
    e.preventDefault();
    var p = toWorld(e);
    var now = performance.now();
    if (!touch.dragging && Math.abs(e.clientX - touch.cssX) + Math.abs(e.clientY - touch.cssY) > 8) {
      touch.dragging = true;
      koala.plan = [];
      koala.on = null;
      setState("held", 0);
      if (chance(0.6)) say(pick("Picked"), 2.5);
    }
    if (touch.dragging) {
      var dtm = Math.max(1, now - touch.lastT) / 1000;
      var ivx = (p.x - touch.last.x) / dtm, ivy = (p.y - touch.last.y) / dtm;
      touch.vx += (ivx - touch.vx) * 0.5;
      touch.vy += (ivy - touch.vy) * 0.5;
      touch.last = p;
      touch.lastT = now;
      koala.x = Math.max(12, Math.min(view.W - 12, p.x + touch.off.x));
      koala.y = Math.max(40, Math.min(layout.groundY, p.y + touch.off.y));
      if (Math.abs(touch.vx) > 4) koala.facing = touch.vx > 0 ? 1 : -1;
    }
  });

  function endTouch(e) {
    if (!touch || touch.id !== e.pointerId) return;
    var t = touch;
    touch = null;
    var p = toWorld(e);
    if (t.dragging) {
      if (performance.now() - t.lastT > 120) {
        t.vx = 0;
        t.vy = 0;
      }
      koala.vx = Math.max(-260, Math.min(260, t.vx));
      koala.vy = Math.max(-320, Math.min(260, t.vy));
      koala.fallFrom = koala.y;
      setState("fall", 0);
      return;
    }
    if (e.type === "pointercancel") return;
    if (t.onKoala) {
      petKoala();
    } else if (hitsTree(p)) {
      if (busy()) return;
      if (koala.on === "branch") say(pick("Tree"), 3);
      else startPlan(routeTo("branch", rand(layout.branchX0 + 10, layout.trunkX - 8)));
    } else if (p.y > layout.groundY - 12) {
      if (busy() || koala.state === "sleep") return;
      startPlan(routeTo("ground", p.x));
    } else {
      for (var i = 0; i < 3; i++) particles.push({ kind: "mini", x: p.x + rand(-3, 3), y: p.y, vx: rand(-10, 10), vy: rand(-22, -10), life: 1.2, max: 1.2, hue: Math.floor(Math.random() * 3) });
    }
  }

  canvas.addEventListener("pointerup", endTouch);
  canvas.addEventListener("pointercancel", endTouch);

  function petKoala() {
    var k = koala;
    if (k.state === "fall" || k.state === "held" || k.state === "climbUp" || k.state === "climbDown") return;
    if (k.state === "sleep") {
      setState("wave", 2);
      if (!speech.text) say(pick("Waking"), 3);
      return;
    }
    var now = performance.now();
    tapStreak = now - lastTap < 1200 ? tapStreak + 1 : 1;
    lastTap = now;
    k.plan = [];
    k.blush = 1;
    if (tapStreak >= 6) {
      tapStreak = 0;
      setState("happy", 2);
      hearts(12);
      say(pick("Tickle"), 3.5);
      return;
    }
    setState("happy", 1.4);
    hearts(5);
    say(pick("Clicked"), 2.5);
  }

  function busy() {
    var s = koala.state;
    return s === "held" || s === "fall" || s === "climbUp" || s === "climbDown";
  }

  function onFeed() {
    if (busy()) return;
    if (koala.state === "sleep") setState("wave", 1.5);
    if (spawnLeaf() && isFull()) say("Hvala... ali mislim da sam pun.", 3);
  }

  function onMessage() {
    if (busy()) return;
    koala.plan = [];
    setState("wave", 2.5);
    say(chance(0.5) ? pick("Love") : pick("Doruk"), 5);
  }

  function onHug() {
    if (busy()) return;
    koala.plan = [];
    koala.blush = 1;
    setState("hug", 3.2);
    heartRain();
    hearts(6);
    say(pick("Hug"), 4);
  }

  function onSleep() {
    if (busy()) return;
    if (koala.state === "sleep") {
      setState("wave", 2);
      if (!speech.text) say(pick("Waking"), 3);
    } else {
      koala.plan = [];
      setState("sleep", 240);
      say("Laku noć... probudi me kad ti zatrebam.", 3);
    }
  }

  function updateSleepButton() {
    var sleeping = koala && koala.state === "sleep";
    var label = sleeping ? "Probudi" : "Spavaj";
    if (sleepBtn.dataset.state === label) return;
    sleepBtn.dataset.state = label;
    sleepBtn.querySelector("img").src = sleeping ? icons.sun : icons.moon;
    sleepBtn.querySelector("span").textContent = label;
  }

  var icons = {};

  function bindButton(id, fn) {
    var el = document.getElementById(id);
    el.addEventListener("click", function (e) {
      e.preventDefault();
      fn();
    });
  }

  function greeting() {
    var h = new Date().getHours();
    if (!store.seen) {
      store.seen = true;
      saveStore();
      return "Ćao Una! Ja sam tvoja koala. Doruk me je poslao da te čuvam.";
    }
    if (h >= 5 && h < 12) return "Dobro jutro, Zečiću!";
    if (h >= 12 && h < 18) return "Ćao opet! Nedostajala si mi.";
    if (h >= 18 && h < 23) return "Dobro veče, lepotice!";
    return pick("Night");
  }

  function setupInstallHint() {
    var hint = document.getElementById("hint");
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    var dismissed = false;
    try { dismissed = localStorage.getItem("koala.hint") === "1"; } catch (e) {}
    if (!ios || standalone || dismissed) return;
    hint.hidden = false;
    document.getElementById("hint-close").addEventListener("click", function () {
      hint.hidden = true;
      try { localStorage.setItem("koala.hint", "1"); } catch (e) {}
    });
  }

  var hiddenAt = 0;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    last = 0;
    if (hiddenAt && Date.now() - hiddenAt > 10 * 60 * 1000 && koala.state !== "held") {
      bgKey = "";
      if (koala.state === "sleep") setState("wave", 2);
      say(greeting(), 4);
    }
  });

  function start() {
    icons.leaf = iconUrl("leaf");
    icons.mail = iconUrl("mail");
    icons.heart = iconUrl("heart");
    icons.moon = iconUrl("moon");
    icons.sun = iconUrl("sun");
    document.querySelector("#btn-feed img").src = icons.leaf;
    document.querySelector("#btn-msg img").src = icons.mail;
    document.querySelector("#btn-hug img").src = icons.heart;
    bindButton("btn-feed", onFeed);
    bindButton("btn-msg", onMessage);
    bindButton("btn-hug", onHug);
    bindButton("btn-sleep", onSleep);

    resize();
    koala = newKoala();
    koala.y = 50;
    koala.fallFrom = koala.y;
    initAmbient();
    updateSleepButton();
    window.addEventListener("resize", function () {
      resize();
      initAmbient();
    });

    sayLater(greeting(), 4, 0.9);
    var m = new Date().getMonth();
    if ((m === 11 || m === 0 || m === 1) && store.snowDate !== today()) {
      store.snowDate = today();
      saveStore();
      sayLater(pick("Snow"), 4, 7);
    }
    setupInstallHint();
    if (/[?&]debug/.test(location.search)) {
      window.__koala = {
        step: function (seconds) {
          for (var t = 0; t < seconds; t += 1 / 30) {
            update(1 / 30);
            render(1 / 30);
          }
        },
        feed: onFeed, msg: onMessage, hug: onHug, sleep: onSleep, pet: petKoala,
        state: function () { return koala; },
        go: function (target, x) { startPlan(routeTo(target, x)); },
        phase: function (p) { currentPhase = function () { return p; }; bgKey = ""; }
      };
      requestAnimationFrame(function paint() {
        render(0);
        requestAnimationFrame(paint);
      });
      return;
    }
    requestAnimationFrame(frame);
  }

  if (document.fonts && document.fonts.load) {
    document.fonts.load("16px Pixel").then(start, start);
  } else {
    start();
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
