/* 字根工坊 · 极简合成音效（无外部资源） */
(function () {
  var ZG = window.ZG = window.ZG || {};

  var ctx = null;
  var master = null;
  var enabled = true;
  var lastType = 0;

  function settings() {
    try { return ZG.Progress && ZG.Progress.get().settings; } catch (e) { return null; }
  }

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function resume() {
    if (!ctx) ensure();
    if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* ignore */ } }
  }

  function tone(freq, dur, type, gain, when) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (when || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.3, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function play(name) {
    var s = settings();
    enabled = s ? !!s.sound : enabled;
    if (!enabled) return;
    if (!ensure()) return;
    resume();
    var now = Date.now();
    switch (name) {
      case "type":
        if (now - lastType < 28) return;
        lastType = now;
        tone(520 + Math.random() * 90, 0.045, "triangle", 0.18);
        break;
      case "space":
        tone(380, 0.05, "sine", 0.12);
        break;
      case "ok":
        tone(640, 0.09, "sine", 0.2);
        tone(860, 0.16, "sine", 0.15, 0.05);
        break;
      case "error":
        tone(150, 0.16, "sawtooth", 0.13);
        tone(110, 0.18, "triangle", 0.1, 0.04);
        break;
      case "seal":
        tone(90, 0.26, "sine", 0.35);
        tone(180, 0.12, "triangle", 0.12);
        break;
      case "star":
        [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.22, "sine", 0.15, i * 0.07); });
        break;
      case "complete":
        [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.28, "triangle", 0.13, i * 0.09); });
        break;
      case "page":
        tone(260, 0.08, "triangle", 0.1);
        break;
      default:
        tone(440, 0.06, "sine", 0.1);
    }
  }

  function setEnabled(v) {
    enabled = !!v;
    if (v) resume();
  }

  ZG.Audio = {
    play: play,
    resume: resume,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; }
  };
})();
