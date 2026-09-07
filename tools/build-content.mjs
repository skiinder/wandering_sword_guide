#!/usr/bin/env node
/**
 * v2 内容管线：content/flows 下的 md → public/data/flows.json
 * 解析 front matter / 步骤（含别名）/ 出链 [[...]] / window / link 元行 → 回链索引
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FLOWS = resolve(root, 'content/flows')
const OUT = resolve(root, 'public/data/flows.json')

function parseFrontMatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/)
    if (kv) meta[kv[1]] = kv[2].trim()
  }
  return { meta, body: text.slice(m[1].length + 4) }
}

function parseSteps(body, flowId) {
  // 步骤块：## [alias] 标题 或 ## 标题
  const re = /^##\s*(?:\[([\w:-]+)\])?\s*(.*)$/gm
  const heads = []
  let m
  while ((m = re.exec(body)) !== null) heads.push({ idx: m.index, alias: m[1] || '', title: m[2].trim(), end: m.index + m[0].length })
  if (!heads.length) return []
  const steps = []
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].idx : body.length
    const raw = body.slice(h.end, end)
    const id = h.alias || `${flowId}:${i + 1}`
    // 元行
    const windowM = raw.match(/^> window:\s*(.*)$/m)
    const linkM = []
    const linkRe = /^> link:\s*(.*)$/gm
    let lm
    while ((lm = linkRe.exec(raw)) !== null) linkM.push(lm[1].trim())
    const windowText = windowM ? windowM[1].trim() : ''
    // 注意：window/link/补全 文本**保留 [[...]]**，前端用 renderRefs 渲染为可点击胶囊
    // 其他元行：> 存档：/必选：/掉落：/队友入队：/补全：
    const tags = {}
    const tagRe = /^>\s*(存档|必选|掉落|队友入队|来源|补充|补全)：?\s*(.*)$/gm
    let tm
    while ((tm = tagRe.exec(raw)) !== null) {
      const key = { 存档: 'save', 必选: 'imp', 掉落: 'drop', 队友入队: 'team', 来源: 'src', 补充: 'fill', 补全: 'fill' }[tm[1]]
      ;(tags[key] = tags[key] || []).push(tm[2].trim())
    }
    // 正文：去掉纯元行
    const text = raw
      .split('\n')
      .filter((l) => !/^>\s*(window|link|存档|必选|掉落|队友入队|来源|补充|补全)：?/.test(l.trim()))
      .join('\n')
      .trim()
    steps.push({
      id,
      seq: i + 1,
      title: h.title || `第 ${i + 1} 步`,
      text,
      window: windowText,
      links: linkM,
      tags,
      out: extractLinks(text + ' ' + windowText + ' ' + linkM.join(' ')),
    })
  })
  return steps
}

function extractLinks(s) {
  const out = []
  const re = /\[\[([^\[\]]+)\]\]/g
  let m
  while ((m = re.exec(s)) !== null) out.push(m[1].trim())
  return out
}

function collect() {
  const files = []
  for (const dir of ['main', 'quest', 'misc']) {
    const d = resolve(FLOWS, dir)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d)) {
      if (f.endsWith('.md')) files.push(resolve(d, f))
    }
  }
  files.sort()
  return files
}

const flows = []
const stepIndex = new Map() // stepId -> {flow, seq, title}
const outIndex = new Map() // flowId -> stepId[]

for (const file of collect()) {
  const raw = readFileSync(file, 'utf-8')
  const { meta, body } = parseFrontMatter(raw)
  const flowId = meta.id || basename(file, '.md')
  const dir = basename(dirname(file))
  meta.type = meta.type || dir
  const steps = parseSteps(body, flowId)
  flows.push({ id: flowId, title: meta.title || flowId, type: meta.type, group: meta.group || '', order: Number(meta.order || 0), source: meta.source || '', steps })
  for (const s of steps) {
    stepIndex.set(s.id, { flow: flowId, seq: s.seq, title: s.title })
  }
}

// 解析出链 → 目标 step
function resolveTarget(ref) {
  // ref: "flow:seq" | "flow#alias" | "flow" | "alias"(全局) | "flow-N"（flow 内第 N 步）
  let flow = ref, seq = null, alias = null
  if (ref.includes(':')) { const [a, b] = ref.split(':'); flow = a; seq = b ? Number(b) : null; if (!Number.isFinite(seq)) { alias = b; seq = null } }
  else if (ref.includes('#')) { const [a, b] = ref.split('#'); flow = a; alias = b }
  if (flow && stepIndex.has(flow)) return { kind: 'step', stepId: flow, ...stepIndex.get(flow) }
  if (flow && alias && stepIndex.has(alias)) return { kind: 'step', stepId: alias, ...stepIndex.get(alias) }
  if (flow && seq) {
    const f = flows.find((x) => x.id === flow)
    if (f && f.steps[seq - 1]) { const s = f.steps[seq - 1]; return { kind: 'step', stepId: s.id, flow: f.id, seq: s.seq, title: s.title } }
  }
  // flow-N 简写
  const m = /^([A-Za-z0-9_-]+)-(\d+)$/.exec(flow || '')
  if (m) {
    const f = flows.find((x) => x.id === m[1] || x.id === `main-${m[1]}`)
    if (f && f.steps[Number(m[2]) - 1]) { const s = f.steps[Number(m[2]) - 1]; return { kind: 'step', stepId: s.id, flow: f.id, seq: s.seq, title: s.title } }
  }
  // flow 级（章首）
  const f = flows.find((x) => x.id === flow || x.title === flow)
  if (f) return { kind: 'flow', flow: f.id, title: f.title }
  return { kind: 'unresolved', ref }
}

// 构建回链 + 规范化出链
for (const f of flows) {
  for (const s of f.steps) {
    s.out = s.out.map((ref) => {
      const t = resolveTarget(ref)
      if (t.kind === 'unresolved') return { ref, unresolved: true }
      return { ...t, ref }
    })
    s.back = [] // 填充于第二轮
  }
}
const backMap = new Map()
for (const f of flows) {
  for (const s of f.steps) {
    for (const o of s.out) {
      if (!o.unresolved && o.kind === 'step') {
        if (!backMap.has(o.stepId)) backMap.set(o.stepId, [])
        backMap.get(o.stepId).push({ flow: f.id, stepId: s.id, title: s.title })
      }
    }
  }
}
for (const f of flows) for (const s of f.steps) s.back = backMap.get(s.id) || []

const out = {
  meta: { model: 'v2', builtAt: new Date().toISOString().slice(0, 10), flows: flows.length, steps: flows.reduce((n, f) => n + f.steps.length, 0) },
  flows,
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf-8')
console.log(`flows.json: ${out.meta.flows} flows / ${out.meta.steps} steps → ${OUT}`)
for (const u of collectUnresolved(out)) console.warn('⚠️ 未解析链接:', u)
function collectUnresolved(o) {
  const r = []
  for (const f of o.flows) for (const s of f.steps) for (const l of s.out) if (l.unresolved) r.push(`${f.id}:${s.id} → ${l.ref}`)
  return r
}