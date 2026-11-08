/* 字根工坊 · 字卡、排版夹与拆解 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  function charCard(text, opts) {
    opts = opts || {};
    var codes = opts.codes || ZG.Dict.codesOf(text);
    var box = null;
    if (opts.mastery !== undefined) {
      box = h("span", { class: "char-mastery" }, "盒 " + opts.mastery);
    }
    var node = h("div", {
      class: "char-card" + (opts.compact ? " char-card-compact" : "") + (opts.clickable ? " is-clickable" : ""),
      role: opts.clickable ? "button" : null,
      tabindex: opts.clickable ? "0" : null
    },
      h("div", { class: "char-grid" },
        h("span", { class: "char-glyph" }, text)
      ),
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
      var row = h("div", { class: "decomp-roots" });
      (deco.roots || []).forEach(function (r) {
        var info = ZG_ROOTS && ZG_ROOTS.byKey ? ZG_ROOTS.byKey[r[1]] : null;
        row.appendChild(h("span", { class: "decomp-root " + UI.zoneClass(info ? info.zoneName : "") },
          h("b", {}, r[0]), h("small", {}, r[1].toUpperCase() + (info ? " · " + info.name : ""))
        ));
      });
      if (deco.idc) {
        var info2 = ZG_ROOTS && ZG_ROOTS.byKey ? ZG_ROOTS.byKey[deco.idc.key] : null;
        row.appendChild(h("span", { class: "decomp-root decomp-idc " + UI.zoneClass(info2 ? info2.zoneName : "") },
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
      domains.appendChild(h("div", { class: "key-domain " + UI.zoneClass(info.zoneName) },
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
