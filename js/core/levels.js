/* 字根工坊 · 关卡展开、采样与星级 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;

  var C1_ORDER = "一地在要工上是中国同和的有人我主产不为这民了发以经".split("");
  var KEYNAME_ORDER = "王土大木工目日口田山禾白月人金言立水火之已子女又纟".split("");

  var IDC_MATRIX = {
    "横": { "左右": "g", "上下": "f", "杂合": "d" },
    "竖": { "左右": "h", "上下": "j", "杂合": "k" },
    "撇": { "左右": "t", "上下": "r", "杂合": "e" },
    "捺": { "左右": "y", "上下": "u", "杂合": "i" },
    "折": { "左右": "n", "上下": "b", "杂合": "v" }
  };

  var IDC_EXAMPLES = [
    { text: "只", full: "kwu", stroke: "捺", structure: "上下" },
    { text: "国", full: "lgyi", stroke: "捺", structure: "杂合" },
    { text: "远", full: "fqpv", stroke: "折", structure: "杂合" },
    { text: "你", full: "wqiy", stroke: "捺", structure: "左右" },
    { text: "林", full: "ssy", stroke: "捺", structure: "左右" },
    { text: "森", full: "sssu", stroke: "捺", structure: "上下" },
    { text: "品", full: "kkkf", stroke: "横", structure: "上下" },
    { text: "明", full: "jeg", stroke: "横", structure: "左右" }
  ];

  var FALLBACK_PASSAGES = [
    "晨光落在纸上，墨还没有干。学徒把木活字一枚一枚排好，先认字根，再拆字，最后把编码敲出来。打对了，纸上就留下一个清楚的字。",
    "中午的工坊很安静。日、月、水、火这些字根，在指尖慢慢熟起来。先求准确，再求快；错了就退一格，重新排一次，字总会排顺。",
    "暮色上来，灯笼亮了。把这一天学的字连成句子：五笔不是背口诀，是把字形拆开，再装回键位。慢慢打，字会自己长出来。"
  ];

  function defs() { return window.ZG_LESSON_DEFS || []; }
  function get(id) { return defs().filter(function (d) { return d.id === id; })[0] || null; }
  function next(id) {
    var list = defs();
    var i = list.findIndex(function (d) { return d.id === id; });
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }
  function chapters() { return window.ZG_CHAPTERS || []; }
  function zoneKeys(name) {
    return (window.ZG_ROOTS ? ZG_ROOTS.keys : []).filter(function (k) { return k.zoneName === name || k.zone === name; });
  }

  function rngFor(def) {
    return U.mulberry32(U.hash(def.id + "|" + (def.seed || "v1")));
  }

  function pickUnique(list, count, keyFn, rng) {
    var seen = {};
    var pool = list.filter(function (x) {
      var k = keyFn(x);
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    return U.shuffle(pool, rng).slice(0, count);
  }

  function quizRootItems(def) {
    var rng = rngFor(def);
    var keys = def.zoneName ? zoneKeys(def.zoneName) : (ZG_ROOTS ? ZG_ROOTS.keys : []);
    var flat = [];
    keys.forEach(function (k) {
      (k.roots || []).forEach(function (root) {
        flat.push({ root: root, key: k.key, keyName: k.name, zoneName: k.zoneName, mnemonic: k.mnemonic });
      });
    });
    var picked = pickUnique(flat, def.count || 12, function (x) { return x.root + "|" + x.key; }, rng);
    return picked.map(function (x) {
      return { kind: "key", prompt: x.root, answer: x.key, keyName: x.keyName, zoneName: x.zoneName, mnemonic: x.mnemonic, code: x.key };
    });
  }

  function quizZoneItems(def) {
    var rng = rngFor(def);
    var zones = ZG_ROOTS ? ZG_ROOTS.zones : [];
    var pairs = [];
    zones.forEach(function (z) {
      var letters = typeof z.keys === "string" ? z.keys.split("") : (z.keys || []);
      letters.forEach(function (letter, i) {
        pairs.push({ zoneName: z.name, pos: i + 1, answer: letter, key: letter });
      });
    });
    var picked = pickUnique(pairs, def.count || 12, function (p) { return p.answer; }, rng);
    return picked.map(function (p) {
      return {
        kind: "key",
        prompt: p.zoneName + "区 · 第 " + p.pos + " 位",
        answer: p.answer,
        zoneName: p.zoneName,
        pos: p.pos,
        code: p.answer
      };
    });
  }

  function keyIntroItems(def) {
    var rng = rngFor(def);
    var keys = pickUnique(ZG_ROOTS ? ZG_ROOTS.keys : [], def.count || 5, function (k) { return k.key; }, rng);
    return keys.map(function (k) {
      return {
        kind: "key",
        prompt: "键名字「" + k.name + "」在哪个键？",
        answer: k.key,
        keyName: k.name,
        zoneName: k.zoneName,
        mnemonic: k.mnemonic,
        code: k.key
      };
    });
  }

  function orderedPool(name) {
    if (name === "c1") {
      return C1_ORDER.filter(function (ch) { return ZG.Dict.has(ch); });
    }
    if (name === "keynames") {
      return KEYNAME_ORDER.filter(function (ch) { return ZG.Dict.has(ch); });
    }
    var pools = ZG.Dict.pools ? ZG.Dict.pools() : {};
    return pools[name] || [];
  }

  function codeItems(def) {
    var rng = rngFor(def);
    if (def.pool === "idc") {
      return IDC_EXAMPLES.map(function (x) {
        return {
          kind: "idc",
          text: x.text,
          full: x.full,
          codes: [x.full],
          strictLen: x.full.length,
          idcKey: x.full[x.full.length - 1],
          stroke: x.stroke,
          structure: x.structure,
          tag: "识别码"
        };
      });
    }

    var pool = orderedPool(def.pool);
    var count = def.count || 12;
    var part = def.part || 0;
    var chosen;
    if (def.pool === "c2" || def.pool === "c3" || def.pool === "full4") {
      chosen = U.shuffle(pool, rng).slice(part * count, part * count + count);
      if (chosen.length < count) {
        chosen = chosen.concat(U.shuffle(pool, rng).slice(0, count - chosen.length));
      }
    } else {
      chosen = U.shuffle(pool, rng).slice(0, count);
    }

    return chosen.map(function (text) {
      var codes = ZG.Dict.codesOf(text);
      var strict = def.strictLen || 0;
      if (def.pool === "words2" || def.pool === "words3" || def.pool === "words4" || def.pool === "words5") strict = 4;
      if (def.pool === "c2") strict = 2;
      if (def.pool === "c3") strict = 3;
      if (def.pool === "full4") strict = 4;
      if (def.pool === "c1") strict = 1;
      if (def.pool === "keynames") strict = 4;
      var exact = codes.filter(function (c) { return c.length === strict; });
      return {
        kind: "code",
        text: text,
        codes: codes,
        strictLen: strict,
        tag: ZG.Dict.codeTag((exact[0] || codes[0] || "")),
        full: ZG.Dict.fullCode(text)
      };
    });
  }

  function passageItems(def) {
    var data = window.ZG_PASSAGES || [];
    var entry = data[def.passageIndex || 0];
    var text = (entry && entry.text) || FALLBACK_PASSAGES[def.passageIndex || 0] || FALLBACK_PASSAGES[0];
    return [{ kind: "passage", text: text, passageIndex: def.passageIndex || 0 }];
  }

  function expand(def) {
    if (!def) return [];
    if (def.kind === "quizRoot") return quizRootItems(def);
    if (def.kind === "quizZone") return quizZoneItems(def);
    if (def.kind === "keyIntro") return keyIntroItems(def);
    if (def.kind === "code") return codeItems(def);
    if (def.kind === "passage") return passageItems(def);
    if (def.kind === "tour" || def.kind === "idcTutorial") return [];
    return [];
  }

  function stars(result, def) {
    if (!result || !result.total) {
      return def && (def.kind === "tour" || def.kind === "idcTutorial") ? 1 : 0;
    }
    var acc = result.correct / result.total;
    var pace = result.ms / result.total;
    var speed = result.ms > 0 ? result.correct / (result.ms / 60000) : 0;
    var p2 = def && def.kind === "passage" ? speed >= 20 : pace <= 3000;
    var p3 = def && def.kind === "passage" ? speed >= 30 : pace <= 2000;
    if (acc < 0.8) return 0;
    if (acc >= 0.98 && p3) return 3;
    if (acc >= 0.92 && p2) return 2;
    return 1;
  }

  function totalStars() {
    var st = ZG.Progress ? ZG.Progress.get().stars : {};
    return Object.keys(st).reduce(function (n, k) { return n + (st[k] || 0); }, 0);
  }

  ZG.Levels = {
    defs: defs,
    get: get,
    next: next,
    chapters: chapters,
    expand: expand,
    stars: stars,
    zoneKeys: zoneKeys,
    totalStars: totalStars,
    IDC_MATRIX: IDC_MATRIX,
    IDC_EXAMPLES: IDC_EXAMPLES,
    C1_ORDER: C1_ORDER,
    KEYNAME_ORDER: KEYNAME_ORDER,
    FALLBACK_PASSAGES: FALLBACK_PASSAGES
  };
})();
