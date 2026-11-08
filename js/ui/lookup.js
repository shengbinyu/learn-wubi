/* 字根工坊 · 查码 / 二十五键图鉴 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  var S = null;

  function cleanup() { S = null; }

  function render(root, params) {
    cleanup();
    S = { tab: (params && params.tab) || "char" };
    var page = h("div", { class: "page page-lookup" });
    var head = UI.pageHead({
      seal: "码", title: "查码", sub: "按字查 · 按码查 · 二十五键",
      actions: [UI.linkButton("去沙盒", "#/sandbox", { kind: "ghost" })]
    });
    var tabs = h("div", { class: "tabs", role: "tablist" });
    [["char", "按字查"], ["code", "按码查"], ["keys", "二十五键"]].forEach(function (t) {
      tabs.appendChild(h("button", {
        class: "tab" + (t[0] === S.tab ? " is-active" : ""), type: "button", role: "tab",
        "data-tab": t[0], onClick: function () { switchTab(t[0], tabs); }
      }, t[1]));
    });
    S.body = h("div", { class: "lookup-body" });
    page.appendChild(head);
    page.appendChild(tabs);
    page.appendChild(S.body);
    UI.mount(root, page);
    renderTab();
    fillAside();
    if (ZG.App && ZG.App.setCleanup) ZG.App.setCleanup(cleanup);
    if (params && params.q) {
      setTimeout(function () {
        if (S.tab === "char") {
          var chInput = document.querySelector("#lookupChar");
          if (chInput) { chInput.value = params.q; doCharSearch(); }
        } else if (S.tab === "code") {
          var codeInput = document.querySelector("#lookupCode");
          if (codeInput) { codeInput.value = String(params.q).toLowerCase(); doCodeSearch(); }
        }
      }, 30);
    }
  }

  function switchTab(tab, tabs) {
    S.tab = tab;
    Array.prototype.forEach.call(tabs.querySelectorAll(".tab"), function (n) {
      n.classList.toggle("is-active", n.getAttribute("data-tab") === tab);
    });
    renderTab();
  }

  function renderTab() {
    UI.clear(S.body);
    if (S.tab === "char") renderCharTab();
    else if (S.tab === "code") renderCodeTab();
    else renderKeysTab();
  }

  function renderCharTab() {
    var input = h("input", {
      class: "text-input", id: "lookupChar", type: "text", placeholder: "输入一个汉字或词组，回车",
      autocomplete: "off", spellcheck: "false", "aria-label": "按字查码"
    });
    input.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); doCharSearch(); } });
    var result = h("div", { class: "lookup-results", id: "lookupResult" });
    S.body.appendChild(h("div", { class: "lookup-grid" },
      h("div", { class: "lookup-search panel" },
        h("div", { class: "panel-body" },
          h("h2", {}, "按字查"),
          h("p", { class: "muted" }, "可以查单字、词组；支持任意中文输入法。"),
          h("div", { class: "search-row" }, input, UI.button("查", { kind: "seal", onClick: doCharSearch })),
          h("div", { class: "quick-row" }, ["明", "好", "国", "远", "你", "工"].map(function (ch) {
            return h("button", { class: "quick-char", type: "button", onClick: function () { input.value = ch; doCharSearch(); } }, ch);
          }))
        )
      ),
      result
    ));
    result.appendChild(UI.empty("输入一个字，看看它的五笔编码与拆解。", { seal: "查" }));
    setTimeout(function () { try { input.focus(); } catch (e) { /* ignore */ } }, 30);
  }

  function doCharSearch() {
    var input = document.querySelector("#lookupChar");
    var result = document.querySelector("#lookupResult");
    if (!input || !result) return;
    var text = input.value.trim();
    if (!text) return;
    UI.clear(result);
    if (ZG.Dict.has(text)) {
      result.appendChild(detailCard(text));
      if (text.length > 1 && ZG.Dict.isWord(text)) {
        var each = Array.from(text).map(function (ch) { return ZG.Dict.has(ch) ? detailRow(ch, false) : null; }).filter(Boolean);
        if (each.length) {
          result.appendChild(UI.panel("逐字", h("div", { class: "result-rows" }, each)));
        }
      }
      return;
    }
    if (/^[\u3400-\u9fff]+$/.test(text) && text.length > 1) {
      var rows = [];
      Array.from(text).forEach(function (ch) {
        rows.push(ZG.Dict.has(ch) ? detailRow(ch, false) : h("div", { class: "result-row is-missing" }, h("b", {}, ch), h("span", {}, "词库未收录")));
      });
      result.appendChild(UI.panel("逐字查", h("div", { class: "result-rows" }, rows)));
      return;
    }
    result.appendChild(UI.empty("词库未收录「" + text + "」。本游戏覆盖 6,890 个单字与约 7.6 万条词组。", { seal: "无" }));
  }

  function detailCard(text) {
    var codes = ZG.Dict.codesOf(text);
    var isWord = ZG.Dict.isWord(text);
    var card = h("div", { class: "lookup-detail panel" },
      h("div", { class: "panel-body" },
        h("div", { class: "lookup-detail-top" },
          UI.CharCard.render(text, { codes: codes }),
          h("div", { class: "lookup-detail-info" },
            h("h2", {}, isWord ? "词组" : "单字"),
            h("div", { class: "fact-line" }, h("span", {}, "编码"), UI.codeChips(codes, { text: text })),
            h("div", { class: "fact-line" }, h("span", {}, "首选"), h("code", { class: "inline-code" }, ZG.Dict.preferredCode(text) || "—")),
            h("div", { class: "fact-line" }, h("span", {}, "全码"), h("code", { class: "inline-code" }, ZG.Dict.fullCode(text) || "—")),
            h("div", { class: "lookup-actions" },
              UI.linkButton("去沙盒练", "#/sandbox?ch=" + encodeURIComponent(text), { kind: "primary" }),
              isWord ? UI.linkButton("查每个字", "#/lookup?tab=char&q=" + encodeURIComponent(text), { kind: "ghost" }) : null
            )
          )
        ),
        isWord ? null : UI.panel("拆解", UI.CharCard.decomp(text), { className: "lookup-decomp" })
      )
    );
    return card;
  }

  function detailRow(text, clickable) {
    var codes = ZG.Dict.codesOf(text);
    var row = h("div", { class: "result-row" },
      h("span", { class: "result-char" }, text),
      h("span", { class: "result-codes" }, UI.codeChips(codes, { text: text })),
      h("span", { class: "result-tag" }, UI.codeTag(ZG.Dict.preferredCode(text) || "", text))
    );
    if (clickable !== false) {
      row.classList.add("is-clickable");
      row.addEventListener("click", function () { window.location.hash = "#/sandbox?ch=" + encodeURIComponent(text); });
    }
    return row;
  }

  function renderCodeTab() {
    var input = h("input", {
      class: "text-input", id: "lookupCode", type: "text", placeholder: "输入字母编码，如 je / jeg / aawt",
      autocomplete: "off", spellcheck: "false", "maxlength": "4", "aria-label": "按码查字"
    });
    input.addEventListener("input", function () { input.value = input.value.toLowerCase().replace(/[^a-y]/g, ""); });
    input.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); doCodeSearch(); } });
    var result = h("div", { class: "lookup-results", id: "lookupResult" });
    S.body.appendChild(h("div", { class: "lookup-grid" },
      h("div", { class: "lookup-search panel" },
        h("div", { class: "panel-body" },
          h("h2", {}, "按码查"),
          h("p", { class: "muted" }, "输入 1~4 个字母。短码会同时列出以它开头的字。"),
          h("div", { class: "search-row" }, input, UI.button("查", { kind: "seal", onClick: doCodeSearch }))
        )
      ),
      result
    ));
    result.appendChild(UI.empty("输入编码，看看同码字与词组。", { seal: "码" }));
    setTimeout(function () { try { input.focus(); } catch (e) { /* ignore */ } }, 30);
  }

  function doCodeSearch() {
    var input = document.querySelector("#lookupCode");
    var result = document.querySelector("#lookupResult");
    if (!input || !result) return;
    var code = input.value.trim().toLowerCase();
    if (!/^[a-y]{1,4}$/.test(code)) { UI.toast("编码只用 a-y，1~4 位。", "error"); return; }
    UI.clear(result);
    var chars = ZG.Dict.charsForCode(code);
    var words = ZG.Dict.wordsForCode(code, 20);
    if (chars.length) {
      result.appendChild(UI.panel("同码字 · " + chars.length, h("div", { class: "result-rows" }, chars.map(function (ch) { return detailRow(ch, true); }))));
    }
    if (words.length) {
      result.appendChild(UI.panel("词组 · " + words.length, h("div", { class: "result-rows" }, words.map(function (w) { return detailRow(w, true); }))));
    }
    if (!chars.length && !words.length) {
      var pref = ZG.Dict.prefixChars(code, 20);
      if (pref.length) {
        result.appendChild(UI.panel("以 " + code + " 开头", h("div", { class: "result-rows" }, pref.map(function (p) {
          return h("div", { class: "result-row is-clickable", onClick: function () { window.location.hash = "#/sandbox?ch=" + encodeURIComponent(p.text); } },
            h("span", { class: "result-char" }, p.text),
            h("span", { class: "result-codes" }, h("code", { class: "inline-code" }, p.code)),
            h("span", { class: "result-tag" }, ZG.Dict.codeTag(p.code))
          );
        }))));
      } else {
        result.appendChild(UI.empty("没有以「" + code + "」开头的编码。", { seal: "无" }));
      }
    }
  }

  function renderKeysTab() {
    var grid = h("div", { class: "key-atlas-grid" });
    (ZG_ROOTS.zones || []).forEach(function (z) {
      var keys = String(z.keys || "").split("");
      var zone = h("section", { class: "atlas-zone " + UI.zoneClass(z.name) },
        h("header", { class: "atlas-head" }, h("b", {}, z.name + "区"), h("span", {}, z.keys)),
        h("div", { class: "atlas-row" }, keys.map(function (letter) {
          var k = ZG_ROOTS.byKey[letter];
          if (!k) return null;
          return h("button", {
            class: "atlas-card", type: "button", "data-key": letter,
            onClick: function () { showKeyDetail(k, grid); }
          },
            h("span", { class: "atlas-key" }, letter.toUpperCase()),
            h("span", { class: "atlas-name" }, k.name),
            h("small", {}, k.pos + " 位")
          );
        }))
      );
      grid.appendChild(zone);
    });
    S.body.appendChild(grid);
    S.body.appendChild(h("div", { class: "note-card key-detail-host", id: "keyDetailHost" },
      h("p", { class: "muted" }, "点一个键，看它的字根、口诀与例字。")));
    S.keyDetailHost = document.querySelector("#keyDetailHost");
  }

  function showKeyDetail(k, grid) {
    Array.prototype.forEach.call(grid.querySelectorAll(".atlas-card"), function (n) {
      n.classList.toggle("is-active", n.getAttribute("data-key") === k.key);
    });
    var host = S.keyDetailHost;
    if (!host) return;
    UI.clear(host);
    host.appendChild(h("div", { class: "key-detail" },
      h("div", { class: "key-detail-head" },
        h("span", { class: "atlas-key " + UI.zoneClass(k.zoneName) }, k.key.toUpperCase()),
        h("div", {}, h("b", {}, k.name), h("small", {}, k.zoneName + "区 · 第 " + k.pos + " 位 · 区位 " + k.code))
      ),
      h("p", { class: "tour-mnemonic" }, k.mnemonic),
      h("p", {}, h("b", {}, "字根 "), (k.roots || []).join(" · ")),
      h("p", {}, h("b", {}, "例字 "), (k.examples || []).join(" ")),
      h("div", { class: "lookup-actions" },
        UI.linkButton("去沙盒练", "#/sandbox", { kind: "primary" }),
        UI.linkButton("看这一区", "#/campaign", { kind: "ghost" })
      )
    ));
  }

  function fillAside() {
    var wrap = h("div", { class: "aside-stack" });
    var meta = ZG.Dict.meta();
    wrap.appendChild(UI.panel("词库", h("div", { class: "aside-stats" },
      h("p", {}, "单字 " + U.fmtNum(meta.charCount || 0)),
      h("p", {}, "词组 " + U.fmtNum(meta.wordCount || 0)),
      h("p", { class: "muted" }, "五笔 86 · 微软系统词库")
    )));
    wrap.appendChild(UI.panel("编码长度", h("div", { class: "aside-stats" },
      h("p", {}, "一级简码：1 键 + 空格"),
      h("p", {}, "二级简码：2 键 + 空格"),
      h("p", {}, "三级简码：3 键 + 空格"),
      h("p", {}, "全码：4 键自动上屏")
    )));
    UI.setAside(wrap);
  }

  ZG.UI.Lookup = { render: render, cleanup: cleanup };
})();
