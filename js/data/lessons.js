/* 33 关 · 卷轴定义（关卡展开逻辑在 js/core/levels.js） */
window.ZG_CHAPTERS = [
  { id: "序", title: "序 · 入坊", sub: "先认键，再认字根", seal: "序" },
  { id: "一", title: "卷一 · 字根", sub: "二十五键，五区口诀", seal: "根" },
  { id: "二", title: "卷二 · 键名与一级简码", sub: "最高频的 50 个字", seal: "简" },
  { id: "三", title: "卷三 · 二级简码", sub: "两键一字，开始成句", seal: "二" },
  { id: "四", title: "卷四 · 三级与全码", sub: "补全编码，学会识别码", seal: "全" },
  { id: "五", title: "卷五 · 词组", sub: "两字到多字，四码成词", seal: "词" },
  { id: "六", title: "卷六 · 跟打", sub: "在短文里把字打活", seal: "文" }
];

window.ZG_LESSON_DEFS = [
  {
    id: "0-1", chapter: "序", chapterIndex: 0, title: "入坊", subtitle: "认识五区与二十五键",
    kind: "tour", xp: 20,
    intro: "五笔不看拼音，看字形。二十五个字母键分成五个区，每个键上住着一组字根。先随便点点看，认全五个区就好。",
    rule: "点按或敲 a-y 的任意键，看看它属于哪个区。"
  },
  {
    id: "0-2", chapter: "序", chapterIndex: 0, title: "区位小测", subtitle: "区号 + 位号，找到那个键",
    kind: "quizZone", count: 12, xp: 25,
    intro: "每个键有一个区位号：区号 1-5，位号 1-5。比如 11 是 G，55 是 X。看区位，找键位。",
    rule: "每题给“某区 · 第几位”，按对应的字母键。"
  },
  {
    id: "0-3", chapter: "序", chapterIndex: 0, title: "字根初识", subtitle: "二十五键的名字与口诀",
    kind: "keyIntro", count: 5, xp: 25,
    intro: "每个键有一个“键名字”，还有一句口诀帮你记住键上的字根。先翻一遍二十五键，再答五题。",
    rule: "翻完图鉴，开始 5 题小测。"
  },

  {
    id: "1-1", chapter: "一", chapterIndex: 1, title: "横区", subtitle: "G F D S A · 11-15",
    kind: "quizRoot", zoneName: "横", count: 12, xp: 30,
    intro: "横区五指：王、土、大、木、工。看到这些字根，先想横区。",
    rule: "每题给一个字根，按它所在的键。"
  },
  {
    id: "1-2", chapter: "一", chapterIndex: 1, title: "竖区", subtitle: "H J K L M · 21-25",
    kind: "quizRoot", zoneName: "竖", count: 12, xp: 30,
    intro: "竖区五指：目、日、口、田、山。日、口、田、山都是竖势起笔。",
    rule: "每题给一个字根，按它所在的键。"
  },
  {
    id: "1-3", chapter: "一", chapterIndex: 1, title: "撇区", subtitle: "T R E W Q · 31-35",
    kind: "quizRoot", zoneName: "撇", count: 12, xp: 30,
    intro: "撇区五指：禾、白、月、人、金。撇、人、金是这一区的骨架。",
    rule: "每题给一个字根，按它所在的键。"
  },
  {
    id: "1-4", chapter: "一", chapterIndex: 1, title: "捺区", subtitle: "Y U I O P · 41-45",
    kind: "quizRoot", zoneName: "捺", count: 12, xp: 30,
    intro: "捺区五指：言、立、水、火、之。点、捺、水、火都往这一区走。",
    rule: "每题给一个字根，按它所在的键。"
  },
  {
    id: "1-5", chapter: "一", chapterIndex: 1, title: "折区", subtitle: "N B V C X · 51-55",
    kind: "quizRoot", zoneName: "折", count: 12, xp: 30,
    intro: "折区五指：已、子、女、又、纟。折笔、框、女字旁都在这里。",
    rule: "每题给一个字根，按它所在的键。"
  },
  {
    id: "1-6", chapter: "一", chapterIndex: 1, title: "口诀综合", subtitle: "五区混练 · 口诀是地图",
    kind: "quizRoot", count: 12, xp: 35,
    intro: "五区字根混在一起。忘了就默念口诀：王旁青头戋五一，土士二干十寸雨……",
    rule: "每题给一个字根，按它所在的键；答错会显示口诀。"
  },

  {
    id: "2-1", chapter: "二", chapterIndex: 2, title: "键名（上）", subtitle: "十三个键名字，四连击",
    kind: "code", pool: "keynames", part: 0, count: 13, strictLen: 4, xp: 35,
    intro: "键名字就是每个键自己的名字：王、土、大、木、工……打它要连按四次所在键，再自动上屏。",
    rule: "四码自动上屏；例如 王 = gggg。"
  },
  {
    id: "2-2", chapter: "二", chapterIndex: 2, title: "键名（下）", subtitle: "余下十二个键名字",
    kind: "code", pool: "keynames", part: 1, count: 12, strictLen: 4, xp: 35,
    intro: "把剩下的键名字打完。每个键名字都是四连击。",
    rule: "四码自动上屏。"
  },
  {
    id: "2-3", chapter: "二", chapterIndex: 2, title: "一级简码（上）", subtitle: "一键 + 空格，最高频的字",
    kind: "code", pool: "c1", part: 0, count: 13, strictLen: 1, xp: 40,
    intro: "一级简码是最高频的 25 个字，一个字母加空格就上屏。先学上半。",
    rule: "按 1 个字母，再按空格。"
  },
  {
    id: "2-4", chapter: "二", chapterIndex: 2, title: "一级简码（下）", subtitle: "余下十二个，一键一字",
    kind: "code", pool: "c1", part: 1, count: 12, strictLen: 1, xp: 40,
    intro: "把剩下的一级简码打完。记住：简码也要按空格。",
    rule: "按 1 个字母，再按空格。"
  },

  {
    id: "3-1", chapter: "三", chapterIndex: 3, title: "二级简码 · 一", subtitle: "两键 + 空格",
    kind: "code", pool: "c2", part: 0, count: 16, strictLen: 2, xp: 40,
    intro: "二级简码取全码的前两码。打完两键按空格，比全码快得多。",
    rule: "两键 + 空格。字卡下方会显示它的全码。"
  },
  {
    id: "3-2", chapter: "三", chapterIndex: 3, title: "二级简码 · 二", subtitle: "两键 + 空格",
    kind: "code", pool: "c2", part: 1, count: 16, strictLen: 2, xp: 40,
    intro: "继续练二级简码。先想前两个字根，再看要不要补识别码——简码不用补。",
    rule: "两键 + 空格。"
  },
  {
    id: "3-3", chapter: "三", chapterIndex: 3, title: "二级简码 · 三", subtitle: "两键 + 空格",
    kind: "code", pool: "c2", part: 2, count: 16, strictLen: 2, xp: 40,
    intro: "二级简码越打越顺。注意候选条里同码的字，先认目标字的形状。",
    rule: "两键 + 空格。"
  },
  {
    id: "3-4", chapter: "三", chapterIndex: 3, title: "二级简码 · 四", subtitle: "两键 + 空格",
    kind: "code", pool: "c2", part: 3, count: 16, strictLen: 2, xp: 40,
    intro: "把速度放稳，先求准。两键之后不要急着敲第三键。",
    rule: "两键 + 空格；多敲的键会被拦下。"
  },
  {
    id: "3-5", chapter: "三", chapterIndex: 3, title: "二级简码 · 五", subtitle: "两键 + 空格",
    kind: "code", pool: "c2", part: 4, count: 16, strictLen: 2, xp: 40,
    intro: "这一组会有更多同码字。错了没关系，看提示，再打一遍。",
    rule: "两键 + 空格。"
  },
  {
    id: "3-6", chapter: "三", chapterIndex: 3, title: "二级简码 · 六", subtitle: "两键 + 空格",
    kind: "code", pool: "c2", part: 5, count: 16, strictLen: 2, xp: 45,
    intro: "二级简码收尾。打完这六关，常用字已经能覆盖一大片。",
    rule: "两键 + 空格。"
  },

  {
    id: "4-1", chapter: "四", chapterIndex: 4, title: "三级简码 · 一", subtitle: "三键 + 空格",
    kind: "code", pool: "c3", part: 0, count: 16, strictLen: 3, xp: 45,
    intro: "三级简码取全码的前三码。比二级多认一个字根，比重码少一次选择。",
    rule: "三键 + 空格。"
  },
  {
    id: "4-2", chapter: "四", chapterIndex: 4, title: "三级简码 · 二", subtitle: "三键 + 空格",
    kind: "code", pool: "c3", part: 1, count: 16, strictLen: 3, xp: 45,
    intro: "三级简码的字往往字根多一点。先拆对，再求快。",
    rule: "三键 + 空格。"
  },
  {
    id: "4-3", chapter: "四", chapterIndex: 4, title: "三级简码 · 三", subtitle: "三键 + 空格",
    kind: "code", pool: "c3", part: 2, count: 16, strictLen: 3, xp: 45,
    intro: "三级简码收尾。到这里，简码体系已经完整：一键、两键、三键。",
    rule: "三键 + 空格。"
  },
  {
    id: "4-4", chapter: "四", chapterIndex: 4, title: "全码 · 一", subtitle: "四键自动上屏",
    kind: "code", pool: "full4", part: 0, count: 12, strictLen: 4, xp: 50,
    intro: "全码是完整的四码。没有简码可偷懒时，就把字根拆到第四码。",
    rule: "四码自动上屏；注意最后一码可能是识别码。"
  },
  {
    id: "4-5", chapter: "四", chapterIndex: 4, title: "全码 · 二", subtitle: "四键自动上屏",
    kind: "code", pool: "full4", part: 1, count: 12, strictLen: 4, xp: 50,
    intro: "全码练习。四码打全，重码自然少。",
    rule: "四码自动上屏。"
  },
  {
    id: "4-6", chapter: "四", chapterIndex: 4, title: "识别码讲堂", subtitle: "末笔 + 字型 = 识别码",
    kind: "idcTutorial", xp: 30,
    intro: "字根不够四码时，用“末笔识别码”补。末笔定区，字型定位。先玩一遍计算器。",
    rule: "选末笔、选字型，看看识别码落在哪。"
  },
  {
    id: "4-7", chapter: "四", chapterIndex: 4, title: "识别码练习", subtitle: "补上最后那一码",
    kind: "code", pool: "idc", count: 8, strictLen: 0, xp: 50,
    intro: "这些字都要补识别码。先看字卡下方的末笔和字型，再敲完整编码。",
    rule: "按该字的完整编码；最后一码是识别码。"
  },

  {
    id: "5-1", chapter: "五", chapterIndex: 5, title: "二字词", subtitle: "每字取前两码",
    kind: "code", pool: "words2", count: 12, strictLen: 4, xp: 50,
    intro: "二字词：第一个字取前两码，第二个字取前两码，共四码。",
    rule: "四码自动上屏。"
  },
  {
    id: "5-2", chapter: "五", chapterIndex: 5, title: "三字词", subtitle: "前两字各一码，末字两码",
    kind: "code", pool: "words3", count: 12, strictLen: 4, xp: 50,
    intro: "三字词：第一、二字各取第一码，第三个字取前两码。",
    rule: "四码自动上屏。"
  },
  {
    id: "5-3", chapter: "五", chapterIndex: 5, title: "四字词", subtitle: "每字取第一码",
    kind: "code", pool: "words4", count: 12, strictLen: 4, xp: 50,
    intro: "四字词最整齐：每个字取第一码，四码成词。",
    rule: "四码自动上屏。"
  },
  {
    id: "5-4", chapter: "五", chapterIndex: 5, title: "多字词", subtitle: "前三字 + 末字各一码",
    kind: "code", pool: "words5", count: 12, strictLen: 4, xp: 55,
    intro: "五字及以上：取第一、二、三字的第一码，再取最后一个字的第一码。",
    rule: "四码自动上屏。"
  },

  {
    id: "6-1", chapter: "六", chapterIndex: 6, title: "晨课", subtitle: "短文跟打 · 一级/二级",
    kind: "passage", passageIndex: 0, xp: 60,
    intro: "把字放进句子里打。标点会跳过，遇到不会的字可以看答案，但会计错。",
    rule: "逐字跟打；打完一段看速度与正确率。"
  },
  {
    id: "6-2", chapter: "六", chapterIndex: 6, title: "午课", subtitle: "短文跟打 · 三级/全码",
    kind: "passage", passageIndex: 1, xp: 60,
    intro: "这段会混入三级简码与全码。先求准确，再提速。",
    rule: "逐字跟打。"
  },
  {
    id: "6-3", chapter: "六", chapterIndex: 6, title: "暮课", subtitle: "短文跟打 · 综合",
    kind: "passage", passageIndex: 2, xp: 70,
    intro: "最后一课。把前面学的字根、简码、词组都用上。",
    rule: "逐字跟打；完成后可回沙盒继续自由练。"
  }
];
