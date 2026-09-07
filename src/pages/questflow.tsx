import { useState } from 'preact/hooks'
import type { GuideData } from '../types'
import { StepCard, MiscBlock } from '../components'
import { useProgress } from '../store'
import { nav } from '../router'
import { hrefForRef, refLabel } from '../data'

export function QuestFlow({ data, id, step, misc: miscAnchor }: { data: GuideData; id: string; step?: string; misc?: string }) {
  const flow = data.flowById.get(id)
  const { progress, toggle } = useProgress()
  const [openMisc, setOpenMisc] = useState<string | null>(miscAnchor || null)
  if (!flow) return <div class="load-state">未找到支线：{id}</div>

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
  const doneCount = flow.steps.filter((s) => done(s.id)).length

  // 关联主线：从步骤出链中收集 main 章
  const mainLinks = new Set<string>()
  for (const s of flow.steps)
    for (const o of s.out || []) if (!o.unresolved && /^main-/.test(o.ref)) mainLinks.add(o.ref)

  return (
    <div class="flow-page">
      <div class="flow-head quest-head">
        <button class="back-btn" onClick={() => nav('#/')}>‹ 返回</button>
        <h1 class="serif">{flow.title}</h1>
        <div class="flow-meta">
          大型支线 · 独立完整流程 {flow.steps.length} 步 · 已完成 {doneCount}
          <div class="progress-track">
            <div class="progress-fill" style={{ width: `${flow.steps.length ? (doneCount / flow.steps.length) * 100 : 0}%` }} />
          </div>
        </div>
        {mainLinks.size ? (
          <div class="links">
            <span class="pill-label">主线锚点：</span>
            {[...mainLinks].slice(0, 12).map((r) => {
              const h = hrefForRef(r, data)
              return (
                <span class="pill strong" key={r} onClick={() => h && nav(h)} role="link" tabIndex={0}>
                  ↗ {refLabel(r, data)}
                </span>
              )
            })}
          </div>
        ) : null}
      </div>

      {flow.steps.map((s) => (
        <div id={`step-${s.id}`} key={s.id}>
          <StepCard step={s} kind="quest" data={data} done={done(s.id)} onToggle={toggleStep} />
        </div>
      ))}

      {flow.id === 'quest-旧主线' ? (
        <div class="misc-section">
          <h2 class="serif">本章小型支线 <span class="dim">({(data.miscByChapter.get(flow.id) || []).length})</span></h2>
          {(data.miscByChapter.get(flow.id) || []).map((t) => (
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