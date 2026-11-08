/* 字根工坊 · 应用启动与路由 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  var App = ZG.App = {};
  var cleanup = null;
  var booted = false;
  var demoApplied = false;

  function qs(sel) { return document.querySelector(sel); }

  function demoName() {
    try {
      var p = new URLSearchParams(window.location.search);
      return p.get("demo") || "";
    } catch (e) { return ""; }
  }

  function demoQuery() {
    var out = {};
    try {
      var p = new URLSearchParams(window.location.search);
      p.forEach(function (v, k) { out[k] = v; });
    } catch (e) { /* ignore */ }
    return out;
  }

  function parseHash() {
    var raw = String(window.location.hash || "").replace(/^#/, "");
    var q = {};
    var path = raw;
    var qi = raw.indexOf("?");
    if (qi >= 0) {
      path = raw.slice(0, qi);
      try {
        new URLSearchParams(raw.slice(qi + 1)).forEach(function (v, k) { q[k] = v; });
      } catch (e) { /* ignore */ }
    }
    if (!path) path = "/";
    var parts = path.split("/").filter(Boolean);
    return { path: path, parts: parts, params: q };
  }

  function setActiveNav(path) {
    var key = "home";
    if (/^\/sandbox/.test(path)) key = "sandbox";
    else if (/^\/campaign/.test(path)) key = "campaign";
    else if (/^\/play/.test(path)) key = "campaign";
    else if (/^\/review/.test(path)) key = "review";
    else if (/^\/lookup/.test(path)) key = "lookup";
    else if (/^\/stats/.test(path)) key = "stats";
    else if (/^\/settings/.test(path)) key = "";
    Array.prototype.forEach.call(document.querySelectorAll("#sideNav .nav-slip"), function (a) {
      var on = !!key && a.getAttribute("data-nav") === key;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  function refreshTop() {
    var st = ZG.Progress.stats();
    var xp = qs("#xpValue");
    var streak = qs("#streakValue");
    if (xp) xp.textContent = U.fmtNum(st.xp);
    if (streak) streak.textContent = st.streak;
    var xpChip = qs("#xpChip");
    if (xpChip) xpChip.title = "工坊经验 " + U.fmtNum(st.xp) + " XP";
  }

  function setCleanup(fn) {
    cleanup = typeof fn === "function" ? fn : null;
  }

  function runCleanup() {
    if (cleanup) {
      try { cleanup(); } catch (e) { /* ignore */ }
      cleanup = null;
    }
  }

  function showError(message) {
    var root = qs("#screen");
    if (!root) return;
    UI.clear(root);
    root.appendChild(h("div", { class: "page" },
      h("div", { class: "error-banner" },
        h("b", {}, "开坊失败"), h("p", {}, message || "码表没有加载。请确认 data/ 下的文件存在。"),
        h("p", { class: "muted" }, "重新生成：python tools/build_data.py --src \"C:\\WINDOWS\\InputMethod\\CHS\" --out data")
      )
    ));
  }

  function applyDemoRoute(name, q) {
    var map = {
      dashboard: "#/",
      home: "#/",
      sandbox: "#/sandbox" + (q.ch ? "?ch=" + encodeURIComponent(q.ch) : ""),
      campaign: "#/campaign",
      play: "#/play/" + encodeURIComponent(q.id || "3-1"),
      review: "#/review",
      lookup: "#/lookup" + (q.q ? "?tab=" + encodeURIComponent(q.tab || "char") + "&q=" + encodeURIComponent(q.q) : (q.tab ? "?tab=" + encodeURIComponent(q.tab) : "")),
      stats: "#/stats",
      settings: "#/settings",
      onboarding: "#/"
    };
    var target = map[name];
    if (!target) return false;
    demoApplied = true;
    if (window.location.hash !== target) window.location.hash = target;
    else route();
    if (name === "onboarding") setTimeout(function () { startOnboarding(); }, 200);
    return true;
  }

  function route() {
    runCleanup();
    var r = parseHash();
    var path = r.path;
    var parts = r.parts;
    var params = Object.assign({}, demoQuery(), r.params);
    var root = qs("#screen");
    if (!root) return;
    setActiveNav(path);
    try {
      if (path === "/" || !parts.length) {
        ZG.UI.Dashboard.render(root, params);
        document.title = "字根工坊 · 五笔活字沙盒";
      } else if (parts[0] === "sandbox") {
        ZG.UI.Sandbox.render(root, params);
        document.title = "沙盒 · 字根工坊";
      } else if (parts[0] === "campaign") {
        ZG.UI.Campaign.render(root, params);
        document.title = "卷轴 · 字根工坊";
      } else if (parts[0] === "play" && parts[1]) {
        ZG.UI.Play.render(root, Object.assign({}, params, { id: decodeURIComponent(parts[1]) }));
        document.title = "闯关 · 字根工坊";
      } else if (parts[0] === "review") {
        ZG.UI.Review.render(root, params);
        document.title = "复习 · 字根工坊";
      } else if (parts[0] === "lookup") {
        ZG.UI.Lookup.render(root, params);
        document.title = "查码 · 字根工坊";
      } else if (parts[0] === "stats") {
        ZG.UI.Stats.render(root, params);
        document.title = "统计 · 字根工坊";
      } else if (parts[0] === "settings") {
        ZG.UI.Settings.render(root, params);
        document.title = "设置 · 字根工坊";
      } else {
        window.location.hash = "#/";
        return;
      }
    } catch (err) {
      showError((err && err.message) || String(err));
      if (window.console && console.error) console.error(err && err.stack ? err.stack : err);
    }
    refreshTop();
    var screen = qs("#screen");
    if (screen) { try { screen.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    window.scrollTo(0, 0);
  }

  function startOnboarding(onDone) {
    if (!ZG.UI.Onboarding) return;
    ZG.UI.Onboarding.open({
      onDone: function (started) {
        if (typeof onDone === "function") { onDone(started); return; }
        if (started) window.location.hash = "#/play/0-1";
      }
    });
  }

  function boot() {
    if (booted) return;
    booted = true;
    try {
      ZG.Dict.init();
      if (!ZG.Dict.state.ready) {
        showError(ZG.Dict.state.error || "码表未加载");
        hideBoot();
        return;
      }
      var demo = demoName();
      ZG.Progress.init({ demo: !!demo });
      var st = ZG.Progress.get();
      if (ZG.Audio) ZG.Audio.setEnabled(st.settings.sound !== false);
      document.documentElement.classList.toggle("reduce-motion", !!st.settings.reduceMotion || U.prefersReducedMotion());
      refreshTop();

      var settingsBtn = qs("#settingsBtn");
      if (settingsBtn) settingsBtn.addEventListener("click", function () { window.location.hash = "#/settings"; });
      window.addEventListener("hashchange", route);

      if (demo && applyDemoRoute(demo, demoQuery())) {
        hideBoot();
      } else {
        route();
        hideBoot();
      }
      if (!demo && st.flags && !st.flags.onboarded) {
        setTimeout(function () { startOnboarding(); }, 650);
      }
    } catch (err) {
      showError((err && err.message) || String(err));
      hideBoot();
      if (window.console && console.error) console.error(err && err.stack ? err.stack : err);
    }
  }

  function hideBoot() {
    var bootEl = qs("#boot");
    if (!bootEl) return;
    bootEl.classList.add("is-hidden");
    bootEl.setAttribute("aria-hidden", "true");
    setTimeout(function () { if (bootEl && bootEl.parentNode) bootEl.parentNode.removeChild(bootEl); }, 500);
  }

  App.refreshTop = refreshTop;
  App.setCleanup = setCleanup;
  App.startOnboarding = startOnboarding;
  App.route = route;
  App.boot = boot;
  App.demoName = demoName;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
