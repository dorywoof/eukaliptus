"use strict";
const { Image, S } = require("./png.js");

const sc = 6;
const outfits = [{}, { hat: "kacket", ear: "rogovi" }, { hat: "kacket", ear: "usi" }];
S.ITEMS.forEach((it) => outfits.push({ [it.slot]: it.id }));
outfits.push({ hat: "kruna", face: "suncane" });
const bunnyLooks = [["stand", 0], ["hop", 1], ["sit", 0], ["happy", 0], ["happy", 1]];
const cell = S.W + 4;
const cols = outfits.length;
const img = new Image(cols * cell * sc, (S.H + 4) * 2 * sc + (S.BH + 4) * sc, "#88c9ef");
outfits.forEach((o, i) => {
  img.raster(S.build("stand", 0, false, false, o), (i * cell + 2) * sc, 2 * sc, sc);
  img.raster(S.build(i % 2 ? "sit" : "letter", 0, false, false, o), (i * cell + 2) * sc, (S.H + 6) * sc, sc);
});
bunnyLooks.forEach(([look, f], i) => {
  img.raster(S.buildBunny(look, f, false), (i * cell + 2) * sc, ((S.H + 4) * 2 + 2) * sc, sc);
});
img.save(process.argv[2]);
