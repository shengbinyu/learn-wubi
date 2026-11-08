/* 字根工坊 · 码表索引 */
(function () {
  var ZG = window.ZG = window.ZG || {};

  var state = {
    ready: false,
    error: "",
    chars: {},
    words: {},
    metaChars: {},
    metaWords: {},
    codeIndex: new Map(),
    codesSorted: [],
    wordEntries: [],
    wordsByLen: { 2: [], 3: [], 4: [], 5: [] },
    pools: null,
    prefixCache: new Map(),
    wordCodeCache: new Map()
  };

  function codeTag(code) {
    if (code.length === 1) return "一级简码";
    if (code.length === 2) return "二级简码";
    if (code.length === 3) return "三级简码";
    return "全码";
  }

  function init() {
    var rawChars = window.WUBI_CHARS;
    var rawWords = window.WUBI_WORDS;
    if (!rawChars || !rawChars.chars) {
      state.error = "码表未载入：请确认 data/wubi86-chars.js 已生成。";
      state.ready = false;
      return state;
    }
    state.chars = rawChars.chars;
    state.metaChars = rawChars.meta || {};
    state.words = (rawWords && rawWords.words) || {};
    state.metaWords = (rawWords && rawWords.meta) || {};

    var c1 = [], c2 = [], c3 = [], c4 = [], full4 = [];
    var codes = [];
    var codeSeen = new Set();

    Object.keys(state.chars).sort().forEach(function (ch) {
      var list = state.chars[ch].slice().sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); });
      state.chars[ch] = list;
      var min = list[0].length;
      if (min === 1) c1.push(ch);
      else if (min === 2) c2.push(ch);
      else if (min === 3) c3.push(ch);
      else c4.push(ch);
      if (min <= 3 && list.some(function (c) { return c.length === 4; })) full4.push(ch);

      list.forEach(function (code) {
        var arr = state.codeIndex.get(code);
        if (!arr) { arr = []; state.codeIndex.set(code, arr); }
        if (arr.indexOf(ch) === -1) arr.push(ch);
        if (!codeSeen.has(code)) { codeSeen.add(code); codes.push(code); }
      });
    });

    state.codesSorted = codes.sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); });

    state.wordEntries = Object.keys(state.words).sort().map(function (w) {
      return { text: w, code: state.words[w] };
    });

    var wordLen = {};
    state.wordEntries.forEach(function (entry) {
      var w = entry.text;
      if (w.length < 2 || w.length > 9) return;
      var learnable = true;
      for (var i = 0; i < w.length; i++) {
        var charCodes = state.chars[w[i]];
        if (!charCodes) { learnable = false; break; }
        var minLen = 99;
        for (var k = 0; k < charCodes.length; k++) {
          if (charCodes[k].length < minLen) minLen = charCodes[k].length;
        }
        if (minLen > 3) { learnable = false; break; }
      }
      if (!learnable || entry.code.length !== 4) return;
      var bucket = w.length >= 5 ? 5 : w.length;
      if (!state.wordsByLen[bucket]) state.wordsByLen[bucket] = [];
      state.wordsByLen[bucket].push(w);
      wordLen[w.length] = (wordLen[w.length] || 0) + 1;
    });

    state.pools = {
      c1: c1, c2: c2, c3: c3, c4: c4, full4: full4,
      words2: state.wordsByLen[2] || [],
      words3: state.wordsByLen[3] || [],
      words4: state.wordsByLen[4] || [],
      words5: state.wordsByLen[5] || []
    };
    state.ready = true;
    return state;
  }

  function codesOf(text) {
    if (state.chars[text]) return state.chars[text];
    if (state.words[text]) return [state.words[text]];
    return [];
  }

  function has(text) { return !!state.chars[text] || !!state.words[text]; }
  function isChar(text) { return !!state.chars[text]; }
  function isWord(text) { return !!state.words[text]; }
  function codeOfWord(text) { return state.words[text] || null; }
  function rankOf(text) {
    var list = codesOf(text);
    if (!list.length) return 99;
    var min = 99;
    list.forEach(function (c) { if (c.length < min) min = c.length; });
    return min;
  }
  function preferredCode(text) {
    var list = codesOf(text);
    return list.length ? list[0] : null;
  }
  function fullCode(text) {
    var list = codesOf(text);
    if (!list.length) return null;
    var best = list[0];
    list.forEach(function (c) { if (c.length > best.length) best = c; });
    return best;
  }
  function codesAtLength(text, len) {
    return codesOf(text).filter(function (c) { return c.length === len; });
  }
  function charsForCode(code) { return (state.codeIndex.get(code) || []).slice(); }

  function prefixChars(prefix, limit) {
    limit = limit || 12;
    if (!prefix) return [];
    var cached = state.prefixCache.get(prefix);
    if (cached) return cached.slice(0, limit);
    var out = [];
    var seen = new Set();
    for (var i = 0; i < state.codesSorted.length; i++) {
      var code = state.codesSorted[i];
      if (code.slice(0, prefix.length) !== prefix) continue;
      var list = state.codeIndex.get(code) || [];
      for (var j = 0; j < list.length; j++) {
        if (!seen.has(list[j])) { seen.add(list[j]); out.push({ text: list[j], code: code }); }
        if (out.length >= limit) break;
      }
      if (out.length >= limit) break;
    }
    state.prefixCache.set(prefix, out);
    return out.slice(0, limit);
  }

  function wordsForCode(code, limit) {
    limit = limit || 20;
    if (state.wordCodeCache.has(code)) return state.wordCodeCache.get(code).slice(0, limit);
    var out = [];
    for (var i = 0; i < state.wordEntries.length && out.length < limit; i++) {
      if (state.wordEntries[i].code === code) out.push(state.wordEntries[i].text);
    }
    state.wordCodeCache.set(code, out);
    return out.slice(0, limit);
  }

  function allWords() { return state.wordEntries; }

  function pools() { return state.pools || { c1: [], c2: [], c3: [], c4: [], full4: [], words2: [], words3: [], words4: [], words5: [] }; }

  function meta() {
    return {
      ready: state.ready,
      error: state.error,
      chars: state.metaChars,
      words: state.metaWords,
      charCount: Object.keys(state.chars).length,
      wordCount: state.wordEntries.length,
      poolCounts: state.pools ? {
        c1: state.pools.c1.length, c2: state.pools.c2.length, c3: state.pools.c3.length,
        c4: state.pools.c4.length, full4: state.pools.full4.length
      } : null
    };
  }

  ZG.Dict = {
    init: init,
    state: state,
    codesOf: codesOf,
    has: has,
    isChar: isChar,
    isWord: isWord,
    codeOfWord: codeOfWord,
    rankOf: rankOf,
    preferredCode: preferredCode,
    fullCode: fullCode,
    codesAtLength: codesAtLength,
    charsForCode: charsForCode,
    prefixChars: prefixChars,
    wordsForCode: wordsForCode,
    allWords: allWords,
    pools: pools,
    meta: meta,
    codeTag: codeTag
  };
})();
