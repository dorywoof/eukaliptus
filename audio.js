(function () {
  "use strict";

  var ac = null;
  var enabled = true;

  function context() {
    if (!ac) {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      try {
        ac = new A();
      } catch (e) {
        return null;
      }
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  function tone(freq, at, dur, type, vol, slide) {
    var c = context();
    if (!c || !enabled) return;
    var t = c.currentTime + at;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function seq(notes, step, type, vol, dur) {
    for (var i = 0; i < notes.length; i++) tone(notes[i], i * step, dur || step * 1.6, type, vol);
  }

  var fx = {
    pop: function () { tone(620, 0, 0.09, "square", 0.04, 990); },
    munch: function () { tone(210, 0, 0.06, "square", 0.04); tone(170, 0.12, 0.06, "square", 0.04); tone(230, 0.24, 0.06, "square", 0.04); },
    hug: function () { seq([784, 988, 1175, 1568], 0.09, "triangle", 0.06); },
    gift: function () { seq([523, 659, 784, 1047, 1319], 0.07, "square", 0.035); },
    catch: function () { tone(880, 0, 0.07, "square", 0.035, 1320); },
    gold: function () { seq([1047, 1568], 0.06, "square", 0.035); },
    bad: function () { tone(220, 0, 0.28, "sawtooth", 0.035, 110); },
    hop: function () { tone(380, 0, 0.1, "triangle", 0.05, 720); },
    level: function () { seq([523, 659, 784, 1047, 784, 1047, 1319], 0.08, "square", 0.035); },
    letter: function () { seq([1175, 1568], 0.1, "triangle", 0.06, 0.25); },
    rustle: function () { tone(160, 0, 0.12, "sawtooth", 0.02, 90); },
    found: function () { seq([659, 880, 1319], 0.08, "triangle", 0.06); },
    tick: function () { tone(440, 0, 0.06, "square", 0.03); },
    yawn: function () { tone(330, 0, 0.5, "triangle", 0.04, 180); },
    drop: function () { tone(700, 0, 0.25, "triangle", 0.03, 260); }
  };

  window.Sfx = {
    play: function (name) {
      if (enabled && fx[name]) {
        try { fx[name](); } catch (e) {}
      }
    },
    unlock: function () { context(); },
    setEnabled: function (v) { enabled = v; },
    enabled: function () { return enabled; }
  };
})();
