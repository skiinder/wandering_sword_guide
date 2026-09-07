#!/usr/bin/env node
/**
 * 素材底稿导出（只读参考，不参与 build）：
 *  1) content/flows/_draft/sNN-标题.md        —— 每章全行（含类型注释）
 *  2) content/flows/_draft/大支线-xxx.md      —— 大型支线任务按关键词聚合
 * 用途：整理成 content/flows/{main,quest}/*.md 时的底稿；Excel 到来后对照补充。
 */
import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RAW = resolve(root, 'content/raw/walkthrough.json')
const DRAFT = resolve(root, 'content/flows/_draft')

const data = JSON.parse(readFileSync(RAW, 'utf-8'))
const TYPE_LABEL = { main: '主线', side: '支线', note: '备注', ach: '成就', scene: '小剧情', sect: '门派', choice: '分支', step: '速通步' }

function fmtLine(l) {
  const tag = TYPE_LABEL[l.type] || l.type
  const ext = []
  if (l.saves?.length) ext.push(`[存档:${l.saves.join(',')}]`)
  if (l.imps?.length) ext.push(`[必选:${l.imps.join(',')}]`)
  if (l.drops?.length) ext.push(`[掉落:${l.drops.join(',')}]`)
  const q = l.quest ? `（任务：${l.quest}）` : ''
  const mn = l.main_no ? ` #${l.main_no}` : ''
  return `- **${tag}${mn}**${q} ${l.text_plain} ${ext.join(' ')}`
}

// 1) 按章导出
mkdirSync(DRAFT, { recursive: true })
for (const sec of data.sections) {
  const lines = sec.lines.map(fmtLine).join('\n')
  writeFileSync(
    resolve(DRAFT, `s${String(sec.id).padStart(2, '0')}-${sec.title}.md`),
    `# s${sec.id} · ${sec.title}\n（素材底稿，来源：模板区块；类型=主线/支线/备注/成就/小剧情/门派/分支/速通步）\n\n${lines}\n`,
    'utf-8'
  )
}

// 2) 大型支线聚合
const QUESTS = {
  '碧海仙踪': ['碧海仙踪', '东海仙踪', '明珠', '灵龟岛', '步微月', '提举司', '浪川剑', '码头', '破庙老猿', '海商赵伦', '黄金蟹斗', '钓鱼之王'],
  '武家旧事': ['武家旧事', '和璞山庄', '沙盘演武', '瑶姬', '四大武家', '武家', '比武招亲', '乞丐与宝书', '仙猿山', '南宫家', '杨家', '上官家', '慕容家', '香菱'],
  '异种金蝎': ['金蝎', '毒蝎', '飞蝎使', '猴儿林', '娜乌', '药圣', '莫离', '鬼鹰', '苦水'],
  '伤魂鸟': ['伤魂鸟', '龚进', '天鸣村', '南渔村', '紫竹林', '青罗山', '燕未还', '镇派棒法', '乌天瘤'],
  '霹雳门': ['霹雳门', '千机万发', '门内生变', '厂卫', '童安', '宝库', '汤统'],
  '甘泉苦水': ['甘泉苦水', '竹海', '甘泉村', '神鹰门', '苦水村', '程钰'],
  '绮罗筵': ['绮罗筵', '慕艾', '混沌宝典', '绝响难求', '名剑山庄', '欧阳雪', '白锦', '冷鹰', '商葶苧'],
  '旧主线': ['旧主线', '速通', '二周目', '继承', '图鉴', '莫问', '李元兴', '打狗棍法'],
}

const questAgg = {}
for (const [qName, kws] of Object.entries(QUESTS)) {
  const hits = []
  for (const sec of data.sections) {
    for (const l of sec.lines) {
      const hay = `${l.text_plain || ''} ${l.quest || ''}`
      if (kws.some((k) => hay.includes(k))) hits.push({ sec, l })
    }
  }
  questAgg[qName] = hits
}

for (const [qName, hits] of Object.entries(questAgg)) {
  const body = hits
    .map(({ sec, l }) => `**s${sec.id}·${sec.title}** ${fmtLine(l)}`)
    .join('\n')
  writeFileSync(resolve(DRAFT, `大支线-${qName}.md`), `# 大型支线素材聚合：${qName}（${hits.length} 行）\n\n${body}\n`, 'utf-8')
}

console.log('export done:')
console.log(` 章节草稿 ${data.sections.length} 份`)
console.log(` 大支线聚合 ${Object.keys(questAgg).length} 份`)
for (const [q, h] of Object.entries(questAgg)) console.log(`  ${q}: ${h.length} 行`)