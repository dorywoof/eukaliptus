(function () {
  "use strict";

  var S = window.KoalaSprite;
  var M = window.KoalaMessages;
  var Sfx = window.Sfx;

  var BIRTHDAY = null;

  var PHOTOS = [
    { src: "photos/ljuljaska.png", cap: "Naša ljuljaška. Koala i Zečić, zauvek." },
    { src: "photos/kacketi.png", cap: "Isti kačketi. Slučajno? Ne verujem." },
    { src: "photos/stolica.png", cap: "Ovo... ni mi ne znamo šta je. Ali bilo je zabavno!" }
  ];

  var canvas = document.getElementById("world");
  var ctx = canvas.getContext("2d");
  var bubble = document.getElementById("bubble");
  var bubbleText = document.getElementById("bubble-text");
  var bubbleFrom = document.getElementById("bubble-from");
  var bar = document.getElementById("bar");
  var hud = document.getElementById("hud");
  var gamehud = document.getElementById("gamehud");
  var cover = document.getElementById("cover");
  var toastEl = document.getElementById("toast");
  var panel = document.getElementById("panel");
  var panelTitle = document.getElementById("panel-title");
  var panelBody = document.getElementById("panel-body");
  var banner = document.getElementById("banner");

  var view = { dpr: 1, scale: 4, W: 120, H: 260, k: 2 };
  var layout = { groundY: 200, branchY: 110, trunkX: 100, branchX0: 64, safeTop: 0, bushes: [] };
  var bg = document.createElement("canvas");
  var bushImg = document.createElement("canvas");
  var bgKey = "";
  var phase = "day";
  var snowSeason = false;
  var mode = "play";
  var clock = 0;

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

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  var store = (function () {
    var s = {};
    try {
      s = JSON.parse(localStorage.getItem("koala.v1") || "{}") || {};
    } catch (e) {}
    var d = { hunger: 70, love: 70, statT: Date.now(), xp: 0, level: 1, owned: ["kacket", "rogovi"], outfit: { hat: "kacket", ear: "rogovi", face: null }, read: [], best: 0, sound: true };
    for (var k in d) if (s[k] === undefined) s[k] = d[k];
    return s;
  })();

  function save() {
    try {
      localStorage.setItem("koala.v1", JSON.stringify(store));
    } catch (e) {}
  }

  (function decayWhileAway() {
    var hours = Math.max(0, (Date.now() - store.statT) / 3600000);
    store.hunger = clamp(store.hunger - hours * 3, 0, 100);
    store.love = clamp(store.love - hours * 2.5, 0, 100);
    store.statT = Date.now();
  })();

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
    if (store.hunger < 30 && chance(0.5)) return pick("Hungry");
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

  function specialDay() {
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    var list = [
      { m: 12, d: 2, banner: "Doruk je danas u Beogradu!", greet: "Danas se vidite! Ovo je najlepši dan!", effect: "hearts", item: "kacket" },
      { m: 12, d: 31, banner: "Srećna Nova godina!", greet: "Srećna Nova godina, Zečiću!", effect: "confetti", item: "sesir" },
      { m: 1, d: 1, banner: "Srećna Nova godina!", greet: "Srećna Nova godina, Zečiću! Ova godina je naša.", effect: "confetti", item: "sesir" },
      { m: 1, d: 7, banner: "Srećan Božić!", greet: "Hristos se rodi! Srećan Božić, Zečiću!", effect: "snow", item: "kapa" },
      { m: 2, d: 14, banner: "Srećan Dan zaljubljenih!", greet: "Srećan Dan zaljubljenih! Volim te najviše.", effect: "hearts" },
      { m: 3, d: 8, banner: "Srećan 8. mart!", greet: "Srećan 8. mart, najlepša devojko!", effect: "hearts", item: "cvet" }
    ];
    if (BIRTHDAY) list.push({ m: BIRTHDAY.m, d: BIRTHDAY.d, banner: "Srećan rođendan, Una!", greet: "Srećan rođendan, Zečiću! Volim te!", effect: "confetti", item: "sesir" });
    for (var i = 0; i < list.length; i++) if (list[i].m === m && list[i].d === day) return list[i];
    return null;
  }
  var special = specialDay();

  var PHASES = {
    night: { sky: ["#0d1230", "#1c2350", "#2e3473"], far: "#232a5c", near: "#1d3a4a", grass: "#2f6b4a", grassDark: "#245a3d", grassLight: "#3f8458", bark: "#9d968c", barkDark: "#6e675f", leaf: "#3f6e5d", leafDark: "#2d5446", leafLight: "#5a8a78", bush: "#2a6044", bushDark: "#1f4d36", bushLight: "#3b7a58" },
    dawn: { sky: ["#6f6db3", "#ef9fae", "#ffd6a6"], far: "#9a7fb4", near: "#5f9a6c", grass: "#78b85a", grassDark: "#5f9c48", grassLight: "#9ad16f", bark: "#e2d6c4", barkDark: "#a8977f", leaf: "#6aa486", leafDark: "#4c8569", leafLight: "#98c8a8", bush: "#4f9a52", bushDark: "#3c7e42", bushLight: "#74bb66" },
    day: { sky: ["#58afe8", "#8ccff4", "#c9edfb"], far: "#8cc0d8", near: "#69b072", grass: "#7cc35c", grassDark: "#62a64a", grassLight: "#a2db74", bark: "#e8ddcc", barkDark: "#ad9c84", leaf: "#6faa8b", leafDark: "#4e8a6d", leafLight: "#a0cfb1", bush: "#4fa552", bushDark: "#3a8540", bushLight: "#7cc96a" },
    dusk: { sky: ["#3a3878", "#b5679a", "#f7a37c"], far: "#7a5a8e", near: "#4f7f5f", grass: "#5f9c52", grassDark: "#4c8444", grassLight: "#7fb866", bark: "#cfbfae", barkDark: "#8f7d6c", leaf: "#5a8e78", leafDark: "#41705c", leafLight: "#86b39b", bush: "#3f8048", bushDark: "#2f6838", bushLight: "#62a35e" }
  };

  var phaseOverride = null;
  function currentPhase() {
    if (phaseOverride) return phaseOverride;
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
    layout.safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat")) || 0;
    layout.groundY = Math.round(view.H - barH / view.k - 7);
    layout.trunkX = view.W - 20;
    layout.branchX0 = layout.trunkX - 40;
    layout.branchY = Math.round(Math.max(layout.safeTop / view.k + 100, layout.groundY * 0.52));
    layout.bushes = [Math.round(view.W * 0.12), Math.round(view.W * 0.42), layout.trunkX - 26];
    bgKey = "";
    if (koala) clampKoala();
  }

  function buildBackground() {
    phase = currentPhase();
    var m = new Date().getMonth();
    snowSeason = m === 11 || m === 0 || m === 1 || (special && special.effect === "snow");
    var key = phase + "|" + view.W + "|" + view.H + "|" + layout.groundY + "|" + snowSeason;
    if (key === bgKey) return;
    bgKey = key;
    var P = PHASES[phase];
    var W = view.W, H = view.H, gy = layout.groundY;
    bg.width = W;
    bg.height = H;
    var g = bg.getContext("2d");
    var rnd = seeded(20251202);
    var top = Math.round(layout.safeTop / view.k);

    var band = 5;
    for (var y = 0; y < gy; y += band) {
      var t = Math.min(1, y / (gy - 20));
      g.fillStyle = t < 0.5 ? mix(P.sky[0], P.sky[1], t * 2) : mix(P.sky[1], P.sky[2], (t - 0.5) * 2);
      g.fillRect(0, y, W, band);
      var t2 = Math.min(1, (y + band) / (gy - 20));
      g.fillStyle = t2 < 0.5 ? mix(P.sky[0], P.sky[1], t2 * 2) : mix(P.sky[1], P.sky[2], (t2 - 0.5) * 2);
      for (var x = (y / band) % 2; x < W; x += 2) g.fillRect(x, y + band - 1, 1, 1);
    }

    if (phase === "night") {
      drawDisc(g, 24, top + 34, 7, "#fff3c4", "#e8d9a0");
      g.fillStyle = "#e8d9a0";
      g.fillRect(21, top + 32, 2, 2);
      g.fillRect(26, top + 37, 2, 1);
    } else if (phase === "day") {
      drawDisc(g, 24, top + 36, 8, "#ffe27a", "#ffd04a");
    } else {
      drawDisc(g, 30, gy - 34, 9, phase === "dawn" ? "#ffe0a0" : "#ffb070", phase === "dawn" ? "#ffcf80" : "#ff9a5a");
    }

    for (var hx = 0; hx < W; hx++) {
      var ht = Math.round(gy - 30 + Math.sin(hx * 0.05) * 6 + Math.sin(hx * 0.13 + 1) * 3);
      g.fillStyle = P.far;
      g.fillRect(hx, ht, 1, gy - ht);
      if (snowSeason) {
        g.fillStyle = "#eef3ff";
        g.fillRect(hx, ht, 1, 1);
      }
    }
    for (var nx = 0; nx < W; nx++) {
      var nt = Math.round(gy - 14 + Math.sin(nx * 0.08 + 2) * 4 + Math.sin(nx * 0.21) * 1.5);
      g.fillStyle = P.near;
      g.fillRect(nx, nt, 1, gy - nt);
      if (snowSeason) {
        g.fillStyle = "#f4f7ff";
        g.fillRect(nx, nt, 1, 2);
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
    buildBush(P);
  }

  function buildBush(P) {
    bushImg.width = 26;
    bushImg.height = 15;
    var g = bushImg.getContext("2d");
    var rnd = seeded(5);
    var parts = [[8, 9, 7, 6], [17, 9, 8, 6], [13, 6, 7, 5.5]];
    for (var p = 0; p < parts.length; p++) {
      var cx = parts[p][0], cy = parts[p][1], rx = parts[p][2], ry = parts[p][3];
      for (var y = 0; y < 15; y++) {
        for (var x = 0; x < 26; x++) {
          var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy > 1) continue;
          var c = dx + dy < -0.6 ? P.bushLight : dx + dy > 0.7 ? P.bushDark : P.bush;
          if (rnd() < 0.1) c = rnd() < 0.5 ? P.bushLight : P.bushDark;
          g.fillStyle = c;
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    if (snowSeason) {
      g.fillStyle = "#f4f7ff";
      g.fillRect(9, 1, 8, 1);
      g.fillRect(3, 4, 5, 1);
      g.fillRect(18, 4, 5, 1);
    } else {
      g.fillStyle = phase === "night" ? "#b8a6d8" : "#ff8fb8";
      g.fillRect(6, 6, 1, 1);
      g.fillRect(19, 8, 1, 1);
      g.fillRect(13, 3, 1, 1);
    }
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
        if (dx * dx + dy * dy > 1 + (rnd() - 0.5) * 0.25) continue;
        var c = dx + dy < -0.7 ? P.leafLight : dx + dy > 0.6 ? P.leafDark : P.leaf;
        if (rnd() < 0.12) c = rnd() < 0.5 ? P.leafLight : P.leafDark;
        g.fillStyle = c;
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
      var lx = bx0 + 18 + Math.floor(rnd() * (tx - bx0 - 22));
      g.fillStyle = l % 2 ? P.leaf : P.leafDark;
      g.fillRect(lx, by + 4, 1, 2);
      g.fillRect(lx + 1, by + 6, 1, 1);
    }
  }

  var spriteCache = {};
  function outfitKey(o) {
    return (o.hat || "") + "," + (o.ear || "") + "," + (o.face || "");
  }

  function koalaSprite(look, frame, blink, blush, flip, outfit) {
    var key = look + frame + (blink ? 1 : 0) + (blush ? 1 : 0) + (flip ? 1 : 0) + outfitKey(outfit);
    var c = spriteCache[key];
    if (!c) {
      c = S.toCanvas(S.build(look, frame, blink, blush, outfit), flip);
      spriteCache[key] = c;
    }
    return c;
  }

  function bunnySprite(look, frame, blink, flip) {
    var key = "b" + look + frame + (blink ? 1 : 0) + (flip ? 1 : 0);
    var c = spriteCache[key];
    if (!c) {
      c = S.toCanvas(S.buildBunny(look, frame, blink), flip);
      spriteCache[key] = c;
    }
    return c;
  }

  var ICON_COLORS = { o: "#3a3347", W: "#ffffff", R: "#ff6f9a", Q: "#ffc2d4", L: "#6dbb73", l: "#3f8048", Y: "#ffd65c", y: "#e8a93a", C: "#8a6446", K: "#5b3f2a", U: "#5aa0ff" };
  var ICONS = {
    leaf: ["......LL", "....LLLl", "...LLLl.", "..LLLl..", ".LLLl...", ".Ll.....", "l......."],
    mail: ["oooooooooo", "ooWWWWWWoo", "oWoWWWWoWo", "oWWoWWoWWo", "oWWWooWWWo", "oWWWWWWWWo", "oooooooooo"],
    heart: [".RR.RR.", "RQRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."],
    star: ["...Y...", "..YYY..", "YYYYYYY", ".YYYYY.", ".YY.YY.", "Y.....Y"],
    dots: ["oo.oo.oo", "oo.oo.oo"],
    moon: ["..yyy..", ".yYYy..", "yYYy...", "yYYy...", "yYYy...", ".yYYy..", "..yyy.."],
    sun: ["...Y...", ".Y...Y.", "..YYY..", "YYYYYYY", "..YYY..", ".Y...Y.", "...Y..."],
    shirt: ["CC...CC", "CCCCCCC", ".CCCCC.", ".CCCCC.", ".CCCCC."],
    photo: ["ooooooooo", "oUUUUUUUo", "oUUUYUUUo", "oULUUUULo", "oLLLULLLo", "ooooooooo"],
    note: ["ooooooo", "oWWWWWo", "oWoooWo", "oWWWWWo", "oWoooWo", "oWWWWWo", "ooooooo"],
    sound: ["...o...", "..oo.o.", "oooo..o", "oooo..o", "oooo..o", "..oo.o.", "...o..."],
    mute: ["...o...", "..oo...", "oooo.R.R", "oooo..R.", "oooo.R.R", "..oo...", "...o..."]
  };

  function iconUrl(name) {
    var rows = ICONS[name];
    var w = 0;
    for (var r = 0; r < rows.length; r++) w = Math.max(w, rows[r].length);
    var c = document.createElement("canvas");
    c.width = w;
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
  var gift = null;
  var bunny = null;
  var bunnyTimer = rand(70, 140);
  var clouds = [];
  var stars = [];
  var flies = [];
  var flakes = [];
  var butterfly = { x: 20, y: 80, t: 0 };
  var inbox = [];
  var photoImgs = [];
  var photoThumbs = [];

  function unread() {
    return inbox.filter(function (m) { return store.read.indexOf(m.id) < 0; });
  }

  function newKoala() {
    return { x: Math.round(view.W * 0.4), y: layout.groundY, vx: 0, vy: 0, facing: 1, on: "ground", state: "fall", t: 0, dur: 0, plan: [], blink: false, blinkT: 3, blush: 0, hold: false, fallFrom: 0 };
  }

  function clampKoala() {
    if (koala.on === "branch") {
      koala.y = layout.branchY;
      koala.x = clamp(koala.x, layout.branchX0 + 10, layout.trunkX - 8);
    } else if (koala.on === "ground") {
      koala.y = layout.groundY;
      koala.x = clamp(koala.x, 14, view.W - 14);
    }
  }

  function busy() {
    var s = koala.state;
    return mode !== "play" || s === "held" || s === "fall" || s === "climbUp" || s === "climbDown";
  }

  function setState(state, dur) {
    if (koala.state === "sleep" && state !== "sleep" && state !== "fall" && state !== "held" && chance(0.35) && !speech.text) {
      say(pick("Waking"), 3);
    }
    koala.state = state;
    koala.t = 0;
    koala.dur = dur || 0;
    koala.hold = false;
  }

  function routeTo(target, x) {
    var plan = [];
    var branchMin = layout.branchX0 + 10, branchMax = layout.trunkX - 8;
    if (target === "branch") {
      x = clamp(x, branchMin, branchMax);
      if (koala.on === "ground") {
        plan.push({ type: "walk", x: layout.trunkX });
        plan.push({ type: "climbUp" });
      }
      plan.push({ type: "walk", x: x });
    } else {
      x = clamp(x, 14, view.W - 14);
      if (koala.on === "branch") {
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
    if (bunny && bunny.state === "stay") {
      if (r < 0.4) setState("sit", rand(4, 7));
      else if (r < 0.7) { setState("idle", rand(3, 5)); koala.hold = true; }
      else setState("wave", 2);
      koala.facing = bunny.x > koala.x ? 1 : -1;
      return;
    }
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

  function say(text, seconds, from) {
    speech.text = text;
    speech.shown = 0;
    speech.left = seconds + text.length / 30;
    bubbleText.textContent = "";
    bubbleFrom.textContent = from || "";
    bubbleFrom.hidden = !from;
    bubble.classList.toggle("letter", !!from);
    bubble.classList.remove("show");
    void bubble.offsetWidth;
    bubble.classList.add("show");
  }

  function sayLater(text, seconds, delay) {
    speech.queue.push({ text: text, seconds: seconds, at: clock + delay });
  }

  function updateSpeech(dt) {
    if (speech.queue.length && (!speech.text || speech.left < 0.5) && clock >= speech.queue[0].at && mode === "play") {
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
    var ax, headY;
    if (koala.state === "hidden") {
      ax = koala.x;
      headY = layout.groundY - 16;
    } else {
      ax = koala.x;
      headY = koala.y - (koala.state === "sit" || koala.state === "sleep" ? 33 : 36);
      if (koala.outfit && (koala.outfit.ear === "usi" || koala.outfit.ear === "rogovi" || koala.outfit.hat === "sesir")) headY -= 5;
    }
    var w = bubble.offsetWidth;
    var h = bubble.offsetHeight;
    var left = clamp(ax * k - w / 2, 10, window.innerWidth - w - 10);
    var minTop = layout.safeTop + (banner.hidden ? 48 : 84);
    var top = Math.max(minTop, headY * k - h - 12);
    bubble.style.transform = "translate(" + Math.round(left) + "px," + Math.round(top) + "px)";
    bubble.style.setProperty("--tail", Math.round(clamp(ax * k - left, 18, w - 18)) + "px");
  }

  var toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove("show");
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1500);
  }

  function spawnHeart(x, y, vx, vy, big, gold) {
    var life = rand(1.2, 2);
    particles.push({ kind: big ? "heart" : "mini", x: x, y: y, vx: vx, vy: vy, life: life, max: life, hue: gold ? 3 : Math.floor(Math.random() * 3) });
  }

  function hearts(n, x, y) {
    if (x === undefined) {
      x = koala.x;
      y = koala.y - 30;
    }
    for (var i = 0; i < n; i++) spawnHeart(x + rand(-8, 8), y + rand(-4, 4), rand(-14, 14), rand(-30, -14), chance(0.5));
  }

  function heartRain() {
    for (var i = 0; i < 26; i++) {
      var life = rand(2, 3.4);
      particles.push({ kind: chance(0.6) ? "heart" : "mini", x: rand(4, view.W - 4), y: layout.groundY + rand(0, 20), vx: rand(-6, 6), vy: rand(-46, -24), life: life, max: life, hue: Math.floor(Math.random() * 3) });
    }
  }

  function confetti(n) {
    var colors = ["#ff6f9a", "#ffd34d", "#5aa0ff", "#7cd36a", "#c9a2ff", "#ffffff"];
    for (var i = 0; i < n; i++) {
      var life = rand(3, 5);
      particles.push({ kind: "conf", x: rand(0, view.W), y: rand(-20, -2), vx: rand(-4, 4), vy: rand(14, 24), life: life, max: life, color: colors[Math.floor(Math.random() * colors.length)], seed: Math.random() * 6 });
    }
  }

  function popText(text, x, y, color) {
    particles.push({ kind: "text", text: text, x: x, y: y, vx: 0, vy: -16, life: 0.9, max: 0.9, color: color });
  }

  function spawnZ() {
    particles.push({ kind: "z", x: koala.x + 6 * (koala.facing || 1), y: koala.y - 34, vx: 0, vy: -7, life: 2.4, max: 2.4, seed: Math.random() * 6 });
  }

  var HEART = [".RR.RR.", "RQRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."];
  var MINI = [".R.R.", "RRRRR", "RRRRR", ".RRR.", "..R.."];
  var HEART_HUES = [["#ff6f9a", "#ffc2d4"], ["#ff8fb8", "#ffe0ea"], ["#e8507e", "#ff9fbd"], ["#ffc93c", "#fff2b0"]];
  var ZGLYPH = ["oooo", "..o.", ".o..", "oooo"];
  var SUCUK = [".SSSS.", "SsSSsS", "SSSsSS", "SsSSsS", ".SSSS."];
  var PORK = [".P...P.", "PPPPPPP", "PePPPeP", "PPnnnPP", "PPNnNPP", ".PPPPP."];
  var GIFT = ["..R.R....", "...R.....", "TTTTRTTTT", "TTTTRTTTT", "ttttRtttt", ".TTTRTTT.", ".TTTRTTT.", ".TTTRTTT.", ".tttRttt."];
  var DIGITS = {
    "0": ["ooo", "o.o", "o.o", "o.o", "ooo"], "1": [".o.", "oo.", ".o.", ".o.", "ooo"], "2": ["ooo", "..o", "ooo", "o..", "ooo"],
    "3": ["ooo", "..o", ".oo", "..o", "ooo"], "4": ["o.o", "o.o", "ooo", "..o", "..o"], "5": ["ooo", "o..", "ooo", "..o", "ooo"],
    "6": ["ooo", "o..", "ooo", "o.o", "ooo"], "7": ["ooo", "..o", ".o.", ".o.", ".o."], "8": ["ooo", "o.o", "ooo", "o.o", "ooo"],
    "9": ["ooo", "o.o", "ooo", "..o", "ooo"], "+": ["...", ".o.", "ooo", ".o.", "..."], "-": ["...", "...", "ooo", "...", "..."]
  };

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

  function drawDigits(text, x, y, color) {
    var w = text.length * 4 - 1;
    var sx = Math.round(x - w / 2);
    for (var i = 0; i < text.length; i++) {
      var m = DIGITS[text[i]];
      if (!m) continue;
      drawMap(m, sx + i * 4 + 1, Math.round(y) + 1, { o: "#3a3347" });
      drawMap(m, sx + i * 4, Math.round(y), { o: color });
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
      if (p.kind === "z" || p.kind === "conf") p.x += Math.sin(clock * 2 + p.seed) * 6 * dt;
      else p.vx *= 1 - dt * 0.8;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.kind !== "conf" && p.life < 0.45 && Math.floor(p.life * 16) % 2 === 0) continue;
      var x = Math.round(p.x), y = Math.round(p.y);
      if (p.kind === "z") {
        drawMap(ZGLYPH, x, y, { o: phase === "night" ? "#c9d4ff" : "#5a6bb0" });
      } else if (p.kind === "conf") {
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, 1, Math.floor(clock * 6 + p.seed) % 2 ? 2 : 1);
      } else if (p.kind === "text") {
        drawDigits(p.text, x, y, p.color);
      } else {
        var hue = HEART_HUES[p.hue];
        drawMap(p.kind === "heart" ? HEART : MINI, x - 3, y - 3, { R: hue[0], Q: hue[1] });
      }
    }
  }

  function initAmbient() {
    var rnd = seeded(77);
    clouds = [];
    for (var i = 0; i < 4; i++) clouds.push({ x: rnd() * view.W, y: 40 + rnd() * (layout.branchY * 0.45), v: 1.5 + rnd() * 2.5, w: 14 + Math.floor(rnd() * 10) });
    stars = [];
    for (var s = 0; s < 40; s++) stars.push({ x: Math.floor(rnd() * view.W), y: Math.floor(rnd() * (layout.groundY - 40)), p: rnd() * 6, big: rnd() < 0.15 });
    flies = [];
    for (var f = 0; f < 6; f++) flies.push({ x: rnd() * view.W, y: layout.groundY - 10 - rnd() * 60, p: rnd() * 6 });
    flakes = [];
    for (var n = 0; n < 50; n++) flakes.push({ x: rnd() * view.W, y: rnd() * view.H, v: 8 + rnd() * 10, p: rnd() * 6 });
  }

  function drawCloud(c) {
    var x = Math.round(c.x), y = Math.round(c.y), w = c.w;
    ctx.fillStyle = phase === "dusk" ? "#f6c6c8" : phase === "dawn" ? "#fff0ec" : "#ffffff";
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x + 2, y - 2, w - 6, 2);
    ctx.fillRect(x + Math.floor(w / 3), y - 4, Math.floor(w / 3), 2);
    ctx.fillStyle = phase === "dusk" ? "#d89aaf" : phase === "dawn" ? "#f3cfd3" : "#dbeaf6";
    ctx.fillRect(x + 1, y + 3, w - 2, 1);
  }

  function drawSky(dt) {
    if (phase === "night") {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        if (Math.sin(clock * 1.7 + s.p * 3) <= -0.6) continue;
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
        if (cl.x > view.W + 4) cl.x = -cl.w - 4;
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
      b.x = view.W * 0.45 + Math.sin(b.t * 0.23) * view.W * 0.4;
      b.y = layout.groundY - 44 + Math.sin(b.t * 0.9) * 14 + Math.sin(b.t * 3.1) * 3;
      var bx = Math.round(b.x), by = Math.round(b.y);
      ctx.fillStyle = "#ff9ac0";
      if (Math.floor(b.t * 8) % 2) {
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

  function frameRect() {
    return { x: layout.branchX0 + 5, y: layout.branchY + 8, w: 16, h: 13 };
  }

  function photoIndexToday() {
    var d = new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000) % PHOTOS.length;
  }

  function drawPhotoFrame() {
    var f = frameRect();
    var sway = Math.round(Math.sin(clock * 1.3) * 0.6);
    ctx.fillStyle = "#6e5a48";
    ctx.fillRect(f.x + 3, layout.branchY + 4, 1, f.y - layout.branchY - 4);
    ctx.fillRect(f.x + f.w - 4, layout.branchY + 4, 1, f.y - layout.branchY - 4);
    var x = f.x + sway;
    ctx.fillStyle = "#3a3347";
    ctx.fillRect(x - 1, f.y - 1, f.w + 2, f.h + 2);
    ctx.fillStyle = "#c08a5a";
    ctx.fillRect(x, f.y, f.w, f.h);
    ctx.fillStyle = "#8a5a36";
    ctx.fillRect(x, f.y + f.h - 1, f.w, 1);
    var thumb = photoThumbs[photoIndexToday()];
    if (thumb) ctx.drawImage(thumb, x + 2, f.y + 2);
    else {
      ctx.fillStyle = "#ffe0ea";
      ctx.fillRect(x + 2, f.y + 2, f.w - 4, f.h - 4);
    }
  }

  function makeThumb(img) {
    var c = document.createElement("canvas");
    c.width = 12;
    c.height = 9;
    var g = c.getContext("2d");
    g.imageSmoothingEnabled = true;
    var ratio = 12 / 9;
    var sw = img.width, sh = img.height;
    if (sw / sh > ratio) sw = sh * ratio;
    else sh = sw / ratio;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, 12, 9);
    return c;
  }

  function loadPhotos() {
    PHOTOS.forEach(function (p, i) {
      var img = new Image();
      img.onload = function () {
        photoImgs[i] = img;
        photoThumbs[i] = makeThumb(img);
      };
      img.src = p.src;
    });
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
        if (!busy()) goEat();
      }
    }
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
      Sfx.play("munch");
    } });
    startPlan(plan);
  }

  function addXp(n) {
    store.xp += n;
    var leveled = false;
    while (store.xp >= 15 * store.level) {
      store.xp -= 15 * store.level;
      store.level++;
      leveled = true;
    }
    save();
    if (leveled) onLevelUp();
  }

  function addLove(n) {
    store.love = clamp(store.love + n, 0, 100);
  }

  function lockedItems() {
    return S.ITEMS.filter(function (it) { return store.owned.indexOf(it.id) < 0; });
  }

  function unlock(id) {
    if (store.owned.indexOf(id) < 0) store.owned.push(id);
    save();
  }

  function itemById(id) {
    for (var i = 0; i < S.ITEMS.length; i++) if (S.ITEMS[i].id === id) return S.ITEMS[i];
    return null;
  }

  function wear(id) {
    var it = itemById(id);
    if (!it) return;
    var o = store.outfit;
    o[it.slot] = o[it.slot] === id ? null : id;
    save();
  }

  function currentOutfit() {
    return store.outfit;
  }

  function onLevelUp() {
    Sfx.play("level");
    confetti(40);
    hearts(10);
    var locked = lockedItems();
    var item = locked.length ? locked[Math.floor(Math.random() * locked.length)] : null;
    if (item) unlock(item.id);
    setTimeout(function () {
      openPanel("Nivo " + store.level + "!", function (body) {
        body.appendChild(el("p", "big", pick("Level")));
        if (item) {
          body.appendChild(el("p", "", "Koala je dobio novu stvar:"));
          body.appendChild(itemCard(item));
          body.appendChild(button("Obuci", function () {
            if (store.outfit[item.slot] !== item.id) wear(item.id);
            closePanel();
            say(pick("Dress"), 3);
          }));
        }
      });
    }, 700);
  }

  function spawnGift() {
    var b = layout.bushes;
    var spots = [(b[0] + b[1]) / 2, (b[1] + b[2]) / 2];
    gift = { x: Math.round(spots[Math.floor(Math.random() * spots.length)]), t: 0 };
    say(pick("Gift"), 4);
    Sfx.play("drop");
  }

  function drawGift() {
    if (!gift) return;
    gift.t += 1 / 60;
    var bounce = Math.floor(clock * 2) % 4 === 0 ? 1 : 0;
    drawMap(GIFT, gift.x - 4, layout.groundY - 9 - bounce, { R: "#ff6f9a", T: "#ffd34d", t: "#e0aa2a" });
    if (Math.floor(clock * 3) % 3 === 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(gift.x + 5, layout.groundY - 11, 1, 1);
    }
  }

  function openGift() {
    if (!gift) return;
    var gx = gift.x;
    gift = null;
    store.giftDate = today();
    Sfx.play("gift");
    hearts(8, gx, layout.groundY - 8);
    confetti(18);
    addLove(8);
    var locked = lockedItems();
    var roll = Math.random();
    if (locked.length && roll < 0.7) {
      var item = locked[Math.floor(Math.random() * locked.length)];
      unlock(item.id);
      openPanel("Poklon!", function (body) {
        body.appendChild(el("p", "", "Novo za koalu:"));
        body.appendChild(itemCard(item));
        body.appendChild(button("Obuci", function () {
          if (store.outfit[item.slot] !== item.id) wear(item.id);
          closePanel();
          say(pick("Dress"), 3);
        }));
      });
    } else if (roll < 0.85) {
      openAlbum(Math.floor(Math.random() * PHOTOS.length), "Uspomena");
    } else {
      openPanel("Poruka dana", function (body) {
        body.appendChild(el("p", "big", pick("Love")));
      });
    }
    addXp(5);
  }

  function startBunny() {
    var fromLeft = koala.x > 46;
    bunny = { x: fromLeft ? -14 : view.W + 14, y: layout.groundY, state: "enter", t: 0, hopT: 0, facing: fromLeft ? 1 : -1, target: koala.x + (fromLeft ? -22 : 22), stay: rand(16, 22), happyT: 0, blinkT: 2, blink: false };
  }

  function updateBunny(dt) {
    if (!bunny) {
      if (mode !== "play") return;
      bunnyTimer -= dt;
      if (bunnyTimer <= 0) {
        if (koala.on === "ground" && !busy() && koala.state !== "sleep" && koala.state !== "eat") {
          startBunny();
          bunnyTimer = rand(300, 540);
        } else {
          bunnyTimer = 20;
        }
      }
      return;
    }
    var b = bunny;
    b.t += dt;
    b.blinkT -= dt;
    if (b.blinkT <= 0) {
      b.blink = !b.blink;
      b.blinkT = b.blink ? 0.13 : rand(2, 4);
    }
    if (b.happyT > 0) b.happyT -= dt;
    if (b.state === "enter" || b.state === "leave") {
      var goal = b.state === "enter" ? b.target : (b.facing > 0 ? view.W + 16 : -16);
      b.hopT += dt;
      var p = (b.hopT % 0.5) / 0.5;
      b.y = layout.groundY - Math.sin(p * Math.PI) * 6;
      b.x += b.facing * 30 * dt;
      if ((b.facing > 0 && b.x >= goal) || (b.facing < 0 && b.x <= goal)) {
        if (b.state === "leave") {
          bunny = null;
          return;
        }
        b.x = goal;
        b.y = layout.groundY;
        b.state = "stay";
        b.t = 0;
        b.facing = koala.x > b.x ? 1 : -1;
        if (mode === "play" && !busy()) {
          koala.plan = [];
          koala.facing = b.x > koala.x ? 1 : -1;
          setState("hug", 2.6);
          hearts(8, (koala.x + b.x) / 2, layout.groundY - 28);
          say(pick("Bunny"), 3.5);
          Sfx.play("hug");
          addLove(5);
        }
      }
    } else if (b.state === "stay") {
      b.y = layout.groundY - (b.happyT > 0 ? Math.abs(Math.sin(b.happyT * 8)) * 5 : 0);
      if (b.t > b.stay || mode !== "play") {
        b.state = "leave";
        b.facing = b.x < view.W / 2 ? -1 : 1;
        b.hopT = 0;
      }
    }
  }

  function drawBunny() {
    if (!bunny) return;
    var b = bunny;
    var look = "stand", frame = 0;
    if (b.state !== "stay") {
      look = "hop";
      frame = b.y < layout.groundY - 1 ? 1 : 0;
    } else if (b.happyT > 0) {
      look = "happy";
      frame = Math.floor(b.happyT * 8) % 2;
    } else if (b.t > 3) {
      look = "sit";
    }
    var img = bunnySprite(look, frame, b.blink, b.facing < 0);
    ctx.drawImage(img, Math.round(b.x - S.BW / 2), Math.round(b.y - S.BH));
  }

  var catchGame = null;
  var hideGame = null;

  function setMode(m) {
    mode = m;
    var playing = m === "play";
    bar.hidden = !playing;
    hud.hidden = !playing;
    gamehud.hidden = playing;
    if (!playing) {
      speech.text = "";
      bubble.classList.remove("show");
    }
  }

  function startCatch() {
    closePanel();
    if (busy() && mode === "play" && koala.state !== "climbUp" && koala.state !== "climbDown") return;
    setMode("catch");
    leaf = null;
    koala.plan = [];
    koala.on = "ground";
    koala.y = layout.groundY;
    koala.x = view.W / 2;
    koala.targetX = koala.x;
    setState("catch", 0);
    catchGame = { time: 30, score: 0, items: [], spawn: 0.5 };
    updateGameHud();
  }

  function updateCatch(dt) {
    var g = catchGame;
    g.time -= dt;
    var dx = koala.targetX - koala.x;
    if (Math.abs(dx) > 1) {
      koala.x += clamp(dx, -110 * dt, 110 * dt);
      koala.facing = dx > 0 ? 1 : -1;
      koala.moving = true;
    } else {
      koala.moving = false;
    }
    koala.x = clamp(koala.x, 12, view.W - 12);
    g.spawn -= dt;
    var speedUp = 1 + (30 - g.time) / 30;
    if (g.spawn <= 0 && g.time > 0.5) {
      g.spawn = rand(0.4, 0.75) / speedUp;
      var r = Math.random();
      var kind = r < 0.58 ? "heart" : r < 0.78 ? "sucuk" : r < 0.87 ? "gold" : "pork";
      g.items.push({ kind: kind, x: rand(8, view.W - 8), y: -6, vy: rand(28, 40) * speedUp, t: Math.random() * 6 });
    }
    for (var i = g.items.length - 1; i >= 0; i--) {
      var it = g.items[i];
      it.y += it.vy * dt;
      it.t += dt;
      if (it.y >= layout.groundY - 32 && it.y <= layout.groundY - 6 && Math.abs(it.x - koala.x) < 13) {
        g.items.splice(i, 1);
        var pts = it.kind === "heart" ? 1 : it.kind === "sucuk" ? 2 : it.kind === "gold" ? 3 : -3;
        g.score = Math.max(0, g.score + pts);
        popText((pts > 0 ? "+" : "") + pts, it.x, it.y - 6, pts > 0 ? "#ffd34d" : "#ff6f6f");
        if (pts < 0) {
          Sfx.play("bad");
          koala.blush = 0;
        } else {
          Sfx.play(it.kind === "gold" ? "gold" : "catch");
          if (it.kind !== "sucuk") spawnHeart(it.x, it.y, rand(-10, 10), -20, false, it.kind === "gold");
        }
        continue;
      }
      if (it.y > layout.groundY + 6) g.items.splice(i, 1);
    }
    updateGameHud();
    if (g.time <= 0) endCatch(false);
  }

  function drawCatchItems() {
    if (!catchGame) return;
    for (var i = 0; i < catchGame.items.length; i++) {
      var it = catchGame.items[i];
      var x = Math.round(it.x), y = Math.round(it.y);
      if (it.kind === "heart") drawMap(HEART, x - 3, y - 3, { R: "#ff6f9a", Q: "#ffc2d4" });
      else if (it.kind === "gold") drawMap(HEART, x - 3, y - 3, { R: "#ffc93c", Q: "#fff2b0" });
      else if (it.kind === "sucuk") drawMap(SUCUK, x - 3, y - 2, { S: "#9a3029", s: "#f2c9b8" });
      else drawMap(PORK, x - 3, y - 3, { P: "#ffb3c7", e: "#1d1922", n: "#ff8fae", N: "#a0405a" });
    }
  }

  function endCatch(quit) {
    var score = catchGame.score;
    catchGame = null;
    setMode("play");
    setState("happy", 1.6);
    if (quit) return;
    var best = score > store.best;
    if (best) store.best = score;
    addLove(10);
    addXp(3 + Math.floor(score / 4));
    Sfx.play("level");
    hearts(10);
    openPanel(best ? "Novi rekord!" : "Bravo!", function (body) {
      body.appendChild(el("p", "big", "Uhvatila si " + score + " " + (score % 10 === 1 && score % 100 !== 11 ? "poen" : "poena") + "!"));
      body.appendChild(el("p", "", "Rekord: " + store.best));
      body.appendChild(button("Igraj opet", startCatch));
    });
  }

  function startHide() {
    closePanel();
    if (busy() && mode === "play") return;
    setMode("hide");
    leaf = null;
    koala.plan = [];
    hideGame = { round: 0, rounds: 3, spot: -1, phase: "cover", t: 0, found: 0, shake: [0, 0, 0], peek: 0 };
    nextHideRound();
  }

  function nextHideRound() {
    var h = hideGame;
    h.round++;
    h.phase = "cover";
    h.t = 0;
    cover.hidden = false;
    var count = 3;
    var coverText = document.getElementById("cover-text");
    coverText.textContent = "Zatvori oči... " + count;
    Sfx.play("tick");
    var timer = setInterval(function () {
      count--;
      if (count > 0) {
        coverText.textContent = "Zatvori oči... " + count;
        Sfx.play("tick");
        return;
      }
      clearInterval(timer);
      if (!hideGame) {
        cover.hidden = true;
        return;
      }
      var spot;
      do spot = Math.floor(Math.random() * 3); while (spot === h.spot);
      h.spot = spot;
      koala.on = "ground";
      koala.x = layout.bushes[spot];
      koala.y = layout.groundY;
      setState("hidden", 0);
      h.phase = "seek";
      cover.hidden = true;
      updateGameHud();
    }, 650);
    updateGameHud();
  }

  function tapBush(i) {
    var h = hideGame;
    if (!h || h.phase !== "seek") return;
    if (i === h.spot) {
      h.phase = "reveal";
      h.found++;
      koala.y = layout.groundY;
      koala.facing = chance(0.5) ? 1 : -1;
      setState("happy", 2);
      say(pick("Found"), 2);
      Sfx.play("found");
      hearts(8);
      setTimeout(function () {
        if (!hideGame) return;
        if (hideGame.round >= hideGame.rounds) endHide(false);
        else nextHideRound();
      }, 2300);
    } else {
      h.shake[i] = 0.4;
      Sfx.play("rustle");
      toast(pick("NotHere"));
    }
  }

  function endHide(quit) {
    hideGame = null;
    cover.hidden = true;
    setMode("play");
    if (koala.state === "hidden") setState("wave", 2);
    if (quit) return;
    addLove(10);
    addXp(5);
    Sfx.play("level");
    confetti(24);
    say("Ti si najbolja u žmurkama!", 3.5);
  }

  function updateGameHud() {
    var score = document.getElementById("g-score");
    var time = document.getElementById("g-time");
    if (catchGame) {
      score.textContent = "Poeni: " + catchGame.score;
      var s = Math.max(0, Math.ceil(catchGame.time));
      time.textContent = "0:" + (s < 10 ? "0" : "") + s;
    } else if (hideGame) {
      score.textContent = "Žmurke";
      time.textContent = hideGame.round + "/" + hideGame.rounds;
    }
  }

  function drawBushes() {
    for (var i = 0; i < layout.bushes.length; i++) {
      var shake = 0;
      if (hideGame && hideGame.shake[i] > 0) shake = Math.round(Math.sin(hideGame.shake[i] * 50));
      ctx.drawImage(bushImg, layout.bushes[i] - 13 + shake, layout.groundY - 13);
    }
  }

  function update(dt) {
    var k = koala;
    k.t += dt;
    clock += dt;
    store.hunger = clamp(store.hunger - dt * 3 / 3600, 0, 100);
    store.love = clamp(store.love - dt * 2.5 / 3600, 0, 100);

    k.blinkT -= dt;
    if (k.blinkT <= 0) {
      k.blink = !k.blink;
      k.blinkT = k.blink ? 0.13 : rand(2, 5);
    }
    k.blush = Math.max(0, k.blush - dt * 0.4);

    switch (k.state) {
      case "walk":
        var dir = k.targetX > k.x ? 1 : -1;
        k.facing = dir;
        k.x += dir * 20 * dt;
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
          k.x = clamp(k.x, 12, view.W - 12);
          k.vx = -k.vx * 0.45;
        }
        if (k.y < 48) {
          k.y = 48;
          k.vy = Math.abs(k.vy) * 0.3;
        }
        if (k.vx !== 0) k.facing = k.vx > 0 ? 1 : -1;
        if (k.vy > 0 && before <= layout.branchY && k.y >= layout.branchY && k.x > layout.branchX0 + 6 && k.x < layout.trunkX - 2) land("branch", layout.branchY);
        else if (k.y >= layout.groundY) land("ground", layout.groundY);
        break;
      case "held":
      case "catch":
      case "hidden":
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
          store.hunger = clamp(store.hunger + 22, 0, 100);
          addLove(3);
          k.blush = 1;
          hearts(4);
          say(pick("Eat"), 3);
          setState("happy", 1.2);
          addXp(3);
        }
        break;
      default:
        if (k.dur > 0 && k.t > k.dur) {
          if (mode !== "play") {
            setState("idle", 1);
          } else if (leaf && leaf.landed && !leaf.fade && store.hunger < 95) goEat();
          else chooseNext();
        }
    }

    if (mode === "play") {
      chatTimer -= dt;
      if (chatTimer <= 0) {
        chatTimer = rand(40, 80);
        if (k.state !== "sleep" && k.state !== "held" && k.state !== "fall" && k.state !== "eat" && !speech.text) {
          if (unread().length && chance(0.6)) {
            say(pick("Letter"), 4);
          } else {
            if (k.state === "idle" || k.state === "sit") setState("wave", 2.5);
            say(randomMessage(), 5);
          }
        }
      }
      if (!gift && store.giftDate !== today() && clock > 6 && !busy() && !speech.text) spawnGift();
      if (special) {
        specialT -= dt;
        if (specialT <= 0) {
          specialT = special.effect === "confetti" ? 0.25 : 1.2;
          if (special.effect === "confetti") confetti(2);
          else if (special.effect === "hearts") spawnHeart(rand(4, view.W - 4), layout.groundY, rand(-4, 4), rand(-30, -18), chance(0.4));
        }
      }
    } else if (mode === "catch") {
      updateCatch(dt);
    } else if (mode === "hide" && hideGame) {
      for (var i = 0; i < 3; i++) if (hideGame.shake[i] > 0) hideGame.shake[i] -= dt;
      hideGame.peek = Math.sin(clock * 2.2) > 0.92 ? 1 : 0;
    }

    updateLeaf(dt);
    updateBunny(dt);
    updateParticles(dt);
    updateSpeech(dt);

    hudTimer -= dt;
    if (hudTimer <= 0) {
      hudTimer = 1;
      updateHud();
      if (currentPhase() !== phase) bgKey = "";
    }
    saveTimer -= dt;
    if (saveTimer <= 0) {
      saveTimer = 10;
      store.statT = Date.now();
      store.lastVisit = Date.now();
      save();
    }
  }

  var chatTimer = rand(35, 60);
  var hudTimer = 0;
  var saveTimer = 10;
  var specialT = 0;

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
      case "catch": return k.moving ? { look: "walk", frame: Math.floor(clock * 10) % 4 } : { look: "stand", frame: 0 };
      case "climbUp":
      case "climbDown": return { look: "climb", frame: Math.floor(k.t * 5) % 2 };
      case "sit":
      case "hidden": return { look: "sit", frame: 0 };
      case "sleep": return { look: "sleep", frame: Math.floor(k.t * 0.8) % 2 };
      case "wave": return { look: "wave", frame: Math.floor(k.t * 4) % 2 };
      case "happy": return { look: "happy", frame: Math.floor(k.t * 10) % 4 };
      case "fall": return { look: "fall", frame: Math.floor(k.t * 12) % 2 };
      case "held": return { look: "held", frame: Math.floor(k.t * 6) % 2 };
      case "eat": return { look: "eat", frame: Math.floor(k.t * 4) % 2 };
      case "hug": return { look: "hug", frame: Math.floor(k.t * 3) % 2 };
      default:
        if (unread().length && mode === "play") return { look: "letter", frame: 0 };
        return { look: k.hold ? "heart" : "stand", frame: 0 };
    }
  }

  function render(dt) {
    buildBackground();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, 0, 0);
    drawSky(dt);
    drawPhotoFrame();

    var k = koala;
    koala.outfit = currentOutfit();
    var lf = lookFor(k);
    var airborne = k.state === "fall" || k.state === "held";
    if ((k.on === "ground" || airborne) && k.state !== "hidden") {
      var sw = airborne ? 10 : 18;
      ctx.fillStyle = "rgba(20,10,40,0.18)";
      ctx.fillRect(Math.round(k.x - sw / 2), layout.groundY - 1, sw, 2);
    }
    if (mode !== "hide") drawBushes();
    drawGift();
    drawLeaf();
    drawBunny();
    var img = koalaSprite(lf.look, lf.frame, k.blink && lf.look !== "sleep", k.blush > 0.4, k.facing < 0 && lf.look !== "climb", koala.outfit);
    if (k.state === "hidden") {
      var top = layout.groundY - 13;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, view.W, layout.groundY - 2);
      ctx.clip();
      ctx.drawImage(img, Math.round(k.x - 16), top + 29 - S.H + (hideGame && hideGame.peek ? -2 : 0) + 7);
      ctx.restore();
    } else {
      ctx.drawImage(img, Math.round(k.x - 16), Math.round(k.y - S.H));
    }
    drawCatchItems();
    if (mode === "hide") drawBushes();
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
    return p.x > k.x - 13 && p.x < k.x + 13 && p.y > k.y - 37 && p.y < k.y + 2;
  }

  function hitsTree(p) {
    var tx = layout.trunkX, by = layout.branchY;
    if (p.x > tx - 6 && p.x < tx + 6 && p.y > by - 40 && p.y < layout.groundY + 2) return true;
    if (p.x > layout.branchX0 - 4 && p.x < tx && p.y > by - 6 && p.y < by + 6) return true;
    var dx = (p.x - tx) / 22, dy = (p.y - (by - 42)) / 16;
    return dx * dx + dy * dy < 1;
  }

  function hitsFrame(p) {
    var f = frameRect();
    return p.x > f.x - 3 && p.x < f.x + f.w + 3 && p.y > f.y - 3 && p.y < f.y + f.h + 3;
  }

  function hitsGift(p) {
    return gift && Math.abs(p.x - gift.x) < 9 && p.y > layout.groundY - 16 && p.y < layout.groundY + 4;
  }

  function hitsBunny(p) {
    return bunny && Math.abs(p.x - bunny.x) < 11 && p.y > bunny.y - 30 && p.y < bunny.y + 2;
  }

  function bushAt(p) {
    for (var i = 0; i < layout.bushes.length; i++) {
      if (Math.abs(p.x - layout.bushes[i]) < 14 && p.y > layout.groundY - 20 && p.y < layout.groundY + 6) return i;
    }
    return -1;
  }

  var touch = null;
  var tapStreak = 0;
  var lastTap = 0;

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    Sfx.unlock();
    var p = toWorld(e);
    if (mode === "catch") {
      koala.targetX = p.x;
      touch = { id: e.pointerId, game: true };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    if (mode === "hide") {
      var bi = bushAt(p);
      if (bi >= 0) tapBush(bi);
      return;
    }
    touch = { id: e.pointerId, start: p, cssX: e.clientX, cssY: e.clientY, onKoala: hitsKoala(p) && !hitsGift(p) && !hitsBunny(p), dragging: false, last: p, lastT: performance.now(), vx: 0, vy: 0 };
    if (touch.onKoala) {
      touch.off = { x: koala.x - p.x, y: koala.y - p.y };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!touch || touch.id !== e.pointerId) return;
    e.preventDefault();
    var p = toWorld(e);
    if (touch.game) {
      if (mode === "catch") koala.targetX = p.x;
      return;
    }
    if (!touch.onKoala) return;
    var now = performance.now();
    if (!touch.dragging && Math.abs(e.clientX - touch.cssX) + Math.abs(e.clientY - touch.cssY) > 8) {
      if (koala.state === "climbUp" || koala.state === "climbDown") return;
      touch.dragging = true;
      koala.plan = [];
      koala.on = null;
      setState("held", 0);
      if (chance(0.6)) say(pick("Picked"), 2.5);
    }
    if (touch.dragging) {
      var dtm = Math.max(1, now - touch.lastT) / 1000;
      touch.vx += ((p.x - touch.last.x) / dtm - touch.vx) * 0.5;
      touch.vy += ((p.y - touch.last.y) / dtm - touch.vy) * 0.5;
      touch.last = p;
      touch.lastT = now;
      koala.x = clamp(p.x + touch.off.x, 12, view.W - 12);
      koala.y = clamp(p.y + touch.off.y, 48, layout.groundY);
      if (Math.abs(touch.vx) > 4) koala.facing = touch.vx > 0 ? 1 : -1;
    }
  });

  function endTouch(e) {
    if (!touch || touch.id !== e.pointerId) return;
    var t = touch;
    touch = null;
    if (t.game) return;
    var p = toWorld(e);
    if (t.dragging) {
      if (performance.now() - t.lastT > 120) {
        t.vx = 0;
        t.vy = 0;
      }
      koala.vx = clamp(t.vx, -260, 260);
      koala.vy = clamp(t.vy, -320, 260);
      koala.fallFrom = koala.y;
      setState("fall", 0);
      Sfx.play("hop");
      return;
    }
    if (e.type === "pointercancel" || mode !== "play") return;
    if (hitsGift(p)) {
      openGift();
    } else if (hitsBunny(p)) {
      bunny.happyT = 1.2;
      Sfx.play("hop");
      hearts(5, bunny.x, bunny.y - 24);
      if (!busy() && !speech.text) say(pick("BunnyTap"), 2.5);
      addLove(2);
    } else if (t.onKoala) {
      petKoala();
    } else if (hitsFrame(p)) {
      openAlbum(photoIndexToday());
    } else if (hitsTree(p)) {
      if (busy()) return;
      if (koala.on === "branch") say(pick("Tree"), 3);
      else startPlan(routeTo("branch", rand(layout.branchX0 + 10, layout.trunkX - 8)));
    } else if (p.y > layout.groundY - 12) {
      if (busy() || koala.state === "sleep") return;
      startPlan(routeTo("ground", p.x));
    } else {
      Sfx.play("tick");
      for (var i = 0; i < 3; i++) particles.push({ kind: "mini", x: p.x + rand(-3, 3), y: p.y, vx: rand(-10, 10), vy: rand(-22, -10), life: 1.2, max: 1.2, hue: Math.floor(Math.random() * 3) });
    }
  }

  canvas.addEventListener("pointerup", endTouch);
  canvas.addEventListener("pointercancel", endTouch);

  var lastPetXp = 0;
  function petKoala() {
    var k = koala;
    if (busy()) return;
    if (unread().length) {
      readLetter();
      return;
    }
    if (k.state === "sleep") {
      setState("wave", 2);
      Sfx.play("yawn");
      if (!speech.text) say(pick("Waking"), 3);
      return;
    }
    var now = performance.now();
    tapStreak = now - lastTap < 1200 ? tapStreak + 1 : 1;
    lastTap = now;
    k.plan = [];
    k.blush = 1;
    Sfx.play("pop");
    addLove(2);
    if (now - lastPetXp > 4000) {
      lastPetXp = now;
      addXp(1);
    }
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

  function readLetter() {
    var list = unread();
    if (!list.length) return;
    var m = list[0];
    store.read.push(m.id);
    save();
    koala.plan = [];
    setState("wave", 3);
    Sfx.play("letter");
    hearts(6);
    say(m.text, 6 + m.text.length / 16, "Pismo od Doruka");
    updateBadge();
  }

  function onFeed() {
    if (busy()) return;
    if (koala.state === "sleep") setState("wave", 1.5);
    if (store.hunger >= 95) {
      say(pick("Full"), 3);
      return;
    }
    if (spawnLeaf()) Sfx.play("drop");
  }

  function onMessage() {
    if (busy()) return;
    if (unread().length) {
      readLetter();
      return;
    }
    koala.plan = [];
    setState("wave", 2.5);
    Sfx.play("pop");
    say(chance(0.5) ? pick("Love") : pick("Doruk"), 5);
  }

  var lastHugXp = 0;
  function onHug() {
    if (busy()) return;
    koala.plan = [];
    koala.blush = 1;
    setState("hug", 3.2);
    heartRain();
    hearts(6);
    Sfx.play("hug");
    say(pick("Hug"), 4);
    addLove(10);
    if (performance.now() - lastHugXp > 30000) {
      lastHugXp = performance.now();
      addXp(2);
    }
  }

  function toggleSleep() {
    if (busy()) return;
    if (koala.state === "sleep") {
      setState("wave", 2);
      Sfx.play("yawn");
      if (!speech.text) say(pick("Waking"), 3);
    } else {
      koala.plan = [];
      setState("sleep", 240);
      Sfx.play("yawn");
      say("Laku noć... probudi me kad ti zatrebam.", 3);
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function button(label, fn, icon) {
    var b = el("button", "pbtn");
    if (icon) {
      var img = el("img");
      img.src = icons[icon];
      img.alt = "";
      b.appendChild(img);
    }
    b.appendChild(el("span", "", label));
    b.addEventListener("click", function (e) {
      e.preventDefault();
      Sfx.play("tick");
      fn();
    });
    return b;
  }

  function openPanel(title, build) {
    panelTitle.textContent = title;
    panelBody.innerHTML = "";
    build(panelBody);
    panel.hidden = false;
    panel.scrollTop = 0;
  }

  function closePanel() {
    panel.hidden = true;
    panelBody.innerHTML = "";
  }

  function previewCanvas(outfit, cropTop, cropH) {
    var src = S.toCanvas(S.build("stand", 0, false, true, outfit), false);
    var c = el("canvas", "pix");
    c.width = S.W;
    c.height = cropH;
    c.getContext("2d").drawImage(src, 0, cropTop, S.W, cropH, 0, 0, S.W, cropH);
    return c;
  }

  function itemCard(item) {
    var card = el("div", "itemcard");
    var o = {};
    o[item.slot] = item.id;
    card.appendChild(previewCanvas(o, 0, 30));
    card.appendChild(el("span", "", item.name));
    return card;
  }

  function openWardrobe() {
    openPanel("Ormar", function (body) {
      var preview = el("div", "wpreview");
      body.appendChild(preview);
      var grid = el("div", "grid");
      body.appendChild(grid);
      function refresh() {
        preview.innerHTML = "";
        preview.appendChild(previewCanvas(store.outfit, 0, S.H));
        grid.innerHTML = "";
        S.ITEMS.forEach(function (it) {
          var owned = store.owned.indexOf(it.id) >= 0;
          var cell = el("button", "cell" + (store.outfit[it.slot] === it.id ? " on" : "") + (owned ? "" : " locked"));
          if (owned) {
            var o = {};
            o[it.slot] = it.id;
            cell.appendChild(previewCanvas(o, 0, 30));
            cell.appendChild(el("span", "", it.name));
            cell.addEventListener("click", function () {
              wear(it.id);
              Sfx.play("pop");
              refresh();
            });
          } else {
            cell.appendChild(el("b", "", "?"));
            cell.appendChild(el("span", "", "Zaključano"));
          }
          grid.appendChild(cell);
        });
      }
      refresh();
      body.appendChild(el("p", "small", "Nove stvari dobijaš iz dnevnog poklona i kad koala poraste."));
      body.appendChild(button("Gotovo", function () {
        closePanel();
        if (!busy()) {
          setState("wave", 2);
          say(pick("Dress"), 3);
        }
      }));
    });
  }

  function openAlbum(index, title) {
    var i = index || 0;
    openPanel(title || "Album", function (body) {
      var c = el("canvas", "photo pix");
      var cap = el("p", "big");
      var nav = el("div", "row");
      function show() {
        var img = photoImgs[i];
        if (img) {
          c.width = img.width;
          c.height = img.height;
          c.getContext("2d").drawImage(img, 0, 0);
        }
        cap.textContent = PHOTOS[i].cap;
      }
      body.appendChild(c);
      body.appendChild(cap);
      nav.appendChild(button("◀", function () { i = (i + PHOTOS.length - 1) % PHOTOS.length; show(); }));
      nav.appendChild(el("span", "count", ""));
      nav.appendChild(button("▶", function () { i = (i + 1) % PHOTOS.length; show(); }));
      body.appendChild(nav);
      show();
    });
    if (!busy() && !speech.text) sayLater(pick("Photo"), 3, 0.2);
  }

  function openLetters() {
    openPanel("Pisma od Doruka", function (body) {
      if (!inbox.length) {
        body.appendChild(el("p", "big", "Još nema pisama. Doruk će ti uskoro pisati!"));
        return;
      }
      inbox.slice().reverse().forEach(function (m) {
        var card = el("div", "letter");
        if (m.date) {
          var d = new Date(m.date);
          card.appendChild(el("small", "", d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear() + "."));
        }
        card.appendChild(el("p", "", m.text));
        body.appendChild(card);
        if (store.read.indexOf(m.id) < 0) store.read.push(m.id);
      });
      save();
      updateBadge();
    });
  }

  function openMenu() {
    openPanel("Još", function (body) {
      body.appendChild(button("Ormar", function () { openWardrobe(); }, "shirt"));
      body.appendChild(button("Album", function () { openAlbum(photoIndexToday()); }, "photo"));
      body.appendChild(button("Pisma od Doruka", function () { openLetters(); }, "note"));
      body.appendChild(button(koala.state === "sleep" ? "Probudi koalu" : "Uspavaj koalu", function () { closePanel(); toggleSleep(); }, koala.state === "sleep" ? "sun" : "moon"));
      body.appendChild(button(store.sound ? "Zvuk: uključen" : "Zvuk: isključen", function () {
        store.sound = !store.sound;
        Sfx.setEnabled(store.sound);
        save();
        openMenu();
      }, store.sound ? "sound" : "mute"));
      body.appendChild(el("p", "small", "Nivo " + store.level + " · Sitost " + Math.round(store.hunger) + "% · Sreća " + Math.round(store.love) + "%"));
    });
  }

  function openGames() {
    openPanel("Igre", function (body) {
      body.appendChild(button("Hvataj srca", startCatch, "heart"));
      body.appendChild(el("p", "small", "Pomeraj koalu prstom. Srce +1, sudžuk +2, zlatno srce +3. Pazi na John Porka: -3! Rekord: " + store.best));
      body.appendChild(button("Žmurke", startHide, "leaf"));
      body.appendChild(el("p", "small", "Koala se krije iza žbunja. Nađi ga tri puta!"));
    });
  }

  function updateHud() {
    var hb = document.getElementById("hunger-bar");
    var lb = document.getElementById("love-bar");
    hb.style.width = Math.max(1, Math.ceil(store.hunger / 20)) * 20 + "%";
    lb.style.width = Math.max(1, Math.ceil(store.love / 20)) * 20 + "%";
    hb.parentNode.classList.toggle("low", store.hunger < 25);
    lb.parentNode.classList.toggle("low", store.love < 25);
    document.getElementById("hud-level").textContent = "Nv. " + store.level;
  }

  function updateBadge() {
    document.getElementById("badge").hidden = unread().length === 0;
  }

  function fetchInbox(announce) {
    if (!window.fetch) return;
    fetch("inbox.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (data) {
      if (!data || !data.messages) return;
      var before = unread().length;
      inbox = data.messages;
      updateBadge();
      var now = unread().length;
      if (announce && now > before) {
        Sfx.play("letter");
        sayLater(pick("Letter"), 4, 1.5);
      }
    }).catch(function () {});
  }

  var icons = {};

  function bindButton(id, fn) {
    document.getElementById(id).addEventListener("click", function (e) {
      e.preventDefault();
      Sfx.unlock();
      fn();
    });
  }

  function greeting() {
    var h = new Date().getHours();
    if (!store.seen) {
      store.seen = true;
      save();
      return "Ćao Una! Ja sam tvoja koala. Doruk me je poslao da te čuvam.";
    }
    if (special && store.specialGreet !== today()) {
      store.specialGreet = today();
      save();
      return special.greet;
    }
    if (store.lastVisit && Date.now() - store.lastVisit > 20 * 3600000) return pick("Missed");
    if (h >= 5 && h < 12) return "Dobro jutro, Zečiću!";
    if (h >= 12 && h < 18) return "Ćao opet! Nedostajala si mi.";
    if (h >= 18 && h < 23) return "Dobro veče, lepotice!";
    return pick("Night");
  }

  function applySpecial() {
    if (!special) return;
    banner.textContent = special.banner;
    banner.hidden = false;
    if (special.item) {
      unlock(special.item);
      if (store.specialDress !== today()) {
        store.specialDress = today();
        var it = itemById(special.item);
        store.outfit[it.slot] = it.id;
        save();
      }
    }
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
      store.statT = Date.now();
      store.lastVisit = Date.now();
      save();
      return;
    }
    last = 0;
    var away = hiddenAt ? (Date.now() - hiddenAt) / 3600000 : 0;
    store.hunger = clamp(store.hunger - away * 3, 0, 100);
    store.love = clamp(store.love - away * 2.5, 0, 100);
    store.statT = Date.now();
    fetchInbox(true);
    if (away > 1 / 6 && mode === "play" && koala.state !== "held") {
      bgKey = "";
      special = specialDay();
      if (koala.state === "sleep") setState("wave", 2);
      say(greeting(), 4);
    }
  });

  function start() {
    ["leaf", "mail", "heart", "star", "dots", "moon", "sun", "shirt", "photo", "note", "sound", "mute"].forEach(function (n) { icons[n] = iconUrl(n); });
    document.querySelector("#btn-feed img").src = icons.leaf;
    document.querySelector("#btn-msg img").src = icons.mail;
    document.querySelector("#btn-hug img").src = icons.heart;
    document.querySelector("#btn-play img").src = icons.star;
    document.querySelector("#btn-more img").src = icons.dots;
    document.getElementById("hud-leaf").src = icons.leaf;
    document.getElementById("hud-heart").src = icons.heart;
    bindButton("btn-feed", onFeed);
    bindButton("btn-msg", onMessage);
    bindButton("btn-hug", onHug);
    bindButton("btn-play", openGames);
    bindButton("btn-more", openMenu);
    document.getElementById("panel-close").addEventListener("click", closePanel);
    panel.addEventListener("click", function (e) { if (e.target === panel) closePanel(); });
    document.getElementById("g-quit").addEventListener("click", function () {
      if (catchGame) endCatch(true);
      else if (hideGame) endHide(true);
    });
    document.getElementById("hud").addEventListener("click", function () {
      toast("Sitost " + Math.round(store.hunger) + "% · Sreća " + Math.round(store.love) + "%");
    });

    Sfx.setEnabled(store.sound);
    applySpecial();
    resize();
    koala = newKoala();
    koala.y = 50;
    koala.fallFrom = koala.y;
    initAmbient();
    loadPhotos();
    updateHud();
    fetchInbox(false);
    setInterval(function () { fetchInbox(true); }, 5 * 60 * 1000);
    window.addEventListener("resize", function () {
      resize();
      initAmbient();
    });

    sayLater(greeting(), 4, 0.9);
    var m = new Date().getMonth();
    if ((m === 11 || m === 0 || m === 1) && store.snowDate !== today()) {
      store.snowDate = today();
      save();
      sayLater(pick("Snow"), 4, 8);
    }
    setTimeout(function () {
      if (unread().length) sayLater(pick("Letter"), 4, 0);
    }, 2500);
    store.lastVisit = Date.now();
    setupInstallHint();

    if (/[?&]debug/.test(location.search)) {
      window.__koala = {
        step: function (seconds) {
          for (var t = 0; t < seconds; t += 1 / 30) {
            update(1 / 30);
            render(1 / 30);
          }
        },
        feed: onFeed, msg: onMessage, hug: onHug, sleep: toggleSleep, pet: petKoala,
        catchGame: startCatch, hide: startHide, bunny: startBunny, gift: spawnGift, openGift: openGift,
        wardrobe: openWardrobe, album: openAlbum, menu: openMenu, games: openGames, letters: openLetters,
        tapBush: tapBush, aim: function (x) { koala.targetX = x; },
        state: function () { return { koala: koala, store: store, hide: hideGame, catchGame: catchGame, bunny: bunny, layout: layout }; },
        inbox: function (list) { inbox = list; updateBadge(); },
        go: function (target, x) { startPlan(routeTo(target, x)); },
        phase: function (p) { phaseOverride = p; bgKey = ""; },
        special: function (s) { special = s; applySpecial(); }
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
