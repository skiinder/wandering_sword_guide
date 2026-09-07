#!/usr/bin/env node
/**
 * 小型支线任务卡生成器：windows.json 的 misc 任务 + 模板 side 行 → content/misc-tasks.json
 * - 每任务：name / 窗口（open_after/close_before）/ trigger（触发地点+方式，自动提取）/ prereq（前置，自动+curated）
 *           gains（物品收益）/ fav（好感收益：人物+数值）/ steps（模板原文）
 * - curated：模板无任务名的隐藏支线（Excel/用户知识），source='curated'
 * - 生成后【不再覆盖】：文件已存在则仅补充 curated 新增条目（保留手工修订）
 * 编辑方式：直接改 content/misc-tasks.json；重跑本脚本只会补隐藏条目，不覆盖手改内容
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TPL = JSON.parse(readFileSync(resolve(root, 'content/raw/walkthrough.json'), 'utf-8'))
const WIN = JSON.parse(readFileSync(resolve(root, 'content/windows/windows.json'), 'utf-8')).windows
const OUT = resolve(root, 'content/misc-tasks.json')

// 大支线任务名（这些任务属于 quest flow，不进 misc 卡）
const LARGE = new Set([
  '破庙老猿', '东海明珠', '黄金蟹斗', '暮霞双锦', '仙猿山', '海商赵伦', '明珠无瑕', '东海仙踪', '灵龟岛',
  '海寇内应', '百年传承', '钓鱼之王', '蓬莱遗珍-芭蕉扇', '蓬莱遗珍-莲花裳', '蓬莱遗珍-火龙剑',
  '蓬莱遗珍-白玉圭', '蓬莱遗珍-凤凰衫', '蓬莱遗珍-紫竹篮', '蓬莱遗珍-玄铁拐杖', '蓬莱遗珍-无底葫芦',
  '乞丐与宝书', '比武招亲', '和璞山庄', '沙盘演武', '协助叶家兄妹掌握玉枪', '四大武家', '武家旧事', '夤夜访客', '流转',
  '毒蝎夺命', '异种金蝎', '毒物商人', '药圣之约', '飞蝎使', '人面鬼蛛(商人线)', '人面鬼蛛(药圣线)', '人面鬼蛛', '古卷帛书',
  '昏鸦', '镇派棒法', '净衣派', '丐帮之法', '玉容皓皓', '丐帮大战', '幽云泽遇伏', '出笼之鸟', '伤魂调·序曲', '伤魂何处？', '塞外风光',
  '千机万发', '门内生变', '接触厂卫', '大宦童安', '霹雳门余波', '重返霹雳门',
  '甘泉苦水', '诊治裴庆', '穷山据点', '再探苦水', '穷山矿脉', '鬼鹰现踪', '拜谒神鹰门', '甘泉村庆功',
  '绝响难求', '绮罗筵', '慕艾的考验',
])

// 模板 side 行按任务名聚合
const sideByTask = new Map()
for (const s of TPL.sections) for (const l of s.lines) {
  if (l.type === 'side' && l.quest_norm) {
    if (!sideByTask.has(l.quest_norm)) sideByTask.set(l.quest_norm, [])
    sideByTask.get(l.quest_norm).push({ sec: s.id, no: l.main_no || null, text: l.text_plain || l.text || '' })
  }
}
// 场景/小剧情行（隐藏触发的补充线索）
const sceneLines = []
for (const s of TPL.sections) for (const l of s.lines) {
  if ((l.type === 'scene' || l.type === 'note') && (l.text_plain || '').includes('好感度')) sceneLines.push(l.text_plain)
}

// ---- 自动提取 ----
const goRe = /(?:前往|来到|到|进入|去)([\u4e00-\u9fa5]{2,6}?)(?:触发|接取|接受|对话|进入|和|找|询问|拜见|下)|(?:前往|来到)([\u4e00-\u9fa5]{2,6})/
function extractTrigger(text) {
  const t = text.replace(/^支线[^：:]*：?/, '').replace(/^主线/, '')
  const m = goRe.exec(t)
  const where = m ? m[1] || m[2] : null
  const head = t.split(/[→。；]/)[0].trim()
  return where ? `${where}：${head.slice(0, 42)}` : `${head.slice(0, 46)}`
}
const gainRe = /(?:获得|得到|解锁)([^，。；、]*?(?:秘籍|心法|剑法|刀法|棍法|拳法|暗器|图纸|配方|药|丹|酒|图鉴|心得|好感))/g
const favRe = /([\u4e00-\u9fa5]{1,4}?)好感度([+-]?\d+)/g
function extractGains(text) {
  const out = []
  const seen = new Set()
  let m
  gainRe.lastIndex = 0
  while ((m = gainRe.exec(text))) {
    const k = m[1].trim()
    if (k && !seen.has(k)) { seen.add(k); out.push(k) }
  }
  return out.slice(0, 4)
}
function extractFav(text) {
  const out = []
  let m
  favRe.lastIndex = 0
  while ((m = favRe.exec(text))) {
    const who = m[1].trim()
    if (who && who.length <= 4) out.push({ who, val: m[2] })
  }
  return out.slice(0, 4)
}

// ---- curated 隐藏任务（模板无任务名；Excel/用户知识；source=curated） ----
const CURATED = [
  {
    name: '小铜木剑（隐藏）', open_after: 100, close_before: null,
    trigger: '梧桐村·江宅床边走动拾取小彤的木剑（剧情无提示，走到即触发）',
    prereq: '少林剑诀章（离开少林寺后）可拾取；多周目天山决战前可再拾取送小彤',
    gains: ['小彤的木剑（重要道具）'],
    fav: [{ who: '江小彤', val: '+10（阎浮镇送还额外+10）' }],
    steps: [
      '梧桐村：江宅床边走动拿到小彤的木剑（R11：柱子旁重要道具，解锁镇山心法相关图鉴）',
      '阎浮镇右上民宅：将木剑交还江小彤（五仙圣女任务前置）',
      '旧主线天山决战前：再往梧桐村拾取木剑并送给小彤（决战后解锁金蛇之诺 / 重回梧桐村图鉴）',
    ],
    source: 'curated',
  },
  {
    name: '霸刀秦烈的抉择（隐藏）', open_after: 23, close_before: null,
    trigger: '幽云泽渡口·左上方触发剧情：霸刀秦烈中毒求救',
    prereq: '主线推进至幽云泽渡口段（badger 段）',
    gains: [],
    fav: [{ who: '江小彤', val: '+20（选择"不救"）' }],
    steps: [
      '幽云泽渡口左上方见到中毒的霸刀秦烈，选择"不救"→ 江小彤好感度+20；选择"救"则无此收益',
    ],
    source: 'curated',
  },
]

// ---- 组装 ----
const tasks = []
if (existsSync(OUT)) {
  // 保留手工修订：只合并 curated 新增，其余不动
  const old = JSON.parse(readFileSync(OUT, 'utf-8'))
  tasks.push(...old.tasks)
  const names = new Set(old.tasks.map((t) => t.name))
  for (const c of CURATED) if (!names.has(c.name)) tasks.push(c)
} else {
  for (const w of WIN) {
    if (LARGE.has(w.quest_norm)) continue
    const lines = sideByTask.get(w.quest_norm) || []
    const text = lines.map((l) => l.text).join('\n')
    tasks.push({
      name: w.quest_norm,
      open_after: w.open_after,
      close_before: w.close_before,
      trigger: extractTrigger(text || w.quest_norm),
      prereq: '',
      gains: extractGains(text),
      fav: extractFav(text),
      steps: lines.map((l) => `${l.text}`),
      source: 'template',
    })
  }
  tasks.push(...CURATED)
}
tasks.sort((a, b) => (a.open_after || 0) - (b.open_after || 0) || a.name.localeCompare(b.name, 'zh'))
writeFileSync(OUT, JSON.stringify({ meta: { model: 'misc-tasks', count: tasks.length, edit: '手工可编辑此文件；重跑脚本仅补充 curated 隐藏条目，不覆盖手改' }, tasks }, null, 1), 'utf-8')
const trig = tasks.filter((t) => !t.trigger).length
console.log(`misc-tasks.json: ${tasks.length} 个任务卡（无 trigger 的 ${trig} 个待补）`)
const noFav = tasks.filter((t) => !t.fav.length).length
console.log(`无好感收益标注 ${noFav} 个；无物品收益标注 ${tasks.filter((t) => !t.gains.length).length} 个（可后续手工补）`)
for (const t of tasks.slice(0, 6)) console.log(' -', t.name, '| 触发:', (t.trigger || '?').slice(0, 40), '| 收益:', t.gains.slice(0, 2).join('/'))