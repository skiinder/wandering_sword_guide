/**
 * Excel 内容补全共享工具
 * - loadExcel(): content/raw/excel.json（243 行：loc/story/unlock/fav）
 * - subsOf(): 子步拆分（按 1、2、… 及换行）
 * - classify(): 主线/支线/存档/info 分类
 * - attachMain(): 主线步挂载（只挂 主线子步 + 存档子步 + 解锁行）
 * - attachQuest(): 大支线步挂载（按任务名匹配 Excel 行）
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let cache = null
export function loadExcel() {
  if (!cache) cache = JSON.parse(readFileSync(resolve(root, 'content/raw/excel.json'), 'utf-8'))
  return cache
}

export function subsOf(story) {
  return String(story || '')
    .split(/\n|(?=\d{1,2}[、．.])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

export function classify(sub) {
  if (sub.includes('支线')) return 'side'
  if (sub.includes('主线')) return 'main'
  if (sub.includes('存档')) return 'save'
  return 'info'
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s)
const overlap = (a, b) => {
  const k = a.slice(0, 12)
  return k.length > 4 && b.includes(k)
}
// info 子步的挂载关键词（信息密度过滤：纯场景描写不挂）
const INFO_KEYS = ['存档', '图鉴', '宝箱', '秘籍', '解锁', '好感', '支线', '机关', '守门', '成就', '得', '入队', '隐藏', '秘密', '传承', '系数']

/**
 * 主线步挂载：按地点锚定 main_no（行序传播），
 * 挂 主线子步（含'主线'字样）+ 存档子步 + 解锁行 + 含关键词的 info 子步
 * @param mainTexts Map<main_no, string> 主线步原文
 * @param rows excel.json 行
 * @param stepOrder number[] 按 main_no 递增
 * @returns Map<main_no, string[]> 每步的 补全/存档 行
 */
export function attachMain(mainTexts, rows, stepOrder) {
  const out = new Map()
  let cursor = stepOrder[0] || 0
  const globalSeen = new Set() // 跨行去重（前 12 字）
  const push = (n, line) => {
    const k = line.replace(/^(补全|存档)：/, '').slice(0, 12)
    if (globalSeen.has(k)) return
    globalSeen.add(k)
    if (!out.has(n)) out.set(n, [])
    const arr = out.get(n)
    if (arr.length < 5) arr.push(line)
  }
  for (const r of rows) {
    // loc 分段锚定：优先能命中主线文本的分段
    const locParts = (r.loc || '').split(/[\s\n\-·]/).filter(Boolean)
    let anchor = null
    for (const part of locParts) {
      if (part.length < 2 || part === '地点' || part === '大地图' || part === '大地' || part === '关键节点' || part === '节点') continue
      const found = stepOrder.find((n) => (mainTexts.get(n) || '').includes(part))
      if (found != null) { anchor = found; break }
    }
    if (anchor != null) cursor = anchor
    const locShort = (locParts[0] || '').trim()
    // 子步分类挂载
    const unlockLine = (r.unlock || '').replace(/\n/g, '；').trim()
    for (const sub of subsOf(r.story)) {
      const kind = classify(sub)
      const t = mainTexts.get(cursor) || ''
      if (kind === 'side') continue // 支线子步交给 quest/companion
      if (kind === 'main') {
        if (!overlap(sub, t)) push(cursor, `补充：${locShort}·${clip(sub, 150)}`)
      } else if (kind === 'save') {
        if (!t.includes('存档') && !overlap(sub, t)) push(cursor, `补充：${clip(sub, 120)}`)
      } else if (INFO_KEYS.some((k) => sub.includes(k))) {
        if (!overlap(sub, t)) push(cursor, `补充：${locShort}·${clip(sub, 130)}`)
      }
    }
    // 解锁行（该地点的一次性解锁信息）
    if (unlockLine && unlockLine !== '秘籍、技能解锁' && !overlap(unlockLine, mainTexts.get(cursor) || '')) {
      push(cursor, `补充：${locShort}·解锁：${clip(unlockLine, 150)}`)
    }
  }
  return out
}

/**
 * 大支线步挂载：按任务名匹配 Excel 行
 * @param steps [{id, quest?, text}] quest=模板任务名
 * @param rows excel.json 行
 * @returns Map<stepId, string[]>
 */
export function attachQuest(steps, rows) {
  const out = new Map()
  for (const st of steps) {
    if (!st.quest) continue
    const name = st.quest
    const hits = rows.filter((r) => (r.loc || '').includes(name) || ((r.story || '').includes(name) && !(r.story || '').includes('主线')))
    const picked = hits.slice(0, 2)
    const lines = []
    for (const r of picked) {
      const subs = subsOf(r.story)
      for (let i = 0; i < Math.min(2, subs.length); i++) {
        const s = subs[i]
        if (s.includes('主线') && s.includes('支线')) continue
        if (overlap(s, st.text)) continue
        lines.push(`补充：${(r.loc || '').split(/\s|\n/)[0]}·${clip(s, 170)}`)
        if (lines.length >= 2) break
      }
      if (lines.length >= 2) break
      if (!lines.length && r.unlock) lines.push(`补充：${(r.loc || '').split(/\s|\n/)[0]}·解锁：${clip(r.unlock.replace(/\n/g, '；'), 150)}`)
    }
    if (lines.length) out.set(st.id, lines)
  }
  return out
}