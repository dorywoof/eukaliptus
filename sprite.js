(function (root) {
  "use strict";

  var PAD = 8;
  var W = 32;
  var H = 37 + PAD;
  var BW = 24;
  var BH = 34;

  var PALETTE = {
    o: "#3a3347",
    g: "#a3a9b8",
    G: "#8a90a1",
    h: "#c6cbd6",
    w: "#f6f2ec",
    p: "#f2b0c3",
    n: "#2b2731",
    N: "#5f5869",
    e: "#1d1922",
    W: "#ffffff",
    r: "#f6b9c8",
    b: "#ff8fae",
    s: "#b0663c",
    S: "#743f22",
    d: "#7d8394",
    k: "#4a4553",
    L: "#6dbb73",
    l: "#3f8048",
    R: "#ff6f9a",
    Q: "#ffc2d4",
    C: "#6b4a33",
    c: "#8a6446",
    K: "#45301f",
    T: "#d9485f",
    t: "#f07d8e",
    Y: "#ffd34d",
    y: "#c99a1e",
    U: "#5aa0ff",
    A: "#9a6a3a",
    a: "#d4a36b",
    B: "#fbf8fa",
    V: "#e4d8e2",
    M: "#ffa6c4"
  };

  var ITEMS = [
    { id: "kacket", name: "Kačket", slot: "hat" },
    { id: "kapa", name: "Zimska kapa", slot: "hat" },
    { id: "kruna", name: "Kruna", slot: "hat" },
    { id: "sesir", name: "Žurka šešir", slot: "hat" },
    { id: "rogovi", name: "Jelenji rogovi", slot: "ear" },
    { id: "usi", name: "Zečje uši", slot: "ear" },
    { id: "cvet", name: "Cvet", slot: "ear" },
    { id: "masna", name: "Mašna", slot: "ear" },
    { id: "naocare", name: "Naočare", slot: "face" },
    { id: "suncane", name: "Sunčane naočare", slot: "face" }
  ];

  function Raster(w, h, oy) {
    this.w = w;
    this.h = h;
    this.oy = oy || 0;
    this.px = new Array(w * h);
  }

  Raster.prototype.set = function (x, y, c) {
    x = Math.floor(x);
    y = Math.floor(y) + this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  };

  Raster.prototype.get = function (x, y) {
    y += this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    return this.px[y * this.w + x];
  };

  Raster.prototype.ellipse = function (cx, cy, rx, ry, c, test) {
    var x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
    var y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var dx = (x + 0.5 - cx) / rx;
        var dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!test || test(x, y))) this.set(x, y, c);
      }
    }
  };

  Raster.prototype.outlined = function (cx, cy, rx, ry, c) {
    this.ellipse(cx, cy, rx + 1, ry + 1, "o");
    this.ellipse(cx, cy, rx, ry, c);
  };

  Raster.prototype.rect = function (x, y, w, h, c) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c);
  };

  Raster.prototype.limb = function (x1, y1, x2, y2, c, end) {
    var steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2 + 1;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = x1 + (x2 - x1) * t;
      var y = y1 + (y2 - y1) * t;
      this.rect(Math.round(x - 1), Math.round(y - 1), 2, 2, c);
    }
    if (end) this.rect(Math.round(x2 - 1), Math.round(y2 - 1), 2, 2, end);
  };

  Raster.prototype.map = function (rows, x, y) {
    for (var j = 0; j < rows.length; j++) {
      for (var i = 0; i < rows[j].length; i++) {
        var c = rows[j][i];
        if (c !== ".") this.set(x + i, y + j, c);
      }
    }
  };

  Raster.prototype.outline = function (c) {
    var add = [];
    for (var y = 0; y < this.h; y++) {
      for (var x = 0; x < this.w; x++) {
        var p = this.px;
        var w = this.w;
        if (p[y * w + x]) continue;
        if ((x > 0 && p[y * w + x - 1]) || (x < w - 1 && p[y * w + x + 1]) || (y > 0 && p[(y - 1) * w + x]) || (y < this.h - 1 && p[(y + 1) * w + x])) add.push(x, y);
      }
    }
    for (var i = 0; i < add.length; i += 2) this.px[add[i + 1] * this.w + add[i]] = c;
  };

  function mx(x) {
    return 31 - x;
  }

  function both(r, pts, c, y0) {
    for (var i = 0; i < pts.length; i++) {
      r.set(pts[i][0], y0 + pts[i][1], c);
      r.set(mx(pts[i][0]), y0 + pts[i][1], c);
    }
  }

  function drawEar(r, cx, cy) {
    r.outlined(cx, cy, 5, 4.6, "g");
    r.ellipse(cx, cy + 0.3, 3.3, 3, "w");
    r.ellipse(cx, cy + 0.6, 1.6, 1.5, "p");
  }

  function drawEyes(r, cy, mode) {
    var y = cy - 1;
    if (mode === "closed") {
      r.rect(11, y + 1, 2, 1, "e");
      r.rect(19, y + 1, 2, 1, "e");
      return;
    }
    if (mode === "happy") {
      both(r, [[10, 1], [11, 0], [12, 0], [13, 1]], "e", y);
      return;
    }
    if (mode === "wide") {
      r.rect(10, y - 1, 3, 3, "e");
      r.rect(19, y - 1, 3, 3, "e");
      r.set(10, y - 1, "W");
      r.set(19, y - 1, "W");
      return;
    }
    r.rect(11, y, 2, 2, "e");
    r.rect(19, y, 2, 2, "e");
    r.set(11, y, "W");
    r.set(19, y, "W");
  }

  function drawHead(r, cy, opts) {
    drawEar(r, 6.5, cy - 5);
    drawEar(r, 25.5, cy - 5);
    r.outlined(16, cy, 9.5, 7.6, "g");
    r.set(15, cy - 8, "g");
    r.set(16, cy - 8, "g");
    r.set(16, cy - 9, "g");
    r.set(17, cy - 8, "g");
    r.set(10, cy - 5, "h");
    r.set(11, cy - 6, "h");
    r.set(12, cy - 6, "h");
    r.set(13, cy - 7, "h");

    var blush = opts.blush ? "b" : "r";
    r.rect(8, cy + 2, 2, 1, blush);
    r.rect(22, cy + 2, 2, 1, blush);
    if (opts.blush) {
      r.rect(9, cy + 3, 1, 1, blush);
      r.rect(22, cy + 3, 1, 1, blush);
    }

    drawEyes(r, cy, opts.eyes);

    r.ellipse(16, cy + 2.8, 2.3, 2.9, "n");
    r.set(15, cy + 1, "N");

    if (opts.mouth === "open") {
      r.rect(15, cy + 6, 2, 1, "e");
    } else if (opts.mouth === "chew") {
      r.rect(15, cy + 6, 2, 1, "k");
    }
  }

  function drawEarItem(r, id, hc) {
    if (id === "rogovi") {
      both(r, [[12, -8], [11, -9], [11, -10], [10, -11], [9, -12], [8, -13], [12, -11], [13, -12], [8, -11], [7, -12]], "A", hc);
      both(r, [[7, -14], [13, -13], [6, -13]], "a", hc);
    } else if (id === "usi") {
      r.outlined(11.5, hc - 13, 2.3, 5.6, "B");
      r.ellipse(11.5, hc - 12.5, 1, 3.8, "M");
      r.outlined(20.5, hc - 13, 2.3, 5.6, "B");
      r.ellipse(20.5, hc - 12.5, 1, 3.8, "M");
    } else if (id === "cvet") {
      r.map([".Q.", "QYQ", ".Q."], 24, hc - 11);
      r.set(22, hc - 9, "Q");
      r.set(23, hc - 8, "L");
    } else if (id === "masna") {
      r.map(["R...R", "RRQRR", "R...R"], 5, hc - 11);
    }
  }

  function drawHat(r, id, hc) {
    if (id === "kacket") {
      r.ellipse(16, hc - 6.6, 8.8, 3.6, "C", function (x, y) { return y <= hc - 4; });
      r.ellipse(14.5, hc - 7.6, 4.5, 1.5, "c");
      r.rect(8, hc - 4, 16, 1, "K");
      r.rect(10, hc - 3, 12, 1, "K");
      r.set(16, hc - 10, "K");
    } else if (id === "kapa") {
      r.ellipse(16, hc - 5.5, 9, 4.4, "T", function (x, y) { return y <= hc - 4; });
      r.rect(12, hc - 8, 1, 3, "t");
      r.rect(16, hc - 9, 1, 4, "t");
      r.rect(20, hc - 8, 1, 3, "t");
      r.rect(7, hc - 4, 18, 2, "w");
      r.ellipse(16, hc - 11, 2.4, 2.2, "w");
    } else if (id === "kruna") {
      r.rect(11, hc - 9, 10, 3, "Y");
      r.rect(11, hc - 7, 10, 1, "y");
      r.map(["Y....YY....Y", "Y....YY....Y", ".....YY....."], 10, hc - 12);
      r.set(13, hc - 8, "R");
      r.set(18, hc - 8, "R");
      r.set(15, hc - 8, "U");
      r.set(16, hc - 8, "U");
    } else if (id === "sesir") {
      for (var i = 0; i < 9; i++) {
        var y = hc - 7 - i;
        var hw = (8 - i) * 0.45 + 0.6;
        var c = (Math.floor(i / 2) % 2) ? "Y" : "U";
        for (var x = Math.round(16 - hw); x < Math.round(16 + hw); x++) r.set(x, y, c);
      }
      r.rect(15, hc - 17, 2, 2, "R");
    }
  }

  function drawFace(r, id, hc) {
    var y = hc - 2;
    if (id === "naocare") {
      [10, 18].forEach(function (x) {
        r.rect(x, y, 4, 1, "e");
        r.rect(x, y + 3, 4, 1, "e");
        r.rect(x, y, 1, 4, "e");
        r.rect(x + 3, y, 1, 4, "e");
      });
      r.rect(14, y + 1, 4, 1, "e");
    } else if (id === "suncane") {
      r.rect(9, y, 6, 3, "e");
      r.rect(17, y, 6, 3, "e");
      r.rect(10, y + 3, 4, 1, "e");
      r.rect(18, y + 3, 4, 1, "e");
      r.rect(15, y + 1, 2, 1, "e");
      r.set(10, y + 1, "N");
      r.set(18, y + 1, "N");
    }
  }

  function build(look, frame, blink, blush, outfit) {
    var r = new Raster(W, H, PAD);
    var sitting = look === "sit" || look === "sleep" || look === "eat" || look === "hug";
    var bob = 0;
    var f = frame || 0;
    outfit = outfit || {};

    if (look === "walk") bob = (f % 2 === 0) ? -1 : 0;
    if (look === "happy") bob = [0, -2, -3, -2][f % 4];
    if (look === "sleep") bob = f % 2 === 0 ? 0 : 1;

    if (sitting) {
      r.ellipse(10.5, 34, 3.4, 2.3, "d");
      r.ellipse(21.5, 34, 3.4, 2.3, "d");
      r.set(9, 34, "k");
      r.set(22, 34, "k");
    } else if (look === "fall" || look === "held" || look === "climb") {
      var dl = look === "climb" ? (f % 2 ? -2 : 0) : (f % 2 ? 1 : 0);
      var dr = look === "climb" ? (f % 2 ? 0 : -2) : (f % 2 ? 0 : 1);
      r.ellipse(12, 33 + dl, 2.4, 2.6, "d");
      r.ellipse(20, 33 + dr, 2.4, 2.6, "d");
    } else {
      var liftL = look === "walk" && f % 4 === 0 ? -1 : 0;
      var liftR = look === "walk" && f % 4 === 2 ? -1 : 0;
      var shift = look === "walk" ? (f % 4 === 0 ? 1 : f % 4 === 2 ? -1 : 0) : 0;
      r.ellipse(12.5 + shift, 33.6 + liftL + bob, 2.6, 2.4, "d");
      r.ellipse(19.5 - shift, 33.6 + liftR + bob, 2.6, 2.4, "d");
    }

    var bodyCy = (sitting ? 27.5 : 25.5) + bob;
    var bodyRx = sitting ? 8.2 : 7.6;
    var bodyRy = sitting ? 6.2 : 6.6;
    if (look === "sleep") bodyRx += (f % 2) * 0.4;
    r.outlined(16, bodyCy, bodyRx, bodyRy, "g");
    r.ellipse(16, bodyCy, bodyRx, bodyRy, "G", function (x, y) { return y >= bodyCy + 3; });
    r.ellipse(16, bodyCy + 1.2, 4.6, 4.3, "w");

    var headCy = (sitting ? 15 : 13) + bob + (look === "sleep" ? 1 : 0);
    var hc = Math.round(headCy);
    var scarfTop = hc + 8;
    for (var sx = 10; sx <= 21; sx++) {
      for (var sy = scarfTop; sy <= scarfTop + 1; sy++) {
        if (!r.get(sx, sy) || r.get(sx, sy) === "o") continue;
        r.set(sx, sy, (sx + sy) % 3 === 0 ? "S" : "s");
      }
    }
    var sway = look === "walk" ? (f % 2) : 0;
    for (var j = 0; j < 4; j++) {
      var tx = 19 + (j >= 2 ? sway : 0);
      r.set(tx, scarfTop + 2 + j, j === 3 ? "S" : "s");
      r.set(tx + 1, scarfTop + 2 + j, (j % 2) ? "S" : "s");
    }

    var ay = Math.round(bodyCy - 3);
    if (look === "wave") {
      var up = f % 2 === 0;
      r.limb(9, ay, 8, ay + 5, "d", "k");
      r.limb(23, ay, up ? 27 : 28, up ? ay - 8 : ay - 6, "d", "k");
    } else if (look === "fall" || look === "held" || look === "happy" || look === "climb") {
      var flap = f % 2;
      r.limb(9, ay, 4 + flap, ay - 7 + flap, "d", "k");
      r.limb(23, ay, 27 - flap, ay - 7 + (1 - flap), "d", "k");
    } else if (look === "hug") {
      r.limb(9, ay, 3, ay - 3 - (f % 2), "d", "k");
      r.limb(23, ay, 29, ay - 3 - (f % 2), "d", "k");
    } else if (look === "eat") {
      r.limb(9, ay + 1, 12, ay - 2, "d", "k");
      r.limb(23, ay + 1, 20, ay - 2, "d", "k");
    } else if (look === "heart" || look === "letter") {
      r.limb(9, ay, 12, ay + 4, "d", "k");
      r.limb(23, ay, 20, ay + 4, "d", "k");
    } else {
      var sw = look === "walk" ? (f % 4 === 0 ? 1 : f % 4 === 2 ? -1 : 0) : 0;
      r.limb(9, ay, 8 - sw, ay + 5, "d", "k");
      r.limb(23, ay, 24 + sw, ay + 5, "d", "k");
    }

    var eyes = "open";
    if (blink || look === "sleep") eyes = "closed";
    if (look === "happy" || look === "hug" || (blush && look !== "sleep")) eyes = "happy";
    if (look === "fall" || look === "held") eyes = "wide";
    var mouth = "none";
    if (look === "fall" || look === "held") mouth = "open";
    if (look === "eat") mouth = f % 2 ? "chew" : "none";

    if (outfit.ear === "rogovi" || outfit.ear === "usi") drawEarItem(r, outfit.ear, hc);
    drawHead(r, hc, { eyes: eyes, blush: blush || look === "happy" || look === "hug", mouth: mouth });
    if (outfit.ear && outfit.ear !== "rogovi" && outfit.ear !== "usi") drawEarItem(r, outfit.ear, hc);
    if (outfit.hat) drawHat(r, outfit.hat, hc);
    if (outfit.face && eyes !== "closed") drawFace(r, outfit.face, hc);

    if (look === "eat") r.map(["...LL", "..LLl", ".LLl.", "LLl..", "l...."], 14 + (f % 2), hc + 5);
    if (look === "heart") r.map([".RR.RR.", "RQRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."], 13, ay + 2);
    if (look === "letter") r.map(["WWWWWWWW", "WoWWWWoW", "WWoWWoWW", "WWWoRWWW", "WWWWWWWW"], 12, ay + 2);

    r.outline("o");
    return r;
  }

  function buildBunny(look, frame, blink) {
    var r = new Raster(BW, BH);
    var f = frame || 0;
    var sit = look === "sit";
    var air = look === "hop" && f % 2 === 1;

    if (sit) {
      r.ellipse(7.5, 32, 3.4, 1.8, "B");
      r.ellipse(16.5, 32, 3.4, 1.8, "B");
    } else if (air) {
      r.ellipse(6.5, 31, 3.2, 1.6, "B");
      r.ellipse(17.5, 31, 3.2, 1.6, "B");
    } else {
      r.ellipse(8, 32.2, 3.2, 1.6, "B");
      r.ellipse(16, 32.2, 3.2, 1.6, "B");
    }
    r.ellipse(19.2, 27, 2, 2, "B");

    var bodyCy = sit ? 26.5 : 25.5;
    r.outlined(12, bodyCy, 6.2, 5.8, "B");
    r.ellipse(12, bodyCy, 6.2, 5.8, "M", function (x, y) { return y >= bodyCy - 4; });
    r.rect(10, Math.round(bodyCy - 4), 4, 1, "B");
    r.set(12, Math.round(bodyCy - 3), "B");
    r.set(12, Math.round(bodyCy + 2), "W");
    r.set(10, Math.round(bodyCy + 4), "W");
    r.set(14, Math.round(bodyCy + 4), "W");

    var ay = Math.round(bodyCy - 3);
    if (look === "happy" || air) {
      r.limb(7, ay, 4, ay - 4 - (f % 2), "B");
      r.limb(17, ay, 20, ay - 4 - (f % 2), "B");
    } else {
      r.limb(7, ay, 6, ay + 3, "B");
      r.limb(17, ay, 18, ay + 3, "B");
    }

    var hc = sit ? 15 : 14;
    if (look === "happy") hc -= f % 2;
    r.outlined(9, hc - 9, 2.2, 6.2, "B");
    r.ellipse(9, hc - 8.5, 0.9, 4.4, "M");
    r.outlined(16, hc - 8, 2.2, 5.4, "B");
    r.ellipse(16, hc - 7.5, 0.9, 3.6, "M");
    r.outlined(12, hc, 7.2, 6, "B");
    r.map(["R.R", ".Q.", "R.R"], 15, hc - 7);

    var ey = hc - 1;
    if (blink) {
      r.rect(8, ey + 1, 2, 1, "e");
      r.rect(14, ey + 1, 2, 1, "e");
    } else if (look === "happy") {
      r.map([".e.", "e.e"], 7, ey);
      r.map([".e.", "e.e"], 14, ey);
    } else {
      r.rect(8, ey, 2, 2, "e");
      r.rect(14, ey, 2, 2, "e");
      r.set(8, ey, "W");
      r.set(14, ey, "W");
    }
    r.rect(5, hc + 2, 2, 1, "b");
    r.rect(17, hc + 2, 2, 1, "b");
    r.rect(11, hc + 2, 2, 1, "R");
    r.set(11, hc + 3, "k");
    r.set(12, hc + 3, "k");

    r.outline("o");
    return r;
  }

  function toCanvas(r, flip, doc) {
    var c = (doc || document).createElement("canvas");
    c.width = r.w;
    c.height = r.h;
    var ctx = c.getContext("2d");
    var img = ctx.createImageData(r.w, r.h);
    for (var y = 0; y < r.h; y++) {
      for (var x = 0; x < r.w; x++) {
        var key = r.px[y * r.w + (flip ? r.w - 1 - x : x)];
        if (!key) continue;
        var hex = PALETTE[key];
        var i = (y * r.w + x) * 4;
        img.data[i] = parseInt(hex.substr(1, 2), 16);
        img.data[i + 1] = parseInt(hex.substr(3, 2), 16);
        img.data[i + 2] = parseInt(hex.substr(5, 2), 16);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  var api = { W: W, H: H, BW: BW, BH: BH, PALETTE: PALETTE, ITEMS: ITEMS, Raster: Raster, build: build, buildBunny: buildBunny, toCanvas: toCanvas };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KoalaSprite = api;
})(this);
