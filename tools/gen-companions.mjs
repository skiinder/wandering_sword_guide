#!/usr/bin/env node
/**
 * 队友档案生成器 v2：curated 队友列表 → content/companions.json
 * - 入队条件（时机 main 步 + 条件文案）+ 个人支线列表
 * - ref 解析 v2：大支线任务 → quest flow 步骤 id；小支线任务（misc-tasks.json 权威）→ 'misc:<任务名>'
 *   支持 q.refOverride（如主线段'五仙圣女'→'main-107'）
 * - quest 行带 trigger/gains/fav（从 misc-tasks.json 取；curated note 优先）
 * - 【不覆盖】companions.json 已存在时：保留已有条目的全部字段（手工修订），仅追加新队友/新任务
 *   手工编辑方式：直接改 content/companions.json；要重算 ref 可删文件后重跑
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TPL = JSON.parse(readFileSync(resolve(root, 'content/raw/walkthrough.json'), 'utf-8'))
const WIN = JSON.parse(readFileSync(resolve(root, 'content/windows/windows.json'), 'utf-8')).windows
const FLOWS = JSON.parse(readFileSync(resolve(root, 'public/data/flows.json'), 'utf-8')).flows
const MISC = existsSync(resolve(root, 'content/misc-tasks.json'))
  ? JSON.parse(readFileSync(resolve(root, 'content/misc-tasks.json'), 'utf-8')).tasks : []
const DIR = resolve(root, 'content')

// ---- curated 队友档案 ----
// join.main = 入队时机（主线步）；join.text = 入队条件
// quests[].name = 任务名；note = 触发条件/说明；refOverride = 显式跳转（可选）
const COMPANIONS = [
  {
    id: 'wei-huo', name: '卫霍', join: { main: 4, text: '梧桐村·主线剧情直接入队（全程升级位）' },
    quests: [
      { name: '山猪为患', note: '洛村剿匪期·野猪林' },
      { name: '砥砺精进', note: '切磋上限提升' },
      { name: '卫霍的承诺', note: '支线·救助后触发' },
    ],
  },
  {
    id: 'jiang-xiaotong', name: '江小彤',
    join: {
      main: 114,
      text: '天佛大战后·梧桐村江吟风墓前剧情，选择"传功小彤"正式入队（s22；此前为贯穿主线早期的陪伴角色，主线初遇有好感度+30 事件）',
    },
    quests: [
      { name: '小铜木剑（隐藏）', note: '梧桐村江宅床边拾取小彤的木剑；阎浮镇民宅送还+好感；天山决战前再拾取送小彤（图鉴）' },
      { name: '霸刀秦烈的抉择（隐藏）', note: '幽云泽渡口左上方·霸刀秦烈中毒求救，选"不救"=神秘少女（即江小彤）好感+20' },
      { name: '五仙圣女', note: '离开少林寺触发（main-107 段），小彤木剑送还前置', refOverride: 'main-107' },
      { name: '慈母手中线', note: '梧桐村' },
      { name: '叫花鸡', note: '梧桐村' },
    ],
  },
  {
    id: 'yao-ji', name: '瑶姬（红衣少女）', join: { main: 12, text: '碗子山·初遇；峋谷关（主线 36）正式同行；武家旧事线全程' },
    quests: [
      { name: '武家旧事', note: 'DLC 主线：不风山前必须触发（主线 43）；瑶姬好感在天水祝寿后→晋升执法前窗口' },
    ],
  },
  {
    id: 'shangguan-hong', name: '上官虹', join: { main: 13, text: '平康城-碧幽林·初遇；名剑山庄正式' },
    quests: [
      { name: '白帝剑器', note: '白帝湖·好感 70 得太华十二剑' },
      { name: '画舫轻歌', note: '青木舫' },
      { name: '千金蟾衣', note: '初始支线' },
    ],
  },
  {
    id: 'mo-qi', name: '大师兄莫弃', join: { main: 14, text: '武当·清河疑云后同行' },
    quests: [{ name: '莫问的喜好', note: '品剑大会期·本步前完成的小型支线（main-20 窗口）' }],
  },
  {
    id: 'tie-dan', name: '铁蛋', join: { main: 14, text: '清河村·毒蝎夺命' },
    quests: [
      { name: '毒蝎夺命', note: '初入武当章·开启异种金蝎线' },
      { name: '异种金蝎', note: '三线互斥：飞蝎使选赠予=娜乌线（药圣/商人自动关闭）' },
    ],
  },
  {
    id: 'bai-jin', name: '白锦', join: { main: 12, text: '洛村·重回碗子山后入队（洛村剿匪章）' },
    quests: [
      { name: '重回碗子山', note: '洛村剿匪期' },
      { name: '锦蛇青梅', note: '洛村剿匪期' },
      { name: '断天绝景', note: '断天崖' },
      { name: '塞外风光', note: '关外风云章（main-46 窗口）' },
    ],
  },
  {
    id: 'li-yuanxing', name: '李元兴', join: { main: 18, text: '莲心湖·初遇；伤魂鸟线（main-56）正式入队' },
    quests: [
      { name: '同游西凉', note: '卧秋山·打狗棍法满级（Excel：李元兴好感线）' },
      { name: '伤魂调·序曲', note: '伤魂鸟线' },
      { name: '出笼之鸟', note: '伤魂鸟终段' },
    ],
  },
  {
    id: 'leng-wuqing', name: '冷无情', join: { main: 46, text: '雷家村大支线·初遇；姑苏再遇无情（main-46）正式入队' },
    quests: [
      { name: '雷家村大支线', note: '晋升资深章·天龙暗桩→雷家村' },
      { name: '再遇无情', note: '姑苏·关外风云章（main-46）' },
      { name: '海商赵伦', note: '碧海仙踪线·码头提举司须冷无情在队' },
    ],
  },
  {
    id: 'kong-liang', name: '孔亮', join: { main: 20, text: '少林·血河神鉴（品剑大会前必须；错过需二周目）' },
    quests: [{ name: '韶华轻掷', note: '少林剑诀期' }],
  },
  {
    id: 'lv-xianer', name: '吕仙儿', join: { main: 20, text: '姑苏·比武招亲（原版线；武家旧事 DLC 未触发比武招亲则走武家旧事线）' },
    quests: [
      { name: '比武招亲', note: '姑苏·主线 20 前窗口' },
      { name: '女帅胆魄', note: '一线天·兵法（main-56 窗口；吕仙儿好感）' },
      { name: '和璞山庄', note: '武家旧事 DLC·协助叶家' },
    ],
  },
  {
    id: 'si-ma-ling', name: '司马玲', join: { main: 24, text: '青木舫·画舫轻歌（品剑大会章）' },
    quests: [
      { name: '画舫轻歌', note: '青木舫·入队任务' },
      { name: '画舫旧事', note: '竹海' },
      { name: '津鲤锦鲤', note: '津鲤村·鲤鱼相关' },
      { name: '姑苏曼舞', note: '姑苏·好感线' },
      { name: '出师考验', note: '竹海·师门线' },
    ],
  },
  {
    id: 'ouyang-xue', name: '欧阳雪', join: { main: 29, text: '名剑山庄·品剑大会（main-29）' },
    quests: [
      { name: '绝响难求', note: '素节林·曲谱（晋升传功后→晋升执法前必须完成，名剑山庄）' },
      { name: '猜灯谜', note: '品剑大会期（main-30 窗口）' },
    ],
  },
  {
    id: 'bu-weiyue', name: '步微月', join: { main: 48, text: '仙云渡→东海·碧海仙踪线（建议品剑大会前入队；码头提举司须冷无情）' },
    quests: [
      { name: '东海明珠', note: '碧海仙踪线·开启要求步微月在队' },
      { name: '仙猿山', note: '碧海仙踪线' },
      { name: '明珠无瑕', note: '碧海仙踪线·品剑大会期' },
      { name: '灵龟岛', note: '碧海仙踪线·河图机关（main-48 窗口）' },
      { name: '东海仙踪', note: '碧海仙踪终段' },
    ],
  },
  {
    id: 'yan-weihuan', name: '燕未还', join: { main: 56, text: '伤魂鸟线·卧秋山后（镇派棒法前置）' },
    quests: [
      { name: '拨云见日', note: '伤魂鸟线' },
      { name: '丐帮大战', note: '青罗山·伤魂鸟决战' },
      { name: '出笼之鸟', note: '伤魂鸟终段' },
      { name: '同游西凉', note: '西凉·好感线' },
    ],
  },
  {
    id: 'xun-yaoyao', name: '荀杳杳', join: { main: 56, text: '伤魂鸟线·谭城戏台相关（玉伯线）' },
    quests: [
      { name: '伤魂调·序曲', note: '伤魂鸟线·谭城' },
      { name: '玉容皓皓', note: '南谕村·玉伯线' },
      { name: '丐帮大战', note: '青罗山' },
    ],
  },
  {
    id: 'leng-ying', name: '冷鹰', join: { main: 60, text: '甘泉苦水·甘泉村（晋升传功期）' },
    quests: [
      { name: '甘泉苦水', note: '传功弟子期·主线 60 段' },
      { name: '穷山据点', note: '甘泉苦水线' },
      { name: '鬼鹰现踪', note: '甘泉苦水线（main-60 窗口）' },
    ],
  },
  {
    id: 'dizui-seng', name: '涤罪僧', join: { main: 60, text: '天水城城墙·甘泉苦水线' },
    quests: [
      { name: '再探苦水', note: '甘泉苦水线·甘泉村' },
      { name: '晦明朝夕', note: '传功期' },
      { name: '韶华轻掷', note: '少林期' },
    ],
  },
  {
    id: 'na-wu', name: '娜乌', join: { main: 35, text: '异种金蝎线·飞蝎使选"赠予"（药圣/商人线自动关闭；唯一饰品线）' },
    quests: [
      { name: '飞蝎使', note: '猴儿林·无名岩洞（赠予=娜乌线）' },
      { name: '千机万发', note: '霹雳门线·娜乌线后续' },
      { name: '接触厂卫', note: '霹雳门线' },
      { name: '大宦童安', note: '霹雳门线（可切磋得夜明珠）' },
    ],
  },
  {
    id: 'shang-tingping', name: '商葶苧', join: { main: 60, text: '药圣线·竹海（异种金蝎药圣线；百善未及一恶次日·武当炼丹房→竹海）' },
    quests: [
      { name: '人面鬼蛛(药圣线)', note: '药圣线·竹海' },
      { name: '晦明朝夕', note: '传功期' },
    ],
  },
  {
    id: 'lian-xin', name: '莲芯', join: { main: 76, text: '姑苏码头·南疆之行（main-76）' },
    quests: [
      { name: '霹雳门余波', note: '南疆期' },
      { name: '行凶者', note: '南疆期' },
      { name: '大宦童安', note: '南疆·童安线' },
    ],
  },
  {
    id: 'gu-sigui', name: '顾思归', join: { main: 78, text: '蔓阴林·初遇；南疆完美线（通幽沼·白唯一线）' },
    quests: [
      { name: '玉容皓皓', note: '南疆·好感线' },
    ],
  },
  {
    id: 'duan-shichen', name: '段朝辰·段履霜', join: { main: 97, text: '通幽沼·南疆后期（main-97）' },
    quests: [{ name: '辞别', note: '南疆后期' }],
  },
  {
    id: 'mo-wen', name: '莫问', join: { main: 115, text: '决战·武当大师兄（天佛大战后）' },
    quests: [{ name: '莫问的喜好', note: '品剑大会期·馈赠线（main-20 窗口）' }],
  },
]

// --- 任务解析 ---
// 优先顺序：refOverride → misc-tasks（misc:<name>）→ quest flow 步骤 id → open_after 主线步
function resolveRef(name, override) {
  if (override) return override
  if (MISC.some((t) => t.name === name)) return `misc:${name}`
  for (const f of FLOWS) {
    if (f.type !== 'quest') continue
    const st = f.steps.find((s) => s.title.replace(/^第 \d+ 步｜/, '') === name)
    if (st) return st.id
  }
  const w = WIN.find((x) => x.quest_norm === name)
  if (w && w.open_after) return `main-${w.open_after}`
  return null
}
function windowOf(name) {
  const w = WIN.find((x) => x.quest_norm === name)
  return w ? { open: w.open_after || null, close: w.close_before || null } : null
}
function miscInfo(name) {
  const t = MISC.find((x) => x.name === name)
  if (!t) return {}
  return {
    trigger: t.trigger || '',
    gains: t.gains || [],
    fav: (t.fav || []).map((f) => ({ who: f.who, val: f.val })),
  }
}

// --- 生成/合并 ---
const outPath = resolve(DIR, 'companions.json')
const prev = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf-8')) : null
const prevMap = prev ? new Map(prev.companions.map((c) => [c.id, c])) : new Map()

const out = []
for (const c of COMPANIONS) {
  const oldC = prevMap.get(c.id)
  if (oldC) {
    // 已有档案：完全保留（手工可编辑），仅当生成器 curated 有更新时提示
    out.push(oldC)
    prevMap.delete(c.id)
    continue
  }
  const quests = c.quests
    .map((q) => {
      const win = windowOf(q.name)
      const info = miscInfo(q.name)
      return {
        name: q.name,
        note: q.note || info.trigger || '',
        trigger: info.trigger || '',
        gains: info.gains,
        fav: info.fav,
        ref: resolveRef(q.name, q.refOverride),
        open: win ? win.open : null,
        close: win ? win.close : null,
      }
    })
    .filter((q) => q.ref)
  const oldest = Math.min(...quests.map((q) => q.open ?? 999))
  out.push({
    id: c.id,
    name: c.name,
    join: { main: c.join.main, text: c.join.text },
    order: oldest,
    quests,
  })
}
// 不在 curated 里的旧档案（保留：用户可能手加了队友）
for (const [id, c] of prevMap) out.push(c)

out.sort((a, b) => (a.join.main - b.join.main) || (a.order - b.order))
writeFileSync(outPath, JSON.stringify({ meta: { model: 'companion', count: out.length, edit: '手工可编辑；已存在条目不被生成器覆盖' }, companions: out }, null, 1), 'utf-8')

let refCount = 0, missing = 0
for (const c of out) for (const q of c.quests) { if (q.ref) refCount++; else missing++ }
console.log(`companions.json: ${out.length} 位队友 / 共 ${out.reduce((s, c) => s + c.quests.length, 0)} 条个人支线（ref ${refCount} 条，未解析 ${missing} 条）`)
for (const c of out) {
  const bad = c.quests.filter((q) => !q.ref)
  if (bad.length) console.log(`  ${c.name}: 未解析跳转 → ${bad.map((q) => q.name).join('、')}`)
}
// 打印对新生成江小彤穿插检查
for (const c of out) if (c.id === 'jiang-xiaotong') console.log('  江小彤 join=', JSON.stringify(c.join), '| quests=', c.quests.map((q) => `${q.name}->${q.ref}`).join(', '))