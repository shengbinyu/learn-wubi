/* 字根工坊 · 首启导览 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  var STEPS = [
    {
      mark: "五", title: "五笔不是拼音",
      body: "把字拆成 1~4 个字根，每个字根落在一个键上。比如「明」= 日 + 月，落在 J、E 两键。",
      extra: function () {
        return h("div", { class: "tour-example" },
          h("span", { class: "tour-char" }, "明"),
          h("span", { class: "tour-eq" }, "="),
          h("span", { class: "tour-root" }, h("b", {}, "日"), h("small", {}, "J")),
          h("span", { class: "tour-plus" }, "+"),
          h("span", { class: "tour-root" }, h("b", {}, "月"), h("small", {}, "E")),
          h("span", { class: "tour-eq" }, "→"),
          h("span", { class: "tour-code" }, "JE")
        );
      }
    },
    {
      mark: "区", title: "五区二十五键",
      body: "横、竖、撇、捺、折五个区，每区五个键。背口诀不如先记位置：左手横竖，右手撇捺，折在下面。",
      extra: function () {
        var wrap = h("div", { class: "tour-zones" });
        (ZG_ROOTS.zones || []).forEach(function (z) {
          wrap.appendChild(h("div", { class: "tour-zone " + UI.zoneClass(z.name) },
            h("b", {}, z.name),
            h("span", {}, String(z.keys || "").split("").join(" "))
          ));
        });
        return wrap;
      }
    },
    {
      mark: "码", title: "简码先走",
      body: "一级、二级、三级简码按空格上屏；四码全码自动上屏。练习时错了不要紧，沙盒里随时能看答案、看拆解。",
      extra: function () {
        return h("div", { class: "tour-code-list" },
          h("div", {}, h("code", {}, "A"), h("span", {}, "一级简码 · 工")),
          h("div", {}, h("code", {}, "JE"), h("span", {}, "二级简码 · 明")),
          h("div", {}, h("code", {}, "JEG"), h("span", {}, "全码 · 明")),
          h("div", {}, h("code", {}, "AAWT"), h("span", {}, "词组 · 工作"))
        );
      }
    }
  ];

  function open(opts) {
    opts = opts || {};
    var idx = 0;
    var closed = false;
    var body = h("div", { class: "onboarding" });
    var dots = h("div", { class: "onboarding-dots", "aria-hidden": "true" });
    var actions = h("div", { class: "onboarding-actions" });

    function renderStep() {
      UI.clear(body);
      UI.clear(dots);
      UI.clear(actions);
      var step = STEPS[idx];
      body.appendChild(h("div", { class: "onboarding-step is-active" },
        h("div", { class: "onboarding-mark seal" }, step.mark),
        h("h2", {}, step.title),
        h("p", {}, step.body),
        step.extra()
      ));
      STEPS.forEach(function (_, i) {
        dots.appendChild(h("span", { class: "onboarding-dot" + (i === idx ? " is-active" : "") }));
      });
      if (idx > 0) actions.appendChild(UI.button("上一步", { kind: "ghost", onClick: function () { idx -= 1; renderStep(); } }));
      actions.appendChild(UI.button("跳过", { kind: "ghost", onClick: function () { finish(false); } }));
      actions.appendChild(UI.button(idx === STEPS.length - 1 ? "开始开坊" : "下一步", {
        kind: "primary",
        onClick: function () {
          if (idx === STEPS.length - 1) finish(true);
          else { idx += 1; renderStep(); }
        }
      }));
    }

    function finish(start) {
      if (closed) return;
      closed = true;
      ZG.Progress.markOnboarded();
      UI.closeOverlay();
      if (opts.onDone) opts.onDone(!!start);
    }

    body.appendChild(dots);
    body.appendChild(actions);
    renderStep();
    UI.openOverlay(body, { className: "onboarding-modal", label: "开坊导览", onClose: function () { finish(false); } });
  }

  ZG.UI.Onboarding = { open: open, steps: STEPS };
})();
