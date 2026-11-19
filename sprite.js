(function (root) {
  "use strict";

  var W = 32;
  var H = 37;

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
    Q: "#ffc2d4"
  };

  function Raster(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h);
  }

  Raster.prototype.set = function (x, y, c) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  };

  Raster.prototype.get = function (x, y) {
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

  Raster.prototype.outline = function (c) {
    var add = [];
    for (var y = 0; y < this.h; y++) {
      for (var x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(x, y);
      }
    }
    for (var i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c);
  };

  function mx(x) {
    return 31 - x;
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
      [[10, 1], [11, 0], [12, 0], [13, 1]].forEach(function (p) {
        r.set(p[0], y + p[1], "e");
        r.set(mx(p[0]), y + p[1], "e");
      });
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

  function drawScarf(r, top, sway) {
    for (var x = 10; x <= 21; x++) {
      for (var y = top; y <= top + 1; y++) {
        if (!r.get(x, y) || r.get(x, y) === "o") continue;
        r.set(x, y, (x + y) % 3 === 0 ? "S" : "s");
      }
    }
    for (var j = 0; j < 4; j++) {
      var tx = 19 + (j >= 2 ? sway : 0);
      r.set(tx, top + 2 + j, j === 3 ? "S" : "s");
      r.set(tx + 1, top + 2 + j, (j % 2) ? "S" : "s");
    }
  }

  function drawHeartAt(r, x, y) {
    var shape = [".RR.RR.", "RQRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."];
    for (var j = 0; j < shape.length; j++) {
      for (var i = 0; i < shape[j].length; i++) {
        var c = shape[j][i];
        if (c !== ".") r.set(x + i, y + j, c);
      }
    }
  }

  function drawLeaf(r, x, y) {
    var shape = ["...LL", "..LLl", ".LLl.", "LLl..", "l...."];
    for (var j = 0; j < shape.length; j++) {
      for (var i = 0; i < shape[j].length; i++) {
        var c = shape[j][i];
        if (c !== ".") r.set(x + i, y + j, c);
      }
    }
  }

  function build(look, frame, blink, blush) {
    var r = new Raster(W, H);
    var sitting = look === "sit" || look === "sleep" || look === "eat" || look === "hug";
    var bob = 0;
    var f = frame || 0;

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
    drawScarf(r, Math.round(headCy + 8), look === "walk" ? (f % 2) : 0);

    var ay = Math.round(bodyCy - 3);
    if (look === "wave") {
      var up = f % 2 === 0;
      r.limb(9, ay, 8, ay + 5, "d", "k");
      r.limb(23, ay, up ? 27 : 28, up ? ay - 8 : ay - 6, "d", "k");
    } else if (look === "fall" || look === "held" || look === "happy" || look === "climb") {
      var flap = f % 2;
      r.limb(9, ay, 4 + flap, ay - 7 + flap, "d", "k");
      r.limb(22, ay, mx(4 + flap) - 1, ay - 7 + (1 - flap), "d", "k");
    } else if (look === "hug") {
      r.limb(9, ay, 3, ay - 3 - (f % 2), "d", "k");
      r.limb(22, ay, 28, ay - 3 - (f % 2), "d", "k");
    } else if (look === "eat") {
      r.limb(9, ay + 1, 12, ay - 2, "d", "k");
      r.limb(22, ay + 1, 19, ay - 2, "d", "k");
    } else if (look === "heart") {
      r.limb(9, ay, 12, ay + 4, "d", "k");
      r.limb(22, ay, 19, ay + 4, "d", "k");
    } else {
      var sw = look === "walk" ? (f % 4 === 0 ? 1 : f % 4 === 2 ? -1 : 0) : 0;
      r.limb(9, ay, 8 - sw, ay + 5, "d", "k");
      r.limb(22, ay, 23 + sw, ay + 5, "d", "k");
    }

    var eyes = "open";
    if (blink || look === "sleep") eyes = "closed";
    if (look === "happy" || look === "hug" || (blush && look !== "sleep")) eyes = "happy";
    if (look === "fall" || look === "held") eyes = "wide";
    var mouth = "none";
    if (look === "fall" || look === "held") mouth = "open";
    if (look === "eat") mouth = f % 2 ? "chew" : "none";
    drawHead(r, Math.round(headCy), { eyes: eyes, blush: blush || look === "happy" || look === "hug", mouth: mouth });

    if (look === "eat") drawLeaf(r, 14 + (f % 2), Math.round(headCy) + 5);
    if (look === "heart") drawHeartAt(r, 13, ay + 2);

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

  var api = { W: W, H: H, PALETTE: PALETTE, Raster: Raster, build: build, toCanvas: toCanvas };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KoalaSprite = api;
})(this);
