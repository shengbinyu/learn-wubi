# 字根工坊 · QA 测试报告（核心逻辑）

- 时间：2026-11-06
- 范围：`tests/` 下 5 个 node:test 测试文件 + `tests/harness.js`（只读加载核心脚本，不修改源码）
- 环境：Node v24.18.0，Windows；测试全程约 **0.5 秒**

## 结论

| 指标 | 数值 |
| --- | --- |
| 测试总数 | **49** |
| 通过 | **47** |
| 失败 | **2**（均为 `js/core/levels.js` 源码缺陷，见下） |
| 跳过 | 0 |

数据层（`data/`、`dict`）、引擎（`engine`）、进度（`progress`）、拆解与短文（`decomp`/`passages`）全部通过；
2 个失败是**真实源码 bug**，已按 QA 职责报告、未修复源码。

## 复现

本沙箱内 `node --test tests/` 会因测试运行器子进程被拦截报 `Error: spawn EPERM`；改用单进程列出文件即可：

```powershell
node --test --test-isolation=none tests/data.test.js tests/decomp.test.js tests/engine.test.js tests/levels.test.js tests/progress.test.js
```

非沙箱环境直接 `node --test tests/` 即可（每个测试文件独立进程；`tests/harness.js` 负责在 `globalThis` 上搭建 `window` + localStorage Map 桩，再用 `vm.runInThisContext` 按依赖序加载脚本，无需 DOM）。

## 源码缺陷

### Bug A（阻断）：识别码关的 `strictLen` 恒为 4，3 道题无法完成

- 位置：`js/core/levels.js:135`（`codeItems` 的 `pool === "idc"` 分支，`strictLen: 4` 写死）
- 失败测试：`tests/levels.test.js` →「每道编码题 strictLen 与自身编码匹配（含识别码题）」
- 实际输出：

```
4-7/只: strictLen=4 但 codes=["kwu"]（无该长度编码，无法上屏）
4-7/林: strictLen=4 但 codes=["ssy"]（无该长度编码，无法上屏）
4-7/明: strictLen=4 但 codes=["jeg"]（无该长度编码，无法上屏）
```

- 影响：`IDC_EXAMPLES` 8 例中 `只(kwu)`、`林(ssy)`、`明(jeg)` 全码只有 3 码。`ZG.Engine.create({codes:["kwu"], strictLen:4})`
  因 `allowed = codes.filter(len===4)` 为空而回退为 `["kwu"]`；玩家敲满 3 码后 `space()` 命中
  `"本关需要 4 码，现在 3 码。"`，无法上屏 → **4-7 关的这 3 道题不可能通过**。
- 建议（未实施）：`strictLen: x.full.length`（随每例全码长度 3/4 自适应），或校验失败时回退。

### Bug B：`IDC_EXAMPLES` 中 2 例识别码标注与全码末位矛盾（教学展示错误）

- 位置：`js/core/levels.js:17-26`（`IDC_EXAMPLES`）
- 失败测试：`tests/levels.test.js` →「识别码示例的末笔/字型标注应与全码末位一致（矩阵自洽）」
- 实际输出：

```
森: full=sssu 末位 u（矩阵 捺/杂合=i），标注的末笔 捺 / 字型 杂合 与全码矛盾
品: full=kkkf 末位 f（矩阵 横/杂合=d），标注的末笔 横 / 字型 杂合 与全码矛盾
```

- 解读：`IDC_MATRIX[捺][杂合]="i"`、`IDC_MATRIX[横][杂合]="d"`；而 `森` 末位 `u` 对应矩阵 捺/上下，`品` 末位 `f` 对应矩阵 横/上下。
  两例的「字型」应改为 **上下**（末笔 捺/横 不变）。其余 6 例正确。
- 影响：识别码教学关会展示错误的「末笔/字型 → 键位」示例，与引擎判定（按真实全码校验）不一致。
  另：已生成的真实数据 `js/data/decompositions.js` 中 107 条带识别码的条目与矩阵 **完全一致（0 处矛盾）**，可作为修正参照。

## 数据质量观察（未判失败，供参考）

- 重复词码：`汶川` 同时有 `iyhh`/`iykt` 两码，内存中保留 `iyhh`；`iyhh` 同时被 `注目` 使用。
  `data/build-report.json` 的 `duplicateWordCodeCount: 1`、样例与之一致。共 8846 个词码被多个词共用（最多 22 词），属正常重码。
- `data/wubi86-words.js` 的 `meta.wordLenDist` 各长度计数之和为 **76435**，比 `words: 76378` 多 57。
  词条数本身（76378）及逐条编码格式均已验证正确；该统计字段疑似构建脚本小误差（未在测试中断言，避免误报）。
- `data/wubi86-chars.js`：`records 87514 / chars 6890`，`codeLenDist {1:25,2:599,3:4411,4:6044}` 与逐字重算完全一致；
  6,890 字均有 1–4 条 `/^[a-y]{1,4}$/` 编码，无空码/重复码；25 键名字均有 4 码；25 一级简码字与预期单码一一对应。

## 覆盖清单

| 文件 | 测试数 | 覆盖 |
| --- | --- | --- |
| `tests/data.test.js` | 7 | chars/words meta 与 build-report 交叉核对、编码长度分布重算、编码格式/空码/重复、25 键名 4 码、25 一级简码精确映射、词条数 76378 与词码格式、`汶川` 重复码诊断 |
| `tests/engine.test.js` | 14 | 明 je/jeg 二码上屏、错误键不入 buffer 且 firstTry=false、工 a/aaa/aaaa 第四码自动上屏、纯四码自动完成、退格/重置/提示、reveal 返回码与 full、strictLen 不匹配/已满错误文案、result 结构 `{ok,firstTry,revealed,errors,ms,usedCode}`、完成后操作无效 |
| `tests/levels.test.js` | 13 | 33 关 id 唯一、7 章、各关展开题数（2-1=13,2-2=12,2-3=13,2-4=12,3-1=16,3-2=16,4-7=8,5-1=12）、展开确定性、题面不重复、编码题编码合法/与 Dict 一致、strictLen 匹配（**Bug A**）、IDC_MATRIX 15 键位精确、IDC 示例与字典一致、IDC 示例矩阵自洽（**Bug B**）、星级阈值（0.79→0、0.80+4s→1、0.92+2.9s→2、0.98+1.9s→3、短文速度 20/30 字/分）、短文关使用真实 passages、tour/idcTutorial 展开为空 |
| `tests/progress.test.js` | 10 | 间隔盒 1→2→3 与 due 时间、失败降回 box1 并进 wrongQueue、上限 box5、firstTry 语义联动（引擎 result 错误→ok=false）、due() 筛选/limit/编码、markLevel 只升不降、export/import 往返、损坏 localStorage 自动备份 `zg.v1.bak` 并重写合法 JSON、stats 正确率、completeDaily 连击（同日只记一次、连天+1、中断重置）、demo 模式完全写内存不落盘 |
| `tests/decomp.test.js` | 5 | 拆解 120 条/汉字唯一/均在字库、roots 键位拼接+idc.key 与 full 均为真实编码、idc 与矩阵一致（107 条）、键位存在于 roots.js、短文 3 段且各 50–80 汉字全在字库、6-1/6-2/6-3 与 passages.js 联动 |

注：`decompositions.js` / `passages.js` 缺失时对应测试用 `test.skip` 并输出「尚未生成，跳过」；本次两文件已生成并通过。

## 文件

- `tests/harness.js`、`tests/data.test.js`、`tests/engine.test.js`、`tests/levels.test.js`、`tests/progress.test.js`、`tests/decomp.test.js`
- 本报告 `qa/QA-REPORT.md`
- 未修改任何源码 / CSS / 数据 / `index.html`。
