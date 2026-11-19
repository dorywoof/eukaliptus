"use strict";
const path = require("path");
const { Image, S } = require("./png.js");

const out = path.join(__dirname, "..");
const preview = process.argv[2];

function headRaster() {
  const r = S.build("stand", 0, false, true);
  let top = r.h, bottom = 0, left = r.w, right = 0;
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < r.w; x++) {
      if (r.px[y * r.w + x]) {
        top = Math.min(top, y); bottom = Math.max(bottom, y);
        left = Math.min(left, x); right = Math.max(right, x);
      }
    }
  }
  return { r, crop: { x: left, y: top, w: right - left + 1, h: bottom - top + 1 } };
}

function icon(size, file, bg) {
  const { r, crop } = headRaster();
  const scale = Math.floor((size * 0.78) / Math.max(crop.w, crop.h));
  const img = new Image(size, size, bg);
  const x = Math.floor((size - crop.w * scale) / 2);
  const y = Math.floor((size - crop.h * scale) / 2) + Math.floor(scale / 2);
  img.raster(r, x, y, scale, crop);
  img.save(path.join(out, file));
}

if (preview) {
  const looks = ["stand", "walk", "sit", "sleep", "wave", "happy", "fall", "held", "eat", "hug", "heart", "climb"];
  const frames = 4;
  const sc = 6;
  const img = new Image(looks.length * (S.W + 4) * sc, frames * (S.H + 4) * sc, "#88c9ef");
  looks.forEach((look, i) => {
    for (let f = 0; f < frames; f++) {
      img.raster(S.build(look, f, false, false), (i * (S.W + 4) + 2) * sc, (f * (S.H + 4) + 2) * sc, sc);
    }
  });
  img.save(preview);
} else {
  icon(180, "apple-touch-icon.png", "#ffd9e4");
  icon(192, "icon-192.png", "#ffd9e4");
  icon(512, "icon-512.png", "#ffd9e4");
}
