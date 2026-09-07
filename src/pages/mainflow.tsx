import { useState } from 'preact/hooks'
import type { GuideData } from '../types'
import { StepCard, MiscBlock } from '../components'
import { useProgress } from '../store'
import { nav } from '../router'

export function MainFlow({ data, id, step, misc: miscAnchor }: { data: GuideData; id: string; step?: string; misc?: string }) {
  const flow = data.flowById.get(id)
  const { progress, toggle } = useProgress()
  const [openMisc, setOpenMisc] = useState<string | null>(miscAnchor || null)
  if (!flow) return <div class="load-state">未找到流程：{id}</div>

  const misc = data.miscByChapter.get(flow.id) || []

  const goTarget = () => {
    if (step) {
      const el = document.getElementById(`step-${step}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (miscAnchor) {
      const el = document.getElementById(`misc-${miscAnchor}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.classList.add('flash')
        setTimeout(() => el.classList.remove('flash'), 1600)
      }
    }
  }
  if (step || miscAnchor) setTimeout(goTarget, 80)

  const done = (sid: string) => !!progress[`s:${sid}`]
  const toggleStep = (sid: string) => toggle(`s:${sid}`)

  // 章内窗口汇总：本步前关闭的小型支线（已在各步 window 提示，此处不再重复）
  const doneCount = flow.steps.filter((s) => done(s.id)).length

  return (
    <div class="flow-page">
      <div class="flow-head">
        <button class="back-btn" onClick={() => nav('#/')}>‹ 返回</button>
        <h1 class="serif">{flow.title}</h1>
        <div class="flow-meta">
          主线流程 · {flow.steps.length} 步 · 已完成 {doneCount}
          <div class="progress-track">
            <div class="progress-fill" style={{ width: `${flow.steps.length ? (doneCount / flow.steps.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {flow.steps.map((s) => (
        <div id={`step-${s.id}`} key={s.id}>
          <StepCard step={s} kind="main" data={data} done={done(s.id)} onToggle={toggleStep} />
        </div>
      ))}

      {misc.length ? (
        <div class="misc-section">
          <h2 class="serif">本章小型支线 <span class="dim">({misc.length})</span></h2>
          <p class="tag-note">在主线流程中出现处完整展示，点任务名展开步骤</p>
          {misc.map((t) => (
            <MiscBlock
              key={t.name}
              task={t}
              data={data}
              open={openMisc === t.name}
              onToggle={() => setOpenMisc(openMisc === t.name ? null : t.name)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}