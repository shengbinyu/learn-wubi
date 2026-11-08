/* 字根工坊 · 本地进度、复习与养成 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;

  var KEY = "zg.v1";
  var BACKUP = "zg.v1.bak";
  var INTERVALS = [0, 10 * 60 * 1000, 24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000, 21 * 24 * 60 * 60 * 1000];

  var DECOR = [
    { id: "brush", name: "笔架", at: 5, seal: "笔", desc: "搁一支用旧的狼毫。" },
    { id: "ink", name: "墨锭", at: 10, seal: "墨", desc: "松烟墨，写字前先磨三圈。" },
    { id: "weight", name: "镇纸", at: 18, seal: "镇", desc: "黄铜镇纸，压住纸角。" },
    { id: "tea", name: "茶盏", at: 28, seal: "茶", desc: "练字久了，茶还温着。" },
    { id: "lantern", name: "灯笼", at: 40, seal: "灯", desc: "夜里开坊，挂一盏灯。" },
    { id: "orchid", name: "兰草", at: 55, seal: "兰", desc: "窗边一盆兰，叶子很静。" },
    { id: "screen", name: "屏风", at: 70, seal: "屏", desc: "四扇小屏风，隔开外面的喧闹。" },
    { id: "plaque", name: "匾额", at: 90, seal: "匾", desc: "“字根工坊”四个字，终于挂正了。" }
  ];

  var ACHIEVEMENTS = [
    { id: "keys25", title: "识遍二十五键", desc: "在字根或区位题中按过全部 25 个键。", seal: "键",
      check: function (s) { return Object.keys(s.keyStats).filter(function (k) { return s.keyStats[k].ok > 0; }).length >= 25; } },
    { id: "keyname", title: "键名全通", desc: "完成卷二的两关键名关。", seal: "名",
      check: function (s) { return (s.stars["2-1"] || 0) > 0 && (s.stars["2-2"] || 0) > 0; } },
    { id: "combo10", title: "十连击", desc: "一次连续打对 10 个字。", seal: "连",
      check: function (s) { return (s.totals.bestCombo || 0) >= 10; } },
    { id: "perfect", title: "百发百中", desc: "以 100% 首试正确率完成一关。", seal: "准",
      check: function (s) { return (s.totals.perfectLevels || 0) >= 1; } },
    { id: "c2_50", title: "五十简码", desc: "50 个二级简码字进入复习盒。", seal: "简",
      check: function (s) {
        if (!ZG.Dict || !ZG.Dict.state.ready) return false;
        return Object.keys(s.chars).filter(function (ch) {
          return s.chars[ch].box >= 2 && ZG.Dict.rankOf(ch) === 2;
        }).length >= 50;
      } },
    { id: "tray20", title: "拼字二十", desc: "在沙盒拼字台完成 20 次拼字。", seal: "拼",
      check: function (s) { return (s.totals.tray || 0) >= 20; } },
    { id: "streak3", title: "三日不辍", desc: "连续三天完成每日一练。", seal: "勤",
      check: function (s) { return (s.daily.streak || 0) >= 3; } },
    { id: "chars1000", title: "千字斩", desc: "累计打对 1,000 个字。", seal: "千",
      check: function (s) { return (s.totals.okChars || 0) >= 1000; } },
    { id: "allLevels", title: "全卷通关", desc: "完成全部 33 关。", seal: "通",
      check: function (s) { return Object.keys(s.stars).filter(function (k) { return s.stars[k] > 0; }).length >= 33; } },
    { id: "flawless", title: "零失误", desc: "一关之内没有按错任何一键。", seal: "净",
      check: function (s) { return (s.totals.flawless || 0) >= 1; } }
  ];

  var state = fresh();
  var demo = false;
  var saveTimer = null;

  function fresh() {
    return {
      v: 1,
      createdAt: Date.now(),
      lastActive: Date.now(),
      xp: 0,
      stars: {},
      chars: {},
      words: {},
      keyStats: {},
      daily: { date: "", done: false, streak: 0, best: 0 },
      decor: [],
      achievements: {},
      totals: {
        keys: 0, okKeys: 0, chars: 0, words: 0, okChars: 0, okWords: 0,
        ms: 0, bestCombo: 0, perfectLevels: 0, flawless: 0, tray: 0,
        days: {}
      },
      settings: { sound: true, hints: true, autoSpace: false, reduceMotion: false },
      wrongQueue: [],
      recent: [],
      flags: { onboarded: false },
      lastLevel: ""
    };
  }

  function normalize(obj) {
    var f = fresh();
    if (!obj || typeof obj !== "object") return f;
    var s = {};
    Object.keys(f).forEach(function (k) { s[k] = obj[k] === undefined ? f[k] : obj[k]; });
    s.v = 1;
    s.settings = Object.assign({}, f.settings, obj.settings || {});
    s.totals = Object.assign({}, f.totals, obj.totals || {});
    if (!s.totals.days || typeof s.totals.days !== "object") s.totals.days = {};
    s.daily = Object.assign({}, f.daily, obj.daily || {});
    s.flags = Object.assign({}, f.flags, obj.flags || {});
    if (!s.chars || typeof s.chars !== "object") s.chars = {};
    if (!s.words || typeof s.words !== "object") s.words = {};
    if (!s.keyStats || typeof s.keyStats !== "object") s.keyStats = {};
    if (!Array.isArray(s.decor)) s.decor = [];
    if (!Array.isArray(s.wrongQueue)) s.wrongQueue = [];
    if (!Array.isArray(s.recent)) s.recent = [];
    if (!s.achievements || typeof s.achievements !== "object") s.achievements = {};
    if (!s.stars || typeof s.stars !== "object") s.stars = {};
    return s;
  }

  function load() {
    if (!U.storage) { state = fresh(); return; }
    var raw = null;
    try { raw = U.storage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) { state = fresh(); return; }
    try {
      var obj = JSON.parse(raw);
      if (!obj || obj.v !== 1) throw new Error("unsupported version");
      state = normalize(obj);
    } catch (err) {
      try { U.storage.setItem(BACKUP, raw); } catch (e2) { /* ignore */ }
      state = fresh();
      save(true);
    }
  }

  function save(force) {
    if (demo || !U.storage) return;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    var write = function () {
      try {
        state.lastActive = Date.now();
        U.storage.setItem(KEY, JSON.stringify(state));
      } catch (e) { /* quota or private mode: keep playing in memory */ }
    };
    if (force) write(); else saveTimer = setTimeout(write, 220);
  }

  function entryFor(bucket, text) {
    var store = bucket === "word" ? state.words : state.chars;
    if (!store[text]) store[text] = { box: 0, due: 0, seen: 0, ok: 0, bad: 0, ms: 0, last: 0 };
    return store[text];
  }

  function today() { return U.todayKey(); }

  function trimDays() {
    var keys = Object.keys(state.totals.days).sort();
    if (keys.length > 400) {
      keys.slice(0, keys.length - 400).forEach(function (k) { delete state.totals.days[k]; });
    }
  }

  function record(text, kind, ok, ms, extra) {
    if (!text) return null;
    var e = entryFor(kind, text);
    ms = Math.max(0, ms || 0);
    e.seen += 1;
    e.last = Date.now();
    e.ms += ms;
    if (ok) { e.ok += 1; e.box = Math.min(5, (e.box || 0) + 1); e.due = Date.now() + INTERVALS[e.box]; }
    else { e.bad += 1; e.box = 1; e.due = Date.now() + INTERVALS[1]; }

    if (kind === "word") {
      state.totals.words += 1;
      if (ok) state.totals.okWords += 1;
    } else {
      state.totals.chars += 1;
      state.totals.ms += ms;
      if (ok) state.totals.okChars += 1;
      state.recent = state.recent.filter(function (r) { return r.text !== text; });
      state.recent.unshift({ text: text, at: Date.now(), box: e.box });
      state.recent = state.recent.slice(0, 12);
    }

    if (ok) {
      state.wrongQueue = state.wrongQueue.filter(function (w) { return !(w.text === text && w.kind === kind); });
    } else {
      state.wrongQueue = state.wrongQueue.filter(function (w) { return !(w.text === text && w.kind === kind); });
      state.wrongQueue.unshift({ text: text, kind: kind, at: Date.now(), code: (ZG.Dict && ZG.Dict.preferredCode(text)) || "" });
      state.wrongQueue = state.wrongQueue.slice(0, 120);
    }

    var day = today();
    state.totals.days[day] = (state.totals.days[day] || 0) + 1;
    trimDays();
    state.lastActive = Date.now();
    save();
    return { entry: e, box: e.box, due: e.due, extra: extra || null };
  }

  function recordKey(key, ok, ms) {
    if (!key) return;
    if (!state.keyStats[key]) state.keyStats[key] = { seen: 0, ok: 0, bad: 0 };
    state.keyStats[key].seen += 1;
    if (ok) { state.keyStats[key].ok += 1; state.totals.okKeys += 1; }
    else state.keyStats[key].bad += 1;
    state.totals.keys += 1;
    if (ms) state.totals.ms += ms;
    state.lastActive = Date.now();
    save();
  }

  function bump(key, n) {
    state.totals[key] = (state.totals[key] || 0) + (n === undefined ? 1 : n);
    save();
  }

  function markLevel(id, stars) {
    var prev = state.stars[id] || 0;
    if (stars > prev) state.stars[id] = stars;
    state.lastLevel = id;
    var gained = syncDecor();
    save(true);
    return { prev: prev, stars: state.stars[id], improved: stars > prev, decor: gained };
  }

  function addXp(n) {
    if (!n) return;
    state.xp = Math.max(0, (state.xp || 0) + n);
    save();
  }

  function completeDaily() {
    var t = today();
    if (state.daily.date === t && state.daily.done) return false;
    var yesterday = U.dateKeyOffset(-1);
    state.daily.streak = state.daily.date === yesterday ? (state.daily.streak || 0) + 1 : 1;
    state.daily.date = t;
    state.daily.done = true;
    state.daily.best = Math.max(state.daily.best || 0, state.daily.streak);
    save(true);
    return true;
  }

  function due(limit) {
    limit = limit || 20;
    var now = Date.now();
    var out = [];
    Object.keys(state.chars).forEach(function (text) {
      var e = state.chars[text];
      if (e.due && e.due <= now && e.box < 5) out.push({ text: text, kind: "char", box: e.box, due: e.due, codes: ZG.Dict.codesOf(text) });
    });
    Object.keys(state.words).forEach(function (text) {
      var e = state.words[text];
      if (e.due && e.due <= now && e.box < 5) out.push({ text: text, kind: "word", box: e.box, due: e.due, codes: ZG.Dict.codesOf(text) });
    });
    out.sort(function (a, b) { return a.due - b.due; });
    return out.slice(0, limit);
  }

  function nextDueAt() {
    var now = Date.now();
    var min = Infinity;
    Object.keys(state.chars).forEach(function (t) {
      var e = state.chars[t];
      if (e.box < 5 && e.due > now && e.due < min) min = e.due;
    });
    Object.keys(state.words).forEach(function (t) {
      var e = state.words[t];
      if (e.box < 5 && e.due > now && e.due < min) min = e.due;
    });
    return min === Infinity ? null : min;
  }

  function totalStars() {
    return Object.keys(state.stars).reduce(function (n, k) { return n + (state.stars[k] || 0); }, 0);
  }

  function syncDecor() {
    var stars = totalStars();
    var gained = [];
    DECOR.forEach(function (d) {
      if (stars >= d.at && state.decor.indexOf(d.id) === -1) {
        state.decor.push(d.id);
        gained.push(d);
      }
    });
    return gained;
  }

  function checkAchievements() {
    var gained = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (state.achievements[a.id]) return;
      var ok = false;
      try { ok = a.check(state); } catch (e) { ok = false; }
      if (ok) {
        state.achievements[a.id] = Date.now();
        gained.push(a);
      }
    });
    if (gained.length) save();
    return gained;
  }

  function stats() {
    var chars = Object.keys(state.chars);
    var words = Object.keys(state.words);
    var mastered = chars.filter(function (c) { return state.chars[c].box >= 5; }).length +
      words.filter(function (w) { return state.words[w].box >= 5; }).length;
    var totalSeen = state.totals.chars + state.totals.words;
    var totalOk = state.totals.okChars + state.totals.okWords;
    var accuracy = totalSeen ? totalOk / totalSeen : 0;
    var avgSpeed = state.totals.okChars && state.totals.ms ? state.totals.okChars / (state.totals.ms / 60000) : 0;
    var stars = totalStars();
    var done = Object.keys(state.stars).filter(function (k) { return state.stars[k] > 0; }).length;
    return {
      xp: state.xp,
      stars: stars,
      levelsDone: done,
      levelsTotal: (window.ZG_LESSON_DEFS || []).length || 33,
      mastered: mastered,
      learnedChars: chars.length,
      learnedWords: words.length,
      totalSeen: totalSeen,
      totalOk: totalOk,
      accuracy: accuracy,
      avgSpeed: avgSpeed,
      streak: state.daily.streak || 0,
      bestStreak: state.daily.best || 0,
      dailyDone: state.daily.date === today() && state.daily.done,
      due: due(99).length,
      bestCombo: state.totals.bestCombo || 0,
      days: state.totals.days,
      todayCount: state.totals.days[today()] || 0,
      wrongCount: state.wrongQueue.length,
      decorCount: state.decor.length,
      achievementCount: Object.keys(state.achievements).length,
      totalCharsTyped: state.totals.chars
    };
  }

  function setSetting(k, v) {
    state.settings[k] = v;
    save(true);
  }

  function markOnboarded() {
    state.flags.onboarded = true;
    save(true);
  }

  function exportJSON() {
    return JSON.stringify({ app: "zigen-gongfang", version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
  }

  function importJSON(str) {
    var parsed = JSON.parse(str);
    var data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || data.v !== 1) throw new Error("存档版本不匹配");
    state = normalize(data);
    syncDecor();
    save(true);
    return stats();
  }

  function reset() {
    if (U.storage) {
      try {
        var raw = U.storage.getItem(KEY);
        if (raw) U.storage.setItem(BACKUP, raw);
      } catch (e) { /* ignore */ }
    }
    state = fresh();
    save(true);
  }

  function seedDemo() {
    demo = true;
    state = fresh();
    var t = today();
    state.xp = 1280;
    state.daily = { date: t, done: true, streak: 7, best: 12 };
    state.stars = {
      "0-1": 1, "0-2": 2, "0-3": 1, "1-1": 3, "1-2": 2, "1-3": 2, "1-4": 1,
      "1-5": 1, "1-6": 2, "2-1": 3, "2-2": 2, "2-3": 2, "2-4": 1, "3-1": 2,
      "3-2": 1, "3-3": 1, "4-1": 1, "4-6": 1, "5-1": 1
    };
    ["明", "好", "只", "国", "远", "你", "林", "森", "品", "工", "王", "这", "的", "我", "是", "中", "同", "民", "发", "经"].forEach(function (ch, i) {
      state.chars[ch] = { box: i < 8 ? 5 : 3, due: Date.now() + (i + 1) * 60000, seen: 6 + i, ok: 5 + i, bad: i % 3, ms: 900 * (i + 1), last: Date.now() - i * 60000 };
    });
    state.words["工作"] = { box: 4, due: Date.now() + 86400000, seen: 5, ok: 5, bad: 0, ms: 4200, last: Date.now() };
    state.words["中国"] = { box: 3, due: Date.now() - 60000, seen: 4, ok: 3, bad: 1, ms: 3800, last: Date.now() };
    state.keyStats = {};
    ["g", "f", "d", "s", "a", "h", "j", "k", "l", "m", "t", "r", "e", "w", "q", "y", "u", "i", "o", "p", "n", "b", "v", "c", "x"].forEach(function (k) {
      state.keyStats[k] = { seen: 4, ok: 3, bad: 1 };
    });
    state.totals = {
      keys: 100, okKeys: 92, chars: 420, words: 30, okChars: 380, okWords: 26,
      ms: 380000, bestCombo: 14, perfectLevels: 2, flawless: 1, tray: 7,
      days: {}
    };
    for (var i = 0; i < 84; i++) {
      if (i % 3 === 0) state.totals.days[U.dateKeyOffset(-i)] = (i % 7) + 1;
    }
    state.decor = ["brush", "ink", "weight", "tea"];
    ["keys25", "keyname", "combo10", "perfect", "c2_50", "streak3"].forEach(function (id) { state.achievements[id] = Date.now(); });
    state.recent = ["明", "好", "只", "国", "远", "你", "林", "森"].map(function (ch, i) { return { text: ch, at: Date.now() - i * 1000, box: 5 }; });
    state.wrongQueue = [{ text: "远", kind: "char", at: Date.now(), code: "fqpv" }];
    state.flags.onboarded = true;
  }

  function init(opts) {
    opts = opts || {};
    if (opts.demo) seedDemo(); else load();
    syncDecor();
    checkAchievements();
    return state;
  }

  ZG.Progress = {
    init: init,
    get: function () { return state; },
    isDemo: function () { return demo; },
    save: save,
    record: record,
    recordKey: recordKey,
    bump: bump,
    markLevel: markLevel,
    addXp: addXp,
    completeDaily: completeDaily,
    due: due,
    nextDueAt: nextDueAt,
    stats: stats,
    today: today,
    setSetting: setSetting,
    markOnboarded: markOnboarded,
    syncDecor: syncDecor,
    checkAchievements: checkAchievements,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: reset,
    decorDefs: DECOR,
    achievementDefs: ACHIEVEMENTS,
    DEMO: seedDemo
  };
})();
