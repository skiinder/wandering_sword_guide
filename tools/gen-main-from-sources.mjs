#!/usr/bin/env node
/**
 * 主线流程生成器：模板 walkthrough.json 的主线 122 步 → content/flows/main/*.md
 * - 每步 text 用模板原文（verbatim）
 * - 自动标题：取首段动作
 * - 窗口双向链接：windows.json 的任务 open_after/close_before → 主线步自动加 window/link 行
 * - 存档点/队友入队：综合 Excel 推断（本文件内 curated 字典）
 * 覆盖写入（main/ 由本脚本权威生成）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TPL = JSON.parse(readFileSync(resolve(root, 'content/raw/walkthrough.json'), 'utf-8'))
const WIN = JSON.parse(readFileSync(resolve(root, 'content/windows/windows.json'), 'utf-8')).windows
const DIR = resolve(root, 'content/flows/main')

// ---- 章节配置（12 个主线章 + 组） ----
const CHAPTERS = [
  { file: '01-初出茅庐', id: 'main-01-初出茅庐', title: '初出茅庐', group: '入门之前', order: 1, range: [1, 9] },
  { file: '02-洛村剿匪', id: 'main-02-洛村剿匪', title: '洛村剿匪', group: '入门之前', order: 2, range: [10, 12] },
  { file: '03-初入武当', id: 'main-03-初入武当', title: '初入武当', group: '入门弟子', order: 3, range: [13, 13] },
  { file: '04-晋升资深', id: 'main-04-晋升资深', title: '晋升资深', group: '晋升资深', order: 4, range: [14, 20] },
  { file: '05-品剑大会', id: 'main-05-品剑大会', title: '品剑大会', group: '晋升精英', order: 5, range: [21, 35] },
  { file: '06-关外风云', id: 'main-06-关外风云', title: '关外风云', group: '晋升精英', order: 6, range: [36, 46] },
  { file: '07-中原事宜', id: 'main-07-中原事宜', title: '中原事宜', group: '晋升精英', order: 7, range: [47, 48] },
  { file: '08-晋升传功', id: 'main-08-晋升传功', title: '晋升传功', group: '晋升传功', order: 8, range: [49, 60] },
  { file: '09-南疆风云', id: 'main-09-南疆风云', title: '南疆风云', group: '晋升执法', order: 9, range: [76, 99] },
  { file: '10-少林剑诀', id: 'main-10-少林剑诀', title: '少林剑诀', group: '晋升执法', order: 10, range: [100, 107] },
  { file: '11-天佛大战', id: 'main-11-天佛大战', title: '天佛大战', group: '晋升执法', order: 11, range: [108, 114] },
  { file: '12-决战玉龙', id: 'main-12-决战玉龙', title: '决战玉龙', group: '烟尘回响', order: 12, range: [115, 122] },
]

// ---- 存档点（main_no → 提示，综合 Excel 推断） ----
const SAVES = {
  4: '山洞前存档：学剑法/刀法/拳法三选一（S/L 后二周目继承可全解锁）',
  18: '幽云泽渡口前进档：避免乱逛误触发南疆商人支线',
  29: '名剑山庄品剑大会前存档（欧阳雪/冷鹰玉佩相关剧情）',
  48: '碧海仙踪图鉴·存个档（步微月线队友全在队 / 缺一人 两个图鉴分支）',
  61: '旧主线图鉴分支点存档（执法弟子后→名剑山庄前）',
  76: '南疆凤凰洞守门战前存档（极难模式两个成就）',
  99: '娜乌追击白唯一战前存档（极难 24 回合内胜利成就）',
  114: '万佛窟·童安/清霄剧情前存档',
}
// ---- 队友入队（main_no → 队友名，综合 Excel 推断） ----
const RECRUITS = {
  4: '卫霍（梧桐村·全程升级）',
  6: '江小彤（后山山洞·江小彤线）',
  12: '瑶姬/红衣少女（碗子山·初遇）',
  13: '上官虹（平康城-碧幽林·初遇）',
  14: '大师兄莫弃（武当·清河疑云）＋铁蛋（清河村·毒蝎夺命）',
  15: '白锦（洛村·重回碗子山）',
  18: '李元兴（莲心湖·初遇）＋冷无情（雷家村大支线·初遇）',
  20: '孔亮（少林·血河神鉴·品剑大会前必须）＋吕仙儿/叶云/叶银瓶（姑苏·比武招亲）',
  24: '司马玲（青木舫·画舫轻歌）',
  29: '欧阳雪（名剑山庄·品剑大会）＋瑶姬（名剑山庄后·正式入队）',
  36: '瑶姬（峋谷关·方阔海线）',
  46: '冷无情（姑苏·再遇无情后正式入队）',
  48: '步微月（仙云渡→东海·碧海仙踪线）',
  56: '燕未还＋荀杳杳＋李元兴（伤魂鸟线·卧秋山后）',
  60: '冷鹰（甘泉村·甘泉苦水）＋涤罪僧（天水城城墙）＋娜乌（霹雳门后）＋商葶苧（药圣线·竹海）',
  76: '莲芯（姑苏渡口·南疆之行）＋顾思归（蔓阴林·初遇）',
  96: '段朝辰＋段履霜（通幽沼·南疆后期）',
  115: '莫问（决战·大师兄）',
}

// ---- 任务 → 大型支线映射（共享显式表） ----
import { questOf } from './quest-map.mjs'
// ---- Excel 内容补全（综合小黑盒模板 + Excel 攻略差异细节） ----
import { loadExcel, attachMain } from './excel-fill.mjs'

// 主线行按 main_no 索引
const mainLines = {}
for (const s of TPL.sections) for (const l of s.lines) if (l.type === 'main' && l.main_no) mainLines[l.main_no] = l

// Excel 补全预计算
const excelRows = loadExcel().filter((r) => r.row > 1)
const mainTexts = new Map()
for (const n of Object.keys(mainLines)) mainTexts.set(Number(n), mainLines[n].text_plain || mainLines[n].text || '')
const stepOrderArr = Object.keys(mainLines).map(Number).sort((a, b) => a - b)
const excelFill = attachMain(mainTexts, excelRows, stepOrderArr)
let excelFillCount = 0

// 任务窗口按 main 步归并
const closingAt = {}, openingAt = {}
for (const w of WIN) {
  const q = questOf(w.quest)
  const tag = q || 'misc'
  ;(closingAt[w.close_before] = closingAt[w.close_before] || []).push({ name: w.quest, q, tag })
  ;(openingAt[w.open_after] = openingAt[w.open_after] || []).push({ name: w.quest, q, tag })
}

function autoTitle(mainNo, text) {
  let t = text.replace(/^主线/, '').replace(/^剧情后?/, '')
  const m = t.split(/[→。：]/)[0].trim().slice(0, 16)
  return `主线 ${mainNo}${m ? '｜' + m : ''}`
}

mkdirSync(DIR, { recursive: true })
let totalSteps = 0
for (const ch of CHAPTERS) {
  const [lo, hi] = ch.range
  const lines = []
  for (let n = lo; n <= hi; n++) if (mainLines[n]) lines.push({ n, l: mainLines[n] })
  if (!lines.length) continue
  const blocks = []
  for (const { n, l } of lines) {
    const ext = []
    const saves = l.saves.length ? `存档：${l.saves.join('、')}` : null
    const imps = l.imps.length ? `必选：${l.imps.join('、')}` : null
    const drops = l.drops.length ? `掉落：${l.drops.join('、')}` : null
    const badges = [saves, imps, drops].filter(Boolean)
    const closing = (closingAt[n] || []).filter((c) => c.tag !== 'misc')
    const closingMisc = (closingAt[n] || []).filter((c) => c.tag === 'misc')
    const opening = (openingAt[n] || []).filter((o) => o.tag !== 'misc')
    const openingMisc = (openingAt[n] || []).filter((o) => o.tag === 'misc')
    const meta = []
    if (closing.length) {
      const links = closing.map((c) => (c.q ? `[[${c.q}]]` : c.name)).join('、')
      meta.push(`> window: ⚠ 本步前需完成（关闭窗口）：${links}`)
    }
    if (closingMisc.length) meta.push(`> window: ⚠ 本步前完成小型支线：${closingMisc.map((c) => c.name).join('、')}`)
    if (opening.length) meta.push(`> link: 本步后开启：${opening.map((c) => (c.q ? `[[${c.q}]]` : c.name)).join('、')}`)
    if (openingMisc.length) meta.push(`> link: 本步后开启小型支线：${openingMisc.map((c) => c.name).join('、')}`)
    if (SAVES[n]) meta.push(`> 存档：${SAVES[n]}`)
    if (RECRUITS[n]) meta.push(`> 队友入队：${RECRUITS[n]}`)
    for (const f of excelFill.get(n) || []) {
      meta.push(`> ${f}`) // 补全：/存档： 前缀已由 excel-fill 生成
      excelFillCount++
    }
    for (const b of badges) meta.push(`> ${b}`)
    const body = l.text_plain || l.text || ''
    blocks.push(`## [main-${n}] ${autoTitle(n, body)}\n\n${meta.join('\n')}\n\n${body}`)
  }
  const fm = `---\nid: ${ch.id}\ntype: main\ntitle: ${ch.title}\ngroup: ${ch.group}\norder: ${ch.order}\nsource: 模板主线步 ${lo}–${hi} + Excel 存档/队友 enrichment\n---\n`
  const out = `${fm}\n${blocks.join('\n\n')}\n`
  writeFileSync(resolve(DIR, `${ch.file}.md`), out, 'utf-8')
  totalSteps += lines.length
  console.log(`main/${ch.file}.md: ${lines.length} 步`)
}
console.log(`done: ${CHAPTERS.length} 章 / ${totalSteps} 步 / Excel 补全 ${excelFillCount} 条`)