/* 字根工坊 · 设置 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  function cleanup() { /* no listeners */ }

  function row(label, desc, control) {
    return h("div", { class: "setting-row" },
      h("div", { class: "setting-label" }, h("b", {}, label), desc ? h("p", { class: "setting-desc" }, desc) : null),
      h("div", { class: "setting-control" }, control)
    );
  }

  function toggle(on, onChange, label) {
    var btn = h("button", {
      class: "switch" + (on ? " is-on" : ""), type: "button", role: "switch", "aria-checked": on ? "true" : "false",
      "aria-label": label || "", onClick: function () {
        on = !on;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-checked", on ? "true" : "false");
        onChange(on);
      }
    }, h("span", { class: "switch-knob" }));
    return btn;
  }

  function render(root, params) {
    var state = ZG.Progress.get();
    var demo = ZG.Progress.isDemo();
    var st = ZG.Progress.stats();

    var list = h("div", { class: "settings-list" },
      row("音效", "木鱼、落字、印章；全部由浏览器合成。", toggle(!!state.settings.sound, function (v) {
        ZG.Progress.setSetting("sound", v);
        if (ZG.Audio) ZG.Audio.setEnabled(v);
      }, "音效")),
      row("字根提示", "练习时提示下一个键对应的字根与区位。", toggle(!!state.settings.hints, function (v) {
        ZG.Progress.setSetting("hints", v);
      }, "字根提示")),
      row("简码自动上屏", "开启后，一级/二级/三级简码打完即上屏，不必按空格。", toggle(!!state.settings.autoSpace, function (v) {
        ZG.Progress.setSetting("autoSpace", v);
      }, "简码自动上屏")),
      row("减少动效", "关闭拓印、落字与印章动画。", toggle(!!state.settings.reduceMotion, function (v) {
        ZG.Progress.setSetting("reduceMotion", v);
        document.documentElement.classList.toggle("reduce-motion", v);
      }, "减少动效"))
    );

    var importInput = h("input", { type: "file", accept: ".json,application/json", class: "visually-hidden", id: "importFile" });
    importInput.addEventListener("change", function () {
      var file = importInput.files && importInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          ZG.Progress.importJSON(String(reader.result || ""));
          UI.toast("存档已导入", "seal", 2400);
          setTimeout(function () { window.location.hash = "#/"; }, 400);
        } catch (e) {
          UI.toast("导入失败：" + (e && e.message ? e.message : "文件不合法"), "error", 3200);
        }
      };
      reader.readAsText(file);
    });

    var actions = h("div", { class: "setting-actions" },
      UI.button("导出存档", { kind: "ghost", onClick: function () {
        UI.download("zigen-gongfang-" + U.todayKey() + ".json", ZG.Progress.exportJSON());
      } }),
      UI.button("导入存档", { kind: "ghost", onClick: function () { importInput.click(); } }),
      UI.button("重看导览", { kind: "ghost", onClick: function () {
        state.flags.onboarded = false;
        ZG.Progress.save(true);
        if (ZG.App && ZG.App.startOnboarding) ZG.App.startOnboarding();
        else window.location.hash = "#/";
      } }),
      UI.button("重置进度", { kind: "seal", onClick: function () {
        UI.confirmDialog({
          title: "重置全部进度？",
          message: "星星、经验、复习盒、成就与摆设都会清空；旧存档会备份到浏览器本地。",
          ok: "确认重置",
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          ZG.Progress.reset();
          UI.toast("已重置，工坊重新开张", "seal", 2400);
          setTimeout(function () { window.location.hash = "#/"; }, 400);
        });
      } })
    );

    var page = h("div", { class: "page page-settings" },
      UI.pageHead({
        seal: "设", title: "设置", sub: "工坊的规矩，由你定",
        actions: [UI.linkButton("统计", "#/stats", { kind: "ghost" }), UI.linkButton("回工坊", "#/", { kind: "ghost" })]
      }),
      demo ? h("div", { class: "note-card" }, h("b", {}, "演示模式："), "当前进度与设置不会写入本地存档。") : null,
      UI.panel("练习", list, { className: "settings-panel" }),
      UI.panel("存档", h("div", { class: "save-box" },
        h("p", {}, "本地存档 " + U.fmtNum(st.xp) + " XP · " + st.stars + " 星 · " + st.mastered + " 个已掌握"),
        h("p", { class: "muted" }, "只存在这台电脑的浏览器里，不上传。换浏览器或清理站点数据会丢失，建议偶尔导出。"),
        actions,
        importInput
      ), { className: "settings-panel" }),
      UI.panel("关于", h("div", { class: "about-box" },
        h("p", {}, "字根工坊 · 五笔 86 学习沙盒"),
        h("p", { class: "muted" }, "码表来自本机微软五笔（ChsWubi.lex）。仅个人学习使用；公开发布请替换为开源码表。"),
        h("p", { class: "muted" }, "字体：华文行楷 / 楷体 / 仿宋（系统字体，无网络加载）。")
      ), { className: "settings-panel" })
    );
    UI.mount(root, page);
    fillAside(state);
    if (ZG.App && ZG.App.setCleanup) ZG.App.setCleanup(cleanup);
  }

  function fillAside(state) {
    var wrap = h("div", { class: "aside-stack" });
    wrap.appendChild(UI.panel("当前", h("div", { class: "aside-stats" },
      h("p", {}, "音效 " + (state.settings.sound ? "开" : "关")),
      h("p", {}, "提示 " + (state.settings.hints ? "开" : "关")),
      h("p", {}, "自动上屏 " + (state.settings.autoSpace ? "开" : "关"))
    ), { className: "aside-panel" }));
    wrap.appendChild(UI.panel("快捷键", h("div", { class: "aside-stats" },
      h("p", {}, "A–Y 输入 · 空格上屏"),
      h("p", {}, "退格删码 · Esc 重置"),
      h("p", {}, "Tab 走查 · Enter 确认")
    ), { className: "aside-panel" }));
    UI.setAside(wrap);
  }

  ZG.UI.Settings = { render: render, cleanup: cleanup };
})();
