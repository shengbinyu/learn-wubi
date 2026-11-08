/* 字根工坊 · 字卡、排版夹与拆解 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;
  var SVG_NS = "http://www.w3.org/2000/svg";

  function svgNode(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function rect(x, y, w, height, root, late) {
    return { x: x, y: y, w: w, h: height, root: root, late: !!late };
  }

  function frac(box, fx, fy, fw, fh, root, late) {
    return rect(box.x + box.w * fx, box.y + box.h * fy, box.w * fw, box.h * fh, root, late);
  }

  function ring(root, box, inset) {
    return { ring: true, root: root, x: box.x, y: box.y, w: box.w, h: box.h, inset: inset === undefined ? 0.12 : inset };
  }

  var inkCache = {};
  function inkBox(text) {
    if (inkCache[text]) return inkCache[text];
    try {
      var canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      var family = getComputedStyle(document.documentElement).getPropertyValue("--font-kai").trim() || "STKaiti, KaiTi, serif";
      ctx.clearRect(0, 0, 100, 100);
      ctx.font = "74px " + family;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000";
      ctx.fillText(text, 50, 50);
      var data = ctx.getImageData(0, 0, 100, 100).data;
      var minX = 100, minY = 100, maxX = -1, maxY = -1;
      for (var y = 0; y < 100; y++) {
        for (var x = 0; x < 100; x++) {
          if (data[(y * 100 + x) * 4 + 3] > 18) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < minX || maxY < minY) return null;
      var box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      inkCache[text] = box;
      return box;
    } catch (e) {
      return null;
    }
  }

  /* 整字分色：同一个字模裁成若干结构区，每区仍显示原字的笔画。
     不是逐笔画分割，而是按左右/上下/包围的字形骨架近似。 */
  var ENCLOSING = {
    "囗": 1, "口": 1, "门": 1, "冂": 1, "匚": 1, "勹": 1, "几": 1,
    "辶": 1, "广": 1, "疒": 1, "尸": 1, "弋": 1, "戈": 1, "气": 1
  };
  var LEFT_RADICAL = {
    "讠": 1, "亻": 1, "氵": 1, "扌": 1, "纟": 1, "木": 1, "王": 1, "日": 1,
    "月": 1, "女": 1, "口": 1, "土": 1, "石": 1, "车": 1, "钅": 1, "贝": 1,
    "马": 1, "鱼": 1, "鸟": 1, "虫": 1, "礻": 1, "衤": 1, "言": 1, "金": 1,
    "食": 1, "饣": 1, "目": 1, "田": 1, "山": 1, "弓": 1, "子": 1, "耳": 1,
    "足": 1, "身": 1, "酉": 1, "里": 1, "黑": 1, "鼓": 1
  };
  var TOP_RADICAL = { "宀": 1, "艹": 1, "竹": 1, "⺮": 1, "雨": 1, "穴": 1, "冖": 1, "⺌": 1, "广": 1, "疒": 1, "尸": 1, "气": 1 };

  function findEnclosure(roots) {
    for (var i = 0; i < roots.length; i++) {
      if (ENCLOSING[roots[i][0]]) return i;
    }
    return -1;
  }

  function specialLayout(text, roots, n, box) {
    switch (text) {
      case "想": /* 木/目 在上，心在下 */
        return [frac(box, 0, 0, 0.5, 0.5, 0), frac(box, 0.5, 0, 0.5, 0.5, 1), frac(box, 0, 0.5, 1, 0.5, 2)];
      case "花": /* 艹 在上，亻/匕 在下 */
        return [frac(box, 0, 0, 1, 0.4, 0), frac(box, 0, 0.4, 0.5, 0.6, 1), frac(box, 0.5, 0.4, 0.5, 0.6, 2)];
      case "动":
      case "别":
      case "以": /* 左二右一 */
        return [frac(box, 0, 0, 0.48, 0.5, 0), frac(box, 0, 0.5, 0.48, 0.5, 1), frac(box, 0.48, 0, 0.52, 1, 2)];
      case "跑":
      case "路": /* 左二右二 */
        return [frac(box, 0, 0, 0.46, 0.5, 0), frac(box, 0, 0.5, 0.46, 0.5, 1),
          frac(box, 0.46, 0, 0.54, 0.5, 2), frac(box, 0.46, 0.5, 0.54, 0.5, 3)];
      case "国": /* 囗 外框；王 在内；丶 在右下 */
        return [ring(0, box, 0.18), frac(box, 0.18, 0.18, 0.64, 0.64, 1),
          frac(box, 0.70, 0.66, 0.18, 0.18, 2, true)];
      case "主": /* 丶 在上；王 在下 */
        return [frac(box, 0, 0, 1, 1, 1), frac(box, 0.42, 0.02, 0.16, 0.16, 0, true)];
      case "术": /* 木 为主；丶 在右下 */
        return [frac(box, 0, 0, 1, 1, 0), frac(box, 0.62, 0.62, 0.16, 0.16, 1, true)];
      case "为": /* 两丶一力 */
        return [frac(box, 0, 0, 1, 1, 1), frac(box, 0.16, 0.04, 0.14, 0.14, 0, true),
          frac(box, 0.70, 0.70, 0.14, 0.14, 2, true)];
      case "笔": /* 竹 在上，毛 在下三叠 */
        return [frac(box, 0, 0, 1, 0.42, 0), frac(box, 0, 0.42, 1, 0.193, 1),
          frac(box, 0, 0.613, 1, 0.193, 2), frac(box, 0, 0.806, 1, 0.194, 3)];
      default:
        return null;
    }
  }

  /* 左偏旁的实际宽度差别很大：讠/亻/氵很窄，日/月/女王接近一半。
     用固定 38% 会把“说”的丷左点切进左区，因此按首字根给一个近似宽度。 */
  var LEFT_WIDTH = {
    "讠": 0.28, "亻": 0.28, "氵": 0.30, "扌": 0.32, "纟": 0.30, "忄": 0.30,
    "土": 0.32, "王": 0.34, "木": 0.38, "日": 0.46, "月": 0.46, "口": 0.36,
    "女": 0.46, "石": 0.40, "车": 0.40, "钅": 0.32, "贝": 0.38, "马": 0.38,
    "鱼": 0.40, "鸟": 0.42, "虫": 0.38, "礻": 0.32, "衤": 0.34, "言": 0.40,
    "金": 0.40, "禾": 0.40, "白": 0.42, "田": 0.44, "目": 0.42, "山": 0.36,
    "火": 0.36, "立": 0.34, "足": 0.38, "走": 0.38, "弓": 0.34, "子": 0.34
  };

  function leftRatio(glyph, n) {
    if (LEFT_WIDTH[glyph]) return LEFT_WIDTH[glyph];
    return n >= 3 ? 0.38 : 0.5;
  }

  function layoutFor(text, deco, box) {
    var roots = deco.roots || [];
    var n = roots.length;
    if (!n) return null;
    if (n === 1) return [frac(box, 0, 0, 1, 1, 0)];

    var special = specialLayout(text, roots, n, box);
    if (special) return special;

    var structure = deco.idc && deco.idc.structure;
    if (!structure) {
      var outer = findEnclosure(roots);
      /* “说”这类字含口，但口只是右部构件，不能因此判成包围结构。
         只有首字根是包围件时才优先按包围处理。 */
      if (outer === 0) structure = "杂合";
      else if (LEFT_RADICAL[roots[0][0]]) structure = "左右";
      else if (TOP_RADICAL[roots[0][0]]) structure = "上下";
      else if (outer >= 0) structure = "杂合";
      else return null;
    }

    var out = [];
    var i;
    if (structure === "左右") {
      var left = leftRatio(roots[0][0], n);
      var right = 1 - left;
      if (n === 2) {
        out.push(frac(box, 0, 0, left, 1, 0), frac(box, left, 0, right, 1, 1));
      } else if (n === 3) {
        out.push(frac(box, 0, 0, left, 1, 0), frac(box, left, 0, right, 0.5, 1), frac(box, left, 0.5, right, 0.5, 2));
      } else {
        out.push(frac(box, 0, 0, left, 1, 0));
        for (i = 1; i < n; i++) out.push(frac(box, left, (i - 1) / (n - 1), right, 1 / (n - 1), i));
      }
      return out;
    }

    if (structure === "上下") {
      if (n === 2) {
        out.push(frac(box, 0, 0, 1, 0.5, 0), frac(box, 0, 0.5, 1, 0.5, 1));
      } else {
        for (i = 0; i < n; i++) out.push(frac(box, 0, i / n, 1, 1 / n, i));
      }
      return out;
    }

    /* 杂合：包围字根只取外缘一圈，内区留空给其余字根。 */
    var outer = findEnclosure(roots);
    if (outer >= 0) {
      /* 口/囗/门/几 这类方框笔画较厚，环要更宽；辶/广/尸 只取一条边，环窄一些。 */
      var thin = { "辶": 1, "廴": 1, "广": 1, "疒": 1, "尸": 1, "弋": 1, "戈": 1, "气": 1 };
      var inset = thin[roots[outer][0]] ? 0.10 : 0.18;
      out.push(ring(outer, box, inset));
      var rest = [];
      for (i = 0; i < n; i++) if (i !== outer) rest.push(i);
      if (rest.length === 1) {
        out.push(frac(box, inset, inset, 1 - inset * 2, 1 - inset * 2, rest[0]));
      } else if (rest.length === 2) {
        out.push(frac(box, inset, inset, 1 - inset * 2, (1 - inset * 2) / 2, rest[0]));
        out.push(frac(box, inset, 0.5, 1 - inset * 2, (1 - inset * 2) / 2, rest[1]));
      } else {
        for (i = 0; i < rest.length; i++) {
          out.push(frac(box, inset, inset + i * (1 - inset * 2) / rest.length,
            1 - inset * 2, (1 - inset * 2) / rest.length, rest[i]));
        }
      }
      return out;
    }

    if (n === 2) {
      out.push(frac(box, 0, 0, 1, 0.5, 0), frac(box, 0, 0.5, 1, 0.5, 1));
      return out;
    }
    if (n === 3) {
      for (i = 0; i < 3; i++) out.push(frac(box, 0, i / 3, 1, 1 / 3, i));
      return out;
    }
    return null;
  }


  function pathBox(d) {
    var nums = String(d).match(/-?\d+(?:\.\d+)?/g) || [];
    if (nums.length < 2) return null;
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (var i = 0; i + 1 < nums.length; i += 2) {
      var x = parseFloat(nums[i]);
      var y = parseFloat(nums[i + 1]);
      if (x < x1) x1 = x;
      if (x > x2) x2 = x;
      if (y < y1) y1 = y;
      if (y > y2) y2 = y;
    }
    return { x: x1, y: y1, x2: x2, y2: y2 };
  }

  function boxOverlap(a, b) {
    var w = Math.min(a.x2, b.x + b.w) - Math.max(a.x, b.x);
    var h = Math.min(a.y2, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }

  function regionOverlap(bb, r) {
    if (!r.ring) return boxOverlap(bb, r);
    var outer = boxOverlap(bb, r);
    if (!outer) return 0;
    var inset = r.inset || 0;
    var inner = {
      x: r.x + r.w * inset, y: r.y + r.h * inset,
      w: r.w * (1 - inset * 2), h: r.h * (1 - inset * 2)
    };
    var innerHit = boxOverlap(bb, inner);
    /* 字根笔画从内区起笔时，不要因为外框的 bbox 而抢到包围字根。 */
    var cx = (bb.x + bb.x2) / 2, cy = (bb.y + bb.y2) / 2;
    if (cx > inner.x && cx < inner.x + inner.w && cy > inner.y && cy < inner.y + inner.h) {
      return Math.max(0, innerHit - inner.w * inner.h * 0.35);
    }
    return Math.max(0, outer - innerHit * 0.9);
  }

  /* 有 hanzi-writer 笔画数据时，按“整笔”上色：笔画不被边界切断。
     笔画坐标是 1024²，必须先把所有笔画的联合墨迹盒归一到 100²，
     再和版面区域比较；否则会像早期版本一样整体偏移。 */
  function strokeGlyph(text, deco) {
    var data = window.HANZI_STROKES && window.HANZI_STROKES[text];
    if (!data || !data.strokes || !data.strokes.length) return null;
    var boxes = data.strokes.map(pathBox);
    var pb = null;
    boxes.forEach(function (b) {
      if (!b) return;
      if (!pb) pb = { x: b.x, y: b.y, x2: b.x2, y2: b.y2 };
      else {
        pb.x = Math.min(pb.x, b.x); pb.y = Math.min(pb.y, b.y);
        pb.x2 = Math.max(pb.x2, b.x2); pb.y2 = Math.max(pb.y2, b.y2);
      }
    });
    if (!pb) return null;
    var w = Math.max(1, pb.x2 - pb.x), h = Math.max(1, pb.y2 - pb.y);
    var scale = 88 / Math.max(w, h);
    var tx = 6 + (88 - w * scale) / 2 - pb.x * scale;
    /* hanzi-writer 的 y 轴向上；SVG 向下，这里翻转一次。 */
    var ty = 6 + (88 - h * scale) / 2 + pb.y2 * scale;

    var box = { x: 0, y: 0, w: 100, h: 100 };
    var regions = layoutFor(text, deco, box);
    if (!regions) return null;

    function mapped(bb) {
      return {
        x: bb.x * scale + tx, x2: bb.x2 * scale + tx,
        y: ty - bb.y2 * scale, y2: ty - bb.y * scale
      };
    }

    var svg = svgNode("svg", {
      class: "char-glyph-svg is-stroke",
      viewBox: "0 0 100 100",
      role: "img",
      "aria-label": "整字按字根分色：" + (deco.roots || []).map(function (r) { return r[0]; }).join("、")
    });
    var g = svgNode("g", {
      transform: "translate(" + tx.toFixed(4) + " " + ty.toFixed(4) + ") scale(" + scale.toFixed(6) + " " + (-scale).toFixed(6) + ")"
    });
    data.strokes.forEach(function (d, i) {
      var bb = boxes[i] ? mapped(boxes[i]) : null;
      var best = 0, bestScore = -1;
      if (bb) {
        regions.forEach(function (r, idx) {
          var score = regionOverlap(bb, r);
          if (score > bestScore) { bestScore = score; best = idx; }
        });
      }
      var root = regions[best] ? regions[best].root : 0;
      var p = svgNode("path", { d: d, class: "glyph-stroke" });
      p.style.fill = "var(--root-c" + ((root % 4) + 1) + ")";
      g.appendChild(p);
    });
    svg.appendChild(g);
    return svg;
  }

  function coloredGlyph(text, deco) {
    var strokeVersion = strokeGlyph(text, deco);
    if (strokeVersion) return strokeVersion;
    var box = inkBox(text);
    if (!box) return null;
    var regions = layoutFor(text, deco, box);
    if (!regions) return null;
    var uid = U.uid("glyph");
    var svg = svgNode("svg", {
      class: "char-glyph-svg",
      viewBox: "0 0 100 100",
      role: "img",
      "aria-label": "整字按字根分色：" + (deco.roots || []).map(function (r) { return r[0]; }).join("、")
    });
    var defs = svgNode("defs");
    var layers = [];
    regions.forEach(function (r, idx) {
      var id = uid + "-" + idx;
      var cp = svgNode("clipPath", { id: id, clipPathUnits: "userSpaceOnUse" });
      if (r.ring) {
        var ix = r.x + r.w * r.inset;
        var iy = r.y + r.h * r.inset;
        var iw = r.w * (1 - r.inset * 2);
        var ih = r.h * (1 - r.inset * 2);
        cp.appendChild(svgNode("path", {
          d: "M" + r.x + " " + r.y + " H" + (r.x + r.w) + " V" + (r.y + r.h) + " H" + r.x +
            " Z M" + ix + " " + iy + " V" + (iy + ih) + " H" + (ix + iw) + " V" + iy + " Z",
          "clip-rule": "evenodd"
        }));
      } else {
        cp.appendChild(svgNode("rect", {
          x: r.x, y: r.y, width: r.w, height: r.h
        }));
      }
      defs.appendChild(cp);
      layers.push({ region: r, clip: id });
    });
    svg.appendChild(defs);
    var ordered = layers.filter(function (l) { return !l.region.late; })
      .concat(layers.filter(function (l) { return l.region.late; }));
    ordered.forEach(function (layer) {
      var g = svgNode("g", { "clip-path": "url(#" + layer.clip + ")" });
      var t = svgNode("text", {
        x: 50, y: 50, "text-anchor": "middle", "dominant-baseline": "central",
        "font-size": 74, class: "glyph-char"
      });
      t.style.fill = "var(--root-c" + ((layer.region.root % 4) + 1) + ")";
      t.textContent = text;
      g.appendChild(t);
      svg.appendChild(g);
    });
    return svg;
  }

  function charCard(text, opts) {
    opts = opts || {};
    var codes = opts.codes || ZG.Dict.codesOf(text);
    var box = null;
    if (opts.mastery !== undefined) {
      box = h("span", { class: "char-mastery" }, "盒 " + opts.mastery);
    }
    var deco = window.ZG_DECOMPOSITIONS && ZG_DECOMPOSITIONS[text];
    var glyph = (!opts.compact && deco) ? coloredGlyph(text, deco) : null;
    if (!glyph) glyph = h("span", { class: "char-glyph" }, text);
    var node = h("div", {
      class: "char-card" + (opts.compact ? " char-card-compact" : "") + (opts.clickable ? " is-clickable" : ""),
      role: opts.clickable ? "button" : null,
      tabindex: opts.clickable ? "0" : null
    },
      h("div", { class: "char-grid" }, glyph),
      h("div", { class: "char-meta" },
        h("span", { class: "char-text" }, text),
        codes && codes.length ? UI.codeChips(codes, { target: opts.target, text: text }) : h("span", { class: "muted" }, "词库未收录"),
        box
      )
    );
    if (opts.clickable && opts.onClick) {
      node.addEventListener("click", opts.onClick);
      node.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); opts.onClick(ev); } });
    }
    return node;
  }

  function stick(code, buffer, opts) {
    opts = opts || {};
    var len = Math.max(code ? code.length : 0, (buffer || "").length, opts.slots || 0, 1);
    var wrap = h("div", { class: "code-stick", "aria-label": "编码进度" });
    for (var i = 0; i < len; i++) {
      var ch = (buffer || "")[i] || "";
      var cls = "code-slot";
      if (ch) cls += " is-filled";
      if (!opts.done && i === (buffer || "").length) cls += " is-next";
      if (opts.error) cls += " is-error";
      wrap.appendChild(h("span", { class: cls },
        h("span", { class: "code-slot-char" }, ch || "·"),
        h("span", { class: "code-slot-index" }, String(i + 1))
      ));
    }
    if (opts.showSpace && !opts.done) {
      wrap.appendChild(h("span", { class: "code-space " + ((buffer || "").length === len ? "is-next" : "") }, "空格"));
    }
    return wrap;
  }

  function hintFor(text, buffer, strictLen) {
    var codes = ZG.Dict.codesOf(text);
    if (strictLen) {
      var exact = codes.filter(function (c) { return c.length === strictLen; });
      if (exact.length) codes = exact;
    }
    var starts = codes.filter(function (c) { return c.slice(0, (buffer || "").length) === (buffer || ""); });
    var code = starts[0] || codes[0] || "";
    if (code.length <= (buffer || "").length) return { done: true, key: " ", keyName: "空格", code: code };
    var key = code[(buffer || "").length];
    var info = ZG_ROOTS && ZG_ROOTS.byKey ? ZG_ROOTS.byKey[key] : null;
    return { done: false, key: key, keyName: info ? info.name : key, zoneName: info ? info.zoneName : "", code: code };
  }

  function decompBlock(text, opts) {
    opts = opts || {};
    var deco = window.ZG_DECOMPOSITIONS && ZG_DECOMPOSITIONS[text];
    var codes = ZG.Dict.codesOf(text);
    if (deco) {
      var row = h("div", { class: "decomp-roots", "aria-label": "拆解字根，按顺序着色" });
      (deco.roots || []).forEach(function (r, idx) {
        var info = ZG_ROOTS && ZG_ROOTS.byKey ? ZG_ROOTS.byKey[r[1]] : null;
        var order = idx + 1;
        var color = ((idx % 4) + 1);
        var title = "第 " + order + " 个字根：" + r[0] + " · " + String(r[1]).toUpperCase() +
          (info ? " 键（" + info.name + "）" : "");
        row.appendChild(h("span", {
          class: "decomp-root root-c" + color,
          title: title,
          "data-root-order": order
        },
          h("span", { class: "root-order", "aria-hidden": "true" }, String(order)),
          h("b", {}, r[0]),
          h("small", {}, r[1].toUpperCase() + (info ? " · " + info.name : ""))
        ));
      });
      if (deco.idc) {
        var info2 = ZG_ROOTS && ZG_ROOTS.byKey ? ZG_ROOTS.byKey[deco.idc.key] : null;
        row.appendChild(h("span", {
          class: "decomp-root decomp-idc",
          title: "识别码：" + deco.idc.key.toUpperCase() +
            (info2 ? "（" + info2.name + "键）" : "") + " · " + deco.idc.stroke + " · " + deco.idc.structure
        },
          h("b", {}, "识别码"), h("small", {}, deco.idc.key.toUpperCase() + " · " + deco.idc.stroke + " · " + deco.idc.structure)
        ));
      }
      return h("div", { class: "decomp" }, row, deco.note ? h("p", { class: "decomp-note" }, deco.note) : null,
        h("p", { class: "decomp-code" }, "全码 ", h("code", {}, deco.full || ZG.Dict.fullCode(text) || ""))
      );
    }
    var code = ZG.Dict.preferredCode(text) || "";
    var domains = h("div", { class: "key-domains" });
    code.split("").forEach(function (letter, i) {
      var info = ZG_ROOTS && ZG_ROOTS.byKey ? ZG_ROOTS.byKey[letter] : null;
      if (!info) return;
      domains.appendChild(h("div", { class: "key-domain root-c" + ((i % 4) + 1) },
        h("span", { class: "domain-key" }, letter.toUpperCase()),
        h("span", { class: "domain-name" }, info.name),
        h("span", { class: "domain-roots" }, (info.roots || []).slice(0, 4).join(" ")),
        h("small", {}, "第 " + (i + 1) + " 码")
      ));
    });
    var wrap = h("div", { class: "decomp" }, domains,
      h("p", { class: "decomp-note" }, "这个词/字还没有精选拆解；先看每一码落在哪个键、键上有哪些字根。")
    );
    if (!opts.hideCodes) wrap.appendChild(h("p", { class: "decomp-code" }, "编码 ", h("code", {}, code)));
    return wrap;
  }

  function nextKeyHint(text, buffer, strictLen) {
    var hint = hintFor(text, buffer, strictLen);
    var node = h("div", { class: "hint-line", "aria-live": "polite" });
    if (hint.done) {
      node.appendChild(h("span", { class: "hint-key" }, "空格"));
      node.appendChild(h("span", { class: "hint-text" }, "上屏"));
    } else {
      node.appendChild(h("span", { class: "hint-key " + UI.zoneClass(hint.zoneName) }, hint.key.toUpperCase()));
      node.appendChild(h("span", { class: "hint-text" }, (hint.keyName || "") + "键 · " + (hint.zoneName || "") + "区"));
      node.appendChild(h("span", { class: "hint-code" }, "…" + hint.code));
    }
    return node;
  }

  UI.CharCard = {
    render: charCard,
    stick: stick,
    hintFor: hintFor,
    hintLine: nextKeyHint,
    decomp: decompBlock
  };
})();
