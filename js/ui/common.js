/* 字根工坊 · 共享 UI 组件 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI = ZG.UI || {};

  var h = U.el;

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  function seal(text, tone) {
    return h("span", { class: "seal" + (tone ? " seal-" + tone : ""), "aria-hidden": "true" }, text);
  }

  function pageHead(opts) {
    var actions = h("div", { class: "page-actions" });
    (opts.actions || []).forEach(function (a) { if (a) actions.appendChild(a); });
    return h("header", { class: "page-head" },
      h("div", { class: "page-head-main" },
        opts.seal ? seal(opts.seal, opts.sealTone) : null,
        h("div", {},
          h("h1", { class: "page-title" }, opts.title || ""),
          opts.sub ? h("p", { class: "page-sub" }, opts.sub) : null
        )
      ),
      actions
    );
  }

  function panel(title, body, opts) {
    opts = opts || {};
    var head = null;
    if (title) {
      head = h("header", { class: "panel-head" },
        h("h2", { class: "panel-title" }, title),
        opts.extra || null
      );
    }
    return h("section", { class: "panel" + (opts.className ? " " + opts.className : "") },
      head, h("div", { class: "panel-body" }, body)
    );
  }

  function card(klass, children) {
    var node = h("div", { class: "card" + (klass ? " " + klass : "") });
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c !== null && c !== undefined) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function button(label, opts) {
    opts = opts || {};
    var attrs = {
      class: "btn" + (opts.kind ? " btn-" + opts.kind : "") + (opts.className ? " " + opts.className : ""),
      type: "button"
    };
    if (opts.disabled) attrs.disabled = "disabled";
    if (opts.title) attrs.title = opts.title;
    if (opts.ariaLabel) attrs["aria-label"] = opts.ariaLabel;
    var node = h("button", attrs, label);
    if (opts.onClick) node.addEventListener("click", opts.onClick);
    return node;
  }

  function linkButton(label, href, opts) {
    opts = opts || {};
    return h("a", {
      class: "btn" + (opts.kind ? " btn-" + opts.kind : "") + (opts.className ? " " + opts.className : ""),
      href: href
    }, label);
  }

  function chip(text, tone, opts) {
    opts = opts || {};
    var node = h("span", { class: "chip" + (tone ? " chip-" + tone : "") + (opts.className ? " " + opts.className : "") }, text);
    if (opts.title) node.title = opts.title;
    return node;
  }

  function codeTag(code, text) {
    if (!code) return "";
    if (text && ZG.Dict.fullCode(text) === code) return "全码";
    return ZG.Dict.codeTag(code);
  }

  function codeChips(codes, opts) {
    opts = opts || {};
    var wrap = h("span", { class: "code-chips" });
    var list = (codes || []).slice().sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); });
    if (!list.length) return wrap;
    var limit = opts.limit || 4;
    list.slice(0, limit).forEach(function (c) {
      var isTarget = opts.target && c === opts.target;
      var tag = codeTag(c, opts.text);
      wrap.appendChild(h("span", {
        class: "chip-code code-len-" + c.length + (isTarget ? " is-target" : ""),
        title: tag
      }, c, h("small", {}, tag)));
    });
    if (list.length > limit) wrap.appendChild(h("span", { class: "chip-code is-more" }, "+" + (list.length - limit)));
    return wrap;
  }

  function starsEl(n, max) {
    max = max || 3;
    var wrap = h("span", { class: "stars", "aria-label": "星级 " + n + " / " + max });
    for (var i = 1; i <= max; i++) {
      wrap.appendChild(h("span", { class: "star" + (i <= n ? " is-on" : "") , "aria-hidden": "true" }, "★"));
    }
    return wrap;
  }

  function zoneClass(name) {
    var map = { "横": "heng", "竖": "shu", "撇": "pie", "捺": "na", "折": "zhe" };
    return "zone-" + (map[name] || "ink");
  }

  function zoneNameOf(key) {
    var k = ZG_ROOTS && ZG_ROOTS.byKey ? ZG_ROOTS.byKey[key] : null;
    return k ? k.zoneName : "";
  }

  function zonesLegend() {
    var wrap = h("div", { class: "zones-legend" });
    (ZG_ROOTS ? ZG_ROOTS.zones : []).forEach(function (z) {
      wrap.appendChild(h("span", { class: "legend-item " + zoneClass(z.name) },
        h("b", {}, z.name + "区"), h("span", {}, z.keys || "")
      ));
    });
    return wrap;
  }

  function stat(label, value, opts) {
    opts = opts || {};
    return h("div", { class: "stat" + (opts.className ? " " + opts.className : "") },
      h("span", { class: "stat-k" }, label),
      h("b", { class: "stat-v" }, value),
      opts.sub ? h("span", { class: "stat-sub" }, opts.sub) : null
    );
  }

  function progressBar(value, max, opts) {
    opts = opts || {};
    var pct = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
    return h("div", {
      class: "progress" + (opts.className ? " " + opts.className : ""),
      role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(max), "aria-valuenow": String(value)
    }, h("span", { class: "progress-fill", style: "width:" + pct.toFixed(1) + "%" }));
  }

  function empty(text, opts) {
    opts = opts || {};
    return h("div", { class: "empty" },
      h("div", { class: "empty-seal" }, opts.seal || "空"),
      h("p", {}, text),
      opts.action || null
    );
  }

  function toast(message, kind, ms) {
    var layer = qs("#toastLayer");
    if (!layer) return;
    var node = h("div", { class: "toast" + (kind ? " toast-" + kind : "") }, message);
    layer.appendChild(node);
    requestAnimationFrame(function () { node.classList.add("is-in"); });
    setTimeout(function () {
      node.classList.remove("is-in");
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 300);
    }, ms || 2400);
  }

  var overlayHandle = null;

  function openOverlay(content, opts) {
    opts = opts || {};
    var layer = qs("#overlayLayer");
    if (!layer) return null;
    clear(layer);
    layer.hidden = false;
    var backdrop = h("div", { class: "overlay-backdrop" });
    var modal = h("div", {
      class: "modal" + (opts.wide ? " modal-wide" : "") + (opts.className ? " " + opts.className : ""),
      role: "dialog", "aria-modal": "true", "aria-label": opts.label || "对话框"
    });
    if (opts.title) {
      modal.appendChild(h("header", { class: "modal-head" },
        h("h2", {}, opts.title),
        h("button", { class: "icon-btn modal-close", type: "button", "aria-label": "关闭" }, "×")
      ));
    }
    modal.appendChild(h("div", { class: "modal-body" }, content));
    layer.appendChild(backdrop);
    layer.appendChild(modal);

    function close() {
      layer.hidden = true;
      clear(layer);
      document.removeEventListener("keydown", onKey);
      overlayHandle = null;
      if (opts.onClose) opts.onClose();
    }
    function onKey(ev) {
      if (ev.key === "Escape") { ev.preventDefault(); close(); }
    }
    document.addEventListener("keydown", onKey);
    backdrop.addEventListener("click", close);
    var closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlayHandle = { close: close, modal: modal, layer: layer };
    var focusable = modal.querySelector("button, [href], input, select, textarea, [tabindex]");
    if (focusable) setTimeout(function () { try { focusable.focus(); } catch (e) { /* ignore */ } }, 30);
    return overlayHandle;
  }

  function closeOverlay() {
    if (overlayHandle) overlayHandle.close();
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var body = h("div", { class: "confirm" },
        h("p", {}, opts.message || "确定吗？"),
        h("div", { class: "confirm-actions" },
          button(opts.cancel || "取消", { kind: "ghost", onClick: function () { handle.close(); resolve(false); } }),
          button(opts.ok || "确定", { kind: opts.danger ? "seal" : "primary", onClick: function () { handle.close(); resolve(true); } })
        )
      );
      var handle = openOverlay(body, { title: opts.title || "确认", onClose: function () { resolve(false); } });
    });
  }

  function download(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || "application/json;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = h("a", { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
      return true;
    } catch (e) { return false; }
  }

  function pct(x, digits) {
    return (x * 100).toFixed(digits === undefined ? 0 : digits) + "%";
  }

  function timeAgo(ts) {
    if (!ts) return "—";
    var d = Math.max(0, Date.now() - ts);
    var m = Math.floor(d / 60000);
    if (m < 1) return "刚刚";
    if (m < 60) return m + " 分钟前";
    var hr = Math.floor(m / 60);
    if (hr < 24) return hr + " 小时前";
    return Math.floor(hr / 24) + " 天前";
  }

  function nextDueText(ts) {
    if (!ts) return "暂无";
    var d = Math.max(0, ts - Date.now());
    var m = Math.ceil(d / 60000);
    if (m <= 1) return "即将到期";
    if (m < 60) return m + " 分钟后";
    var hr = Math.ceil(m / 60);
    if (hr < 24) return hr + " 小时后";
    return Math.ceil(hr / 24) + " 天后";
  }

  function setAside(node) {
    var aside = qs("#aside");
    if (!aside) return;
    clear(aside);
    if (!node) { aside.classList.add("is-empty"); return; }
    aside.classList.remove("is-empty");
    aside.appendChild(node);
  }

  function mount(root, node) {
    clear(root);
    root.appendChild(node);
    root.scrollTop = 0;
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
  }

  function keyName(key) {
    var k = ZG_ROOTS && ZG_ROOTS.byKey ? ZG_ROOTS.byKey[key] : null;
    return k ? k.name : key;
  }

  function errorBanner(message) {
    return h("div", { class: "error-banner", role: "alert" }, h("b", {}, "出了点问题："), message);
  }

  UI.h = h;
  UI.clear = clear;
  UI.seal = seal;
  UI.pageHead = pageHead;
  UI.panel = panel;
  UI.card = card;
  UI.button = button;
  UI.linkButton = linkButton;
  UI.chip = chip;
  UI.codeChips = codeChips;
  UI.codeTag = codeTag;
  UI.starsEl = starsEl;
  UI.zoneClass = zoneClass;
  UI.zoneNameOf = zoneNameOf;
  UI.zonesLegend = zonesLegend;
  UI.stat = stat;
  UI.progressBar = progressBar;
  UI.empty = empty;
  UI.toast = toast;
  UI.openOverlay = openOverlay;
  UI.closeOverlay = closeOverlay;
  UI.confirmDialog = confirmDialog;
  UI.download = download;
  UI.pct = pct;
  UI.timeAgo = timeAgo;
  UI.nextDueText = nextDueText;
  UI.setAside = setAside;
  UI.mount = mount;
  UI.keyName = keyName;
  UI.errorBanner = errorBanner;
})();
