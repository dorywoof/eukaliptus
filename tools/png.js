"use strict";
const zlib = require("zlib");
const fs = require("fs");
const S = require("../sprite.js");

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function hex(h) {
  return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
}

class Image {
  constructor(w, h, bg) {
    this.w = w;
    this.h = h;
    this.d = Buffer.alloc(w * h * 4);
    if (bg) this.fill(0, 0, w, h, bg);
  }
  fill(x, y, w, h, color) {
    const [r, g, b] = hex(color);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) {
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) {
        const k = (j * this.w + i) * 4;
        this.d[k] = r; this.d[k + 1] = g; this.d[k + 2] = b; this.d[k + 3] = 255;
      }
    }
  }
  raster(r, x, y, scale, crop) {
    const c = crop || { x: 0, y: 0, w: r.w, h: r.h };
    for (let j = 0; j < c.h; j++) {
      for (let i = 0; i < c.w; i++) {
        const key = r.px[(j + c.y) * r.w + i + c.x];
        if (key) this.fill(x + i * scale, y + j * scale, scale, scale, S.PALETTE[key]);
      }
    }
  }
  save(path) {
    const raw = Buffer.alloc((this.w * 4 + 1) * this.h);
    for (let y = 0; y < this.h; y++) {
      raw[y * (this.w * 4 + 1)] = 0;
      this.d.copy(raw, y * (this.w * 4 + 1) + 1, y * this.w * 4, (y + 1) * this.w * 4);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    fs.writeFileSync(path, Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]));
  }
}

module.exports = { Image, S };
