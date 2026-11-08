/* 字根工坊 · 活字盘键盘 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  var ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  function create(opts) {
    opts = opts || {};
    var byKey = (ZG_ROOTS && ZG_ROOTS.byKey) || {};
    var root = h("div", { class: "keyboard" + (opts.compact ? " keyboard-compact" : ""), role: "group", "aria-label": "五笔活字盘" });
    var zoneBar = h("div", { class: "keyboard-zones" });
    (ZG_ROOTS ? ZG_ROOTS.zones : []).forEach(function (z) {
      zoneBar.appendChild(h("span", { class: "keyboard-zone " + UI.zoneClass(z.name) },
        h("b", {}, z.name + "区"), h("span", {}, z.keys)
      ));
    });
    root.appendChild(zoneBar);

    var keyNodes = {};
    var rows = h("div", { class: "keyboard-rows" });
    ROWS.forEach(function (letters, ri) {
      var row = h("div", { class: "keyboard-row" });
      if (ri === 2) row.appendChild(h("span", { class: "key-spacer", "aria-hidden": "true" }));
      letters.split("").forEach(function (letter) {
        var info = byKey[letter] || {};
        var node = h("button", {
          class: "type-key " + UI.zoneClass(info.zoneName || ""),
          type: "button",
          "data-key": letter,
          "aria-label": letter.toUpperCase() + (info.name ? " " + info.name : "") + (info.code ? " 区位 " + info.code : ""),
          title: (info.name || "") + (info.mnemonic ? " · " + info.mnemonic : "")
        },
          h("span", { class: "key-letter" }, letter.toUpperCase()),
          h("span", { class: "key-name" }, info.name || ""),
          h("span", { class: "key-code" }, info.code ? String(info.code) : "")
        );
        node.addEventListener("click", function () {
          if (node.disabled) return;
          if (opts.onVirtual) opts.onVirtual(letter);
        });
        keyNodes[letter] = node;
        row.appendChild(node);
      });
      rows.appendChild(row);
    });
    root.appendChild(rows);

    function setHint(letter) {
      Object.keys(keyNodes).forEach(function (k) { keyNodes[k].classList.toggle("is-hint", k === letter); });
    }
    function clearHint() {
      Object.keys(keyNodes).forEach(function (k) { keyNodes[k].classList.remove("is-hint"); });
    }
    function flash(letter, kind) {
      var node = keyNodes[letter];
      if (!node) return;
      node.classList.remove("is-flash-ok", "is-flash-bad");
      void node.offsetWidth;
      node.classList.add(kind === "bad" ? "is-flash-bad" : "is-flash-ok");
      setTimeout(function () { node.classList.remove("is-flash-ok", "is-flash-bad"); }, 420);
    }
    function setActive(letter) {
      Object.keys(keyNodes).forEach(function (k) { keyNodes[k].classList.toggle("is-active", k === letter); });
    }
    function setEnabled(v) {
      Object.keys(keyNodes).forEach(function (k) { keyNodes[k].disabled = !v; });
      root.classList.toggle("is-disabled", !v);
    }

    return {
      root: root,
      setHint: setHint,
      clearHint: clearHint,
      flash: flash,
      setActive: setActive,
      setEnabled: setEnabled,
      keys: keyNodes
    };
  }

  function attachTyping(handlers) {
    function onKeyDown(ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var tag = (ev.target && ev.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (ev.target && ev.target.isContentEditable)) return;
      var key = ev.key;
      if (ev.repeat) return;
      if (/^[a-zA-Z]$/.test(key)) {
        ev.preventDefault();
        handlers.onLetter(key.toLowerCase(), ev);
        return;
      }
      if (key === " ") { ev.preventDefault(); handlers.onSpace && handlers.onSpace(ev); return; }
      if (key === "Backspace") { ev.preventDefault(); handlers.onBackspace && handlers.onBackspace(ev); return; }
      if (key === "Escape") { handlers.onEscape && handlers.onEscape(ev); return; }
    }
    document.addEventListener("keydown", onKeyDown, true);
    function detach() { document.removeEventListener("keydown", onKeyDown, true); }
    return detach;
  }

  UI.Keyboard = { create: create, attachTyping: attachTyping };
})();
