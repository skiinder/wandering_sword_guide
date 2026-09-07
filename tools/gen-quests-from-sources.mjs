#!/usr/bin/env node
/**
 * 大型支线生成器：模板 side 行（按任务聚合、按时序排序）→ content/flows/quest/*.md
 * - 每任务步骤 text 用模板原文（verbatim），顺序按 main_no/区块 递增
 * - window 元行 = 该任务在 windows.json 的 open_after/close_before（main 步锚点）
 * - 硬关闭事实（网络核查）以 curated 字典写入首步 window
 * - 旧主线 = 模板 s18 主线步 61–75（Q1：旧主线视为大型支线）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TPL = JSON.parse(readFileSync(resolve(root, 'content/raw/walkthrough.json'), 'utf-8'))
const WIN = JSON.parse(readFileSync(resolve(root, 'content/windows/windows.json'), 'utf-8')).windows
const EXT = JSON.parse(readFileSync(resolve(root, 'content/windows/external.json'), 'utf-8'))
const DIR = resolve(root, 'content/flows/quest')

// ---- 8 个大型支线配置 ----
const QUESTS = [
  {
    abbr: 'bihai', id: 'quest-碧海仙踪', title: '碧海仙踪', group: '入门弟子', order: 1,
    hardClose: 'DLC 官方说明：主线进南疆前必须触发完成（[[main-76]] 前）；开启=拜师武当后（[[main-13]] 后）',
    windowFacts: '开启：拜师武当后（[[main-13]]）；主线进南疆前（[[main-76]]）必须完成全流程',
  },
  {
    abbr: 'wujia', id: 'quest-武家旧事', title: '武家旧事', group: '入门弟子', order: 2,
    hardClose: 'DLC 官方说明：主线进不风山前必须触发（[[main-43]]）；和璞山庄沙盘演武后暂时关闭；玄火后续需完美霹雳门（认识厂卫）',
    windowFacts: '开启：拜师武当后、姑苏吕仙儿比武招亲前（[[main-20]] 前）',
  },
  {
    abbr: 'jinxie', id: 'quest-异种金蝎', title: '异种金蝎', group: '入门弟子', order: 3,
    hardClose: '三线互斥：飞蝎使选"赠予"=娜乌线（药圣/商人线自动关闭）；选"交换"无法娜乌线；全游戏仅 1 只异种金蝎',
    windowFacts: '开启：清河村毒蝎夺命（[[main-14]] 后）',
  },
  {
    abbr: 'shanghun', id: 'quest-伤魂鸟', title: '伤魂鸟', group: '晋升精英', order: 4,
    hardClose: '硬关闭点未证实（待核）；解锁燕未还/荀杳杳/李元兴；前置：镇派棒法、乌天瘤（名剑山庄欧阳献公）',
    windowFacts: '开启：主线送丹药段后（欧阳雪受伤）谭城戏台（[[main-35]] 附近）',
  },
  {
    abbr: 'pilimen', id: 'quest-霹雳门', title: '霹雳门', group: '晋升精英', order: 5,
    hardClose: '跳过=进入旧主线的唯一条件；无超时关闭证据（待核）；完成得惔神秘鉴/娜乌入队',
    windowFacts: '开启：精英弟子期（[[main-21]] 后）',
  },
  {
    abbr: 'ganguan', id: 'quest-甘泉苦水', title: '甘泉苦水', group: '晋升传功', order: 6,
    hardClose: '无硬关闭证据（待核，疑执法前）；关联掌门结局与冷鹰/涤罪僧入队；[[main-60]] 段',
    windowFacts: '开启：传功弟子期（[[main-49]] 后）；冷鹰/涤罪僧入队线',
  },
  {
    abbr: 'qiluo', id: 'quest-绮罗筵', title: '绮罗筵', group: '晋升传功', order: 7,
    hardClose: '绝响难求（欧阳雪曲谱）：晋升传功后→晋升执法前必须完成（名剑山庄）；掌门结局关联',
    windowFacts: '开启：传功弟子期（[[main-49]] 后）',
  },
  {
    abbr: 'oldmain', id: 'quest-旧主线', title: '旧主线（大型支线）', group: '晋升传功', order: 8,
    fromMain: [61, 75],
    hardClose: '跳过霹雳门进入旧主线（唯一条件）；执法弟子后→名剑山庄前=图鉴分支点；5 存档点多周目轮转',
    windowFacts: '窗口：进入条件=[[quest-霹雳门]] 跳过；图鉴分支=执法后名剑山庄前',
  },
]

// 该支线覆盖的任务名集合
import { TASK_TO_QUEST } from './quest-map.mjs'
// ---- Excel 内容补全 ----
import { loadExcel, attachQuest } from './excel-fill.mjs'
const excelRows = loadExcel().filter((r) => r.row > 1)
function tasksOf(qid) {
  return Object.keys(TASK_TO_QUEST).filter((t) => TASK_TO_QUEST[t] === qid)
}
// 任务名 → 归属支线
function questOf(task) {
  return TASK_TO_QUEST[task] || null
}

mkdirSync(DIR, { recursive: true })
for (const q of QUESTS) {
  let steps = []
  if (q.fromMain) {
    // 旧主线：s18 主线步
    const lines = []
    for (const s of TPL.sections) for (const l of s.lines) {
      if (l.type === 'main' && l.main_no >= q.fromMain[0] && l.main_no <= q.fromMain[1]) lines.push({ n: l.main_no, l })
    }
    lines.sort((a, b) => a.n - b.n)
    steps = lines.map(({ n, l }, i) => ({
      id: `main-${n}`, // 沿用全局主线编号，保证 [[main-61..75]] 可解析
      title: `主线 ${n}｜旧主线`,
      text: l.text_plain || l.text || '',
      window: i === 0 ? q.windowFacts : '',
      save: l.saves.length ? `存档：${l.saves.join('、')}` : null,
      imp: l.imps.length ? `必选：${l.imps.join('、')}` : null,
      drop: l.drops.length ? `掉落：${l.drops.join('、')}` : null,
    }))
  } else {
    // 聚合 side 行
    const hits = []
    const tset = new Set(tasksOf(q.id))
    for (const s of TPL.sections) for (const l of s.lines) {
      if (l.type === 'side' && l.quest_norm && tset.has(l.quest_norm)) hits.push({ sec: s, l })
    }
    hits.sort((a, b) => (a.l.main_no || 0) - (b.l.main_no || 0) || a.sec.id - b.sec.id)
    // 同区块同任务相邻行合并为一步
    let stepNo = 0
    for (const { sec, l } of hits) {
      const prev = steps[steps.length - 1]
      const sameSeg = prev && prev.secId === sec.id && prev.quest === l.quest_norm
      const title = `第 ${stepNo + 1} 步｜${l.quest_norm}`
      if (sameSeg) {
        prev.text += `\n${l.text_plain || l.text || ''}`
        if (l.saves.length) prev.save = `存档：${l.saves.join('、')}`
        if (l.imp) prev.imp = `必选：${l.imp.join('、')}`
      } else {
        stepNo++
        steps.push({
          id: `${q.abbr}-${stepNo}`,
          secId: sec.id,
          quest: l.quest_norm,
          title,
          text: l.text_plain || l.text || '',
          window: '',
          save: l.saves.length ? `存档：${l.saves.join('、')}` : null,
          imp: l.imps.length ? `必选：${l.imps.join('、')}` : null,
          drop: l.drops.length ? `掉落：${l.drops.join('、')}` : null,
          winOpen: null, winClose: null,
        })
      }
    }
    // 窗口信息：查 windows.json 的对应任务
    for (const st of steps) {
      const w = WIN.find((x) => x.quest === st.quest)
      if (w && (w.open_after || w.close_before)) {
        const bits = []
        if (w.open_after) bits.push(`开启：[[main-${w.open_after}]] 后`)
        if (w.close_before) bits.push(`[[main-${w.close_before}]] 前需完成`)
        st.window = bits.join('；')
      }
    }
  }

  // 组装 md
  const fill = attachQuest(steps, excelRows)
  const blocks = steps.map((s, i) => {
    const meta = []
    if (i === 0 && q.hardClose) meta.push(`> window: 🔒 硬关闭：${q.hardClose}`)
    if (s.window) meta.push(`> window: ${s.window}`)
    for (const b of [s.save, s.imp, s.drop]) if (b) meta.push(`> ${b}`)
    for (const f of fill.get(s.id) || []) meta.push(`> ${f}`) // Excel 补全
    return `## [${s.id}] ${s.title}\n\n${meta.length ? meta.join('\n') + '\n\n' : ''}${s.text}`
  })
  const fm = `---\nid: ${q.id}\ntype: quest\ntitle: ${q.title}\ngroup: ${q.group}\norder: ${q.order}\nsource: 模板聚合 + 窗口核查\n---\n`
  writeFileSync(resolve(DIR, `${q.title}.md`), `${fm}\n${blocks.join('\n\n')}\n`, 'utf-8')
  console.log(`quest/${q.title}.md: ${steps.length} 步`)
}

// 统计未归属 side 行（= 小型支线，前端 misc 用）
const covered = new Set()
for (const q of QUESTS) for (const k of tasksOf(q.id)) covered.add(k)
const allSide = new Set()
for (const s of TPL.sections) for (const l of s.lines) if (l.type === 'side' && l.quest_norm) allSide.add(l.quest_norm)
const misc = [...allSide].filter((t) => !questOf(t))
console.log(`\n大型支线覆盖 ${covered.size} 个任务名；剩余小型支线任务 ${misc.length} 个`)
console.log('EXT loaded:', Object.keys(EXT))