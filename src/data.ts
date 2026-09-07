import type { Companion, ExtEntry, Flow, GuideData, MiscTask, QuestWindow, Walkthrough } from './types'

export const GROUP_ORDER = ['入门之前', '入门弟子', '晋升资深', '晋升精英', '晋升传功', '晋升执法', '烟尘回响']

// 大型支线任务名（与 tools/quest-map.mjs 保持一致；用于区分小型支线）
const LARGE_QUEST_TASKS = new Set([
  // 碧海仙踪
  '破庙老猿', '东海明珠', '黄金蟹斗', '暮霞双锦', '仙猿山', '海商赵伦', '明珠无瑕', '东海仙踪', '灵龟岛',
  '海寇内应', '百年传承', '钓鱼之王', '蓬莱遗珍-芭蕉扇', '蓬莱遗珍-莲花裳', '蓬莱遗珍-火龙剑',
  '蓬莱遗珍-白玉圭', '蓬莱遗珍-凤凰衫', '蓬莱遗珍-紫竹篮', '蓬莱遗珍-玄铁拐杖', '蓬莱遗珍-无底葫芦',
  // 武家旧事
  '乞丐与宝书', '比武招亲', '和璞山庄', '沙盘演武', '协助叶家兄妹掌握玉枪', '四大武家', '武家旧事', '夤夜访客', '流转',
  // 异种金蝎
  '毒蝎夺命', '异种金蝎', '毒物商人', '药圣之约', '飞蝎使', '人面鬼蛛(商人线)', '人面鬼蛛(药圣线)', '人面鬼蛛', '古卷帛书',
  // 伤魂鸟
  '昏鸦', '镇派棒法', '净衣派', '丐帮之法', '玉容皓皓', '丐帮大战', '幽云泽遇伏', '出笼之鸟', '伤魂调·序曲', '伤魂何处？', '塞外风光',
  // 霹雳门
  '千机万发', '门内生变', '接触厂卫', '大宦童安', '霹雳门余波', '重返霹雳门',
  // 甘泉苦水
  '甘泉苦水', '诊治裴庆', '穷山据点', '再探苦水', '穷山矿脉', '鬼鹰现踪', '拜谒神鹰门', '甘泉村庆功',
  // 绮罗筵
  '绝响难求', '绮罗筵', '慕艾的考验',
])

let cache: Promise<GuideData> | null = null

function buildIndex(flowsData: GuideData['flows'], wt: Walkthrough, windows: QuestWindow[], external: ExtEntry[], companions: Companion[], miscTasks: MiscTask[]): GuideData {
  const flowById = new Map<string, Flow>()
  const stepOwner = new Map<string, Flow>()
  for (const f of flowsData.flows) {
    flowById.set(f.id, f)
    for (const s of f.steps) stepOwner.set(s.id, f)
  }
  const mainChapters = flowsData.flows.filter((f) => f.type === 'main').sort((a, b) => a.order - b.order)
  const questFlows = flowsData.flows.filter((f) => f.type === 'quest').sort((a, b) => a.order - b.order)

  // 小型支线索引：按 main 步所在章分组（open_after 落在该章 main 范围）
  const rangeOf = new Map<string, [number, number]>()
  for (const f of mainChapters) {
    const nos = f.steps.map((s) => parseInt(s.id.replace(/^main-/, ''), 10)).filter((n) => !Number.isNaN(n))
    if (nos.length) rangeOf.set(f.id, [Math.min(...nos), Math.max(...nos)])
  }
  // 旧主线章（quest 61-75）
  const oldMain = flowsData.flows.find((f) => f.id === 'quest-旧主线')
  if (oldMain) {
    const nos = oldMain.steps.map((s) => parseInt(s.id.replace(/^main-/, ''), 10)).filter((n) => !Number.isNaN(n))
    if (nos.length) rangeOf.set(oldMain.id, [Math.min(...nos), Math.max(...nos)])
  }

  const sideByTask = new Map<string, string[]>()
  for (const sec of wt.sections) for (const l of sec.lines) {
    if (l.type === 'side' && l.quest_norm) {
      if (!sideByTask.has(l.quest_norm)) sideByTask.set(l.quest_norm, [])
      sideByTask.get(l.quest_norm)!.push(l.text_plain || l.text || '')
    }
  }

  // 小型支线任务卡（misc-tasks.json 权威，含 curated 隐藏任务）：open_after 落章
  const miscByChapter = new Map<string, MiscTask[]>()
  const allMisc: MiscTask[] = []
  for (const w of miscTasks) {
    allMisc.push(w)
    if (LARGE_QUEST_TASKS.has(w.name)) continue
    const owner = [...rangeOf.entries()].find(([, [lo, hi]]) => w.open_after >= lo && w.open_after <= hi)
    if (!owner) continue
    const key = owner[0]
    if (!miscByChapter.has(key)) miscByChapter.set(key, [])
    miscByChapter.get(key)!.push({
      name: w.name,
      open_after: w.open_after,
      close_before: w.close_before,
      trigger: w.trigger || '',
      prereq: w.prereq || '',
      gains: w.gains || [],
      fav: w.fav || [],
      steps: w.steps && w.steps.length ? w.steps : sideByTask.get(w.name) || [],
    })
  }
  for (const [, arr] of miscByChapter) arr.sort((a, b) => a.open_after - b.open_after)

  return {
    flows: flowsData,
    walkthrough: wt,
    windows,
    external,
    companions,
    flowById,
    stepOwner,
    mainChapters,
    questFlows,
    miscByChapter,
    miscTasks: allMisc,
  }
}

export function loadGuide(): Promise<GuideData> {
  if (!cache) {
    cache = (async () => {
      const B = import.meta.env.BASE_URL // GitHub Pages 子路径部署（如 /wandering_sword_guide/）
      const [flows, wt, win, ext, comp, misc] = await Promise.all([
        fetch(`${B}data/flows.json`).then((r) => r.json()),
        fetch(`${B}data/walkthrough.json`).then((r) => r.json()),
        fetch(`${B}data/windows.json`).then((r) => r.json()),
        fetch(`${B}data/external.json`).then((r) => r.json()),
        fetch(`${B}data/companions.json`).then((r) => r.json()),
        fetch(`${B}data/misc-tasks.json`).then((r) => r.json()),
      ])
      return buildIndex(flows, wt, win.windows, ext.entries || [], comp.companions || [], misc.tasks || [])
    })()
  }
  return cache
}

// 链接目标：stepId / flowId / misc:<任务名> → hash href
export function hrefForRef(ref: string, data: GuideData): string | null {
  if (ref.startsWith('misc:')) {
    const name = ref.slice(5)
    for (const [flowId, arr] of data.miscByChapter) {
      if (arr.some((t) => t.name === name)) {
        const f = data.flowById.get(flowId)!
        const page = f.type === 'quest' ? 'quest' : 'main'
        return `#/${page}/${encodeURIComponent(f.id)}?misc=${encodeURIComponent(name)}`
      }
    }
    const t = data.miscTasks.find((x) => x.name === name)
    if (t) {
      // 不在任何章归属（窗口晚于全部主线步等）：落回其窗口主轴步所在章
      const owner = data.mainChapters.find((f) => {
        const nos = f.steps.map((s) => parseInt(s.id.replace(/^main-/, ''), 10)).filter((n) => !Number.isNaN(n))
        return nos.length && t.open_after >= Math.min(...nos) && t.open_after <= Math.max(...nos)
      })
      if (owner) return `#/main/${encodeURIComponent(owner.id)}?misc=${encodeURIComponent(name)}`
    }
    return null
  }
  const owner = data.stepOwner.get(ref)
  if (owner) {
    const page = owner.type === 'quest' && owner.id === 'quest-旧主线' ? 'quest' : owner.type
    return `#/${page === 'main' ? 'main' : 'quest'}/${encodeURIComponent(owner.id)}${owner.steps.length ? '?step=' + encodeURIComponent(ref) : ''}`
  }
  if (data.flowById.has(ref)) {
    const f = data.flowById.get(ref)!
    return `#/${f.type === 'main' ? 'main' : 'quest'}/${encodeURIComponent(f.id)}`
  }
  return null
}

// 链接胶囊的友好文案：main-24 → 品剑大会·往右走*3…；quest-碧海仙踪 → 碧海仙踪；misc:xx → 支线任务 xx
export function refLabel(ref: string, data: GuideData): string {
  if (ref.startsWith('misc:')) {
    const name = ref.slice(5)
    const t = data.miscTasks.find((x) => x.name === name)
    return t ? `支线 · ${t.name}` : name
  }
  const owner = data.stepOwner.get(ref)
  if (owner) {
    const st = owner.steps.find((s) => s.id === ref)
    const t = st ? st.title.replace(/^(主线 \d+｜|第 \d+ 步｜)/, '') : ref
    return `${owner.title}·${t}`
  }
  const f = data.flowById.get(ref)
  if (f) return f.title
  return ref
}

export function groupOf(f: Flow): string {
  return f.group || '其他'
}

// 主线步骤编号
export function mainNoOf(stepId: string): number | null {
  const m = /^main-(\d+)$/.exec(stepId)
  return m ? parseInt(m[1], 10) : null
}

export function textParts(text: string): string[] {
  return text.split('\n').filter((s) => s.trim())
}