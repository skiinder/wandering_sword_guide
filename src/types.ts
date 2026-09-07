// v2 数据模型（flows.json 驱动）

export interface StepLinkRef {
  ref: string
  kind: 'step' | 'flow' | 'unresolved'
  stepId?: string
  flow?: string
  seq?: number
  title?: string
  unresolved?: boolean
}

export interface Step {
  id: string
  seq: number
  title: string
  text: string
  window: string
  links: string[]
  tags: { save?: string[]; imp?: string[]; drop?: string[]; team?: string[]; src?: string[]; fill?: string[] }
  out: StepLinkRef[]
  back: { flow: string; stepId: string; title: string }[]
}

export interface Flow {
  id: string
  title: string
  type: 'main' | 'quest' | 'misc'
  group: string
  order: number
  source: string
  steps: Step[]
}

export interface FlowsData {
  meta: { model: string; builtAt: string; flows: number; steps: number }
  flows: Flow[]
}

// ---- 旧模型（prep / misc 用） ----
export interface Line {
  type: string
  text?: string
  text_plain?: string
  main_no?: number
  quest?: string
  quest_norm?: string
  no?: string
  saves?: string[]
  imps?: string[]
  drops?: string[]
}

export interface Section {
  id: number
  title: string
  lines: Line[]
}

export interface PrepItem {
  cat: string
  text: string
}
export interface PrepBlock {
  title: string
  caption: string
  items: PrepItem[]
}
export interface Walkthrough {
  meta: { game_version: string; main_step_count: number }
  prep: PrepBlock[]
  sections: Section[]
}

export interface QuestWindow {
  quest: string
  quest_norm: string
  open_after: number
  close_before: number | null
  occurrences: number
  chapters: [number, string][]
}
export interface ExtEntry {
  id: string
  name: string
  open: string
  open_anchor: number | null
  close: string
  close_anchor: number | null
  status: 'confirmed' | 'pending'
  evidence: string
  urls: string[]
  notes: string
}

// 小型支线任务卡（content/misc-tasks.json 权威）：每章 flow → 该章可接的小型支线
export interface MiscFav { who: string; val: string }
export interface MiscTask {
  name: string
  open_after: number
  close_before: number | null
  trigger: string // 触发地点+方式（自动提取/手工修订）
  prereq: string // 前置条件
  gains: string[] // 物品收益
  fav: MiscFav[] // 好感收益
  steps: string[] // 完整步骤文本（模板 side 行）
}

// ---- 队友档案（content/companions.json） ----
export interface CompanionQuest {
  name: string // 模板任务名
  note: string // 触发条件/说明（Excel 线索）
  trigger: string // 触发地点+方式
  gains: string[] // 物品收益
  fav: MiscFav[] // 好感收益
  ref: string | null // 跳转 stepId / misc:<任务名> / main-N（前端 hrefForRef 解析）
  open: number | null
  close: number | null
}
export interface Companion {
  id: string
  name: string
  join: { main: number; text: string }
  order: number
  quests: CompanionQuest[]
}

export interface GuideData {
  flows: FlowsData
  walkthrough: Walkthrough
  windows: QuestWindow[]
  external: ExtEntry[]
  companions: Companion[]
  flowById: Map<string, Flow>
  stepOwner: Map<string, Flow>
  mainChapters: Flow[]
  questFlows: Flow[]
  miscByChapter: Map<string, MiscTask[]>
  miscTasks: MiscTask[]
}