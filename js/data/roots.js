/* 25 键 · 助记字根 · 标准 86 口诀
 * 说明：字根为“助记字根，非穷举”，用于教学提示，不作为拆字唯一依据。
 * 键位、键名字、一级简码以 data/wubi86-chars.js 的实测码表交叉校验。
 */
window.ZG_ROOTS = {
  meta: {
    note: "助记字根，非穷举；拆字以码表与精选拆解为准。",
    scheme: "wubi86"
  },
  zones: [
    { id: "heng", name: "横", code: 1, keys: "GFDSA", desc: "横起笔：一、丨之外的横势字根" },
    { id: "shu", name: "竖", code: 2, keys: "HJKLM", desc: "竖起笔：目、日、口、田、山" },
    { id: "pie", name: "撇", code: 3, keys: "TREWQ", desc: "撇起笔：禾、白、月、人、金" },
    { id: "na", name: "捺", code: 4, keys: "YUIOP", desc: "捺起笔：言、立、水、火、之" },
    { id: "zhe", name: "折", code: 5, keys: "NBVCX", desc: "折起笔：已、子、女、又、纟" }
  ],
  keys: [
    {
      key: "g", zone: "heng", zoneName: "横", pos: 1, code: 11, name: "王",
      roots: ["王", "一", "五", "戋", "龶"],
      mnemonic: "王旁青头戋五一",
      examples: ["王", "班", "理"],
      tip: "“青头”取龶；王、一、五、戋都在 G。"
    },
    {
      key: "f", zone: "heng", zoneName: "横", pos: 2, code: 12, name: "土",
      roots: ["土", "士", "二", "干", "十", "寸", "雨"],
      mnemonic: "土士二干十寸雨",
      examples: ["土", "地", "城"],
      tip: "土、士、二、干、十、寸、雨一组的起笔都是横。"
    },
    {
      key: "d", zone: "heng", zoneName: "横", pos: 3, code: 13, name: "大",
      roots: ["大", "犬", "三", "羊", "古", "石", "厂"],
      mnemonic: "大犬三羊古石厂",
      examples: ["大", "天", "太"],
      tip: "“羊”取羊字底；厂、石也归 D。"
    },
    {
      key: "s", zone: "heng", zoneName: "横", pos: 4, code: 14, name: "木",
      roots: ["木", "丁", "西", "覀"],
      mnemonic: "木丁西",
      examples: ["木", "林", "森"],
      tip: "西、覀（西字头）同键。"
    },
    {
      key: "a", zone: "heng", zoneName: "横", pos: 5, code: 15, name: "工",
      roots: ["工", "戈", "艹", "卄", "匚", "七"],
      mnemonic: "工戈草头右框七",
      examples: ["工", "式", "草"],
      tip: "“右框”是匚；“草头”是艹、卄。"
    },
    {
      key: "h", zone: "shu", zoneName: "竖", pos: 1, code: 21, name: "目",
      roots: ["目", "具", "上", "止", "卜", "虍", "皮"],
      mnemonic: "目具上止卜虎皮",
      examples: ["目", "看", "睛"],
      tip: "“虎皮”取虍、皮；“具”取目 + 一 + 八的目部。"
    },
    {
      key: "j", zone: "shu", zoneName: "竖", pos: 2, code: 22, name: "日",
      roots: ["日", "曰", "早", "虫", "刂"],
      mnemonic: "日早两竖与虫依",
      examples: ["日", "明", "时"],
      tip: "“两竖”取刂；日、曰、早、虫同键。"
    },
    {
      key: "k", zone: "shu", zoneName: "竖", pos: 3, code: 23, name: "口",
      roots: ["口", "川"],
      mnemonic: "口与川，字根稀",
      examples: ["口", "品", "号"],
      tip: "口、川；K 键字根较少，位置好记。"
    },
    {
      key: "l", zone: "shu", zoneName: "竖", pos: 4, code: 24, name: "田",
      roots: ["田", "甲", "囗", "四", "车", "力", "罒"],
      mnemonic: "田甲方框四车力",
      examples: ["田", "国", "男"],
      tip: "“方框”取囗；四、罒同键。"
    },
    {
      key: "m", zone: "shu", zoneName: "竖", pos: 5, code: 25, name: "山",
      roots: ["山", "由", "贝", "冂", "几"],
      mnemonic: "山由贝，下框几",
      examples: ["山", "岩", "出"],
      tip: "“下框”取冂；几也归 M。"
    },
    {
      key: "t", zone: "pie", zoneName: "撇", pos: 1, code: 31, name: "禾",
      roots: ["禾", "竹", "丿", "彳", "攵", "夂"],
      mnemonic: "禾竹一撇双人立，反文条头共三一",
      examples: ["禾", "和", "秋"],
      tip: "“双人立”是彳；“反文”是攵；“条头”是夂。"
    },
    {
      key: "r", zone: "pie", zoneName: "撇", pos: 2, code: 32, name: "白",
      roots: ["白", "手", "扌", "龵", "斤"],
      mnemonic: "白手看头三二斤",
      examples: ["白", "的", "手"],
      tip: "“看头”是龵；提手旁扌归 R。"
    },
    {
      key: "e", zone: "pie", zoneName: "撇", pos: 3, code: 33, name: "月",
      roots: ["月", "彡", "乃", "用", "豕", "衣"],
      mnemonic: "月彡（衫）乃用家衣底",
      examples: ["月", "朋", "明"],
      tip: "“家衣底”取豕、衣；彡读衫。"
    },
    {
      key: "w", zone: "pie", zoneName: "撇", pos: 4, code: 34, name: "人",
      roots: ["人", "亻", "八", "癶"],
      mnemonic: "人和八，三四里",
      examples: ["人", "你", "他"],
      tip: "“三四里”指 34 键位；亻、八、癶同键。"
    },
    {
      key: "q", zone: "pie", zoneName: "撇", pos: 5, code: 35, name: "金",
      roots: ["金", "钅", "勹", "鱼", "犭", "儿", "夕", "氏"],
      mnemonic: "金勺缺点无尾鱼，犬旁留叉儿一点夕，氏无七（妻）",
      examples: ["金", "铁", "银"],
      tip: "“勺缺点”是勹；“犬旁留叉”是犭。"
    },
    {
      key: "y", zone: "na", zoneName: "捺", pos: 1, code: 41, name: "言",
      roots: ["言", "讠", "文", "方", "广", "亠", "丶"],
      mnemonic: "言文方广在四一，高头一捺谁人去",
      examples: ["言", "说", "话"],
      tip: "“高头”是亠；“谁人去”取讠与丶。"
    },
    {
      key: "u", zone: "na", zoneName: "捺", pos: 2, code: 42, name: "立",
      roots: ["立", "辛", "丬", "六", "门", "疒", "丷"],
      mnemonic: "立辛两点六门疒",
      examples: ["立", "亲", "新"],
      tip: "“两点”取丷；“病字旁”是疒。"
    },
    {
      key: "i", zone: "na", zoneName: "捺", pos: 3, code: 43, name: "水",
      roots: ["水", "氵", "氺", "小", "⺌"],
      mnemonic: "水旁兴头小倒立",
      examples: ["水", "江", "河"],
      tip: "“兴头”是⺌；“小倒立”是小。"
    },
    {
      key: "o", zone: "na", zoneName: "捺", pos: 4, code: 44, name: "火",
      roots: ["火", "灬", "业", "米"],
      mnemonic: "火业头，四点米",
      examples: ["火", "灯", "秋"],
      tip: "“四点”是灬；业、米同键。"
    },
    {
      key: "p", zone: "na", zoneName: "捺", pos: 5, code: 45, name: "之",
      roots: ["之", "辶", "廴", "宀", "冖", "礻", "衤"],
      mnemonic: "之宝盖，摘礻（示）衤（衣）",
      examples: ["之", "这", "道"],
      tip: "“宝盖”是宀、冖；“摘示衣”取礻、衤。"
    },
    {
      key: "n", zone: "zhe", zoneName: "折", pos: 1, code: 51, name: "已",
      roots: ["已", "巳", "己", "尸", "心", "忄", "羽", "乙"],
      mnemonic: "已半巳满不出己，左框折尸心和羽",
      examples: ["已", "心", "想"],
      tip: "“左框”是尸；心、忄、羽、乙同键。"
    },
    {
      key: "b", zone: "zhe", zoneName: "折", pos: 2, code: 52, name: "子",
      roots: ["子", "孑", "耳", "了", "也", "阝", "卩", "凵"],
      mnemonic: "子耳了也框向上",
      examples: ["子", "字", "学"],
      tip: "“框向上”是凵；阝、卩也归 B。"
    },
    {
      key: "v", zone: "zhe", zoneName: "折", pos: 3, code: 53, name: "女",
      roots: ["女", "刀", "九", "臼", "彐"],
      mnemonic: "女刀九臼山朝西",
      examples: ["女", "好", "妈"],
      tip: "“山朝西”是彐；刀、九、臼同键。"
    },
    {
      key: "c", zone: "zhe", zoneName: "折", pos: 4, code: 54, name: "又",
      roots: ["又", "巴", "马", "厶"],
      mnemonic: "又巴马，丢矢矣",
      examples: ["又", "对", "妈"],
      tip: "“丢矢矣”取厶；巴、马同键。"
    },
    {
      key: "x", zone: "zhe", zoneName: "折", pos: 5, code: 55, name: "纟",
      roots: ["纟", "幺", "弓", "匕", "比", "母"],
      mnemonic: "慈母无心弓和匕，幼无力",
      examples: ["纟", "红", "经"],
      tip: "“慈母无心”是母去心；“幼无力”是幺。"
    }
  ]
};

(function () {
  var map = {};
  window.ZG_ROOTS.keys.forEach(function (k) { map[k.key] = k; });
  window.ZG_ROOTS.byKey = map;
  window.ZG_ROOTS.keyNames = window.ZG_ROOTS.keys.map(function (k) { return k.name; });
})();
