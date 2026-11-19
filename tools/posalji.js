"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const text = (process.env.PORUKA || process.argv.slice(2).join(" ")).trim();
if (!text) {
  console.log("Mesaj bos. Kullanim: posalji.bat ya da node tools/posalji.js \"mesaj\"");
  process.exit(1);
}

const file = path.join(root, "inbox.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const now = new Date();
data.messages.push({ id: now.getTime().toString(36), date: now.toISOString(), text });
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");

const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "inherit" });
git("add", "inbox.json");
git("commit", "-m", "Nova poruka za Unu");
git("push");
console.log("\nGonderildi! Birkac dakika icinde Una'nin koalasina ulasir:\n  " + text);
