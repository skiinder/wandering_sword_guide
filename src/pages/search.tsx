import type { GuideData } from '../types'
import { nav } from '../router'
import { hrefForRef } from '../data'

// 搜索：主线步 / 大支线步 / 小型支线 / 准备传承 / 备注成就（全部数据）
export function Search({ data, q }: { data: GuideData; q: string }) {
  const key = q.trim().toLowerCase()
  const hits: { kind: string; title: string; sub: string; href: string }[] = []

  if (key) {
    for (const f of data.flows.flows) {
      for (const s of f.steps) {
        if ((s.title + s.text + (s.window || '')).toLowerCase().includes(key)) {
          hits.push({ kind: 'step', title: `${f.title} · ${s.title}`, sub: brief(s.text), href: `#/${f.type === 'main' ? 'main' : 'quest'}/${encodeURIComponent(f.id)}?step=${encodeURIComponent(s.id)}` })
        }
      }
    }
    for (const [, tasks] of data.miscByChapter) {
      for (const t of tasks) {
        if (t.name.toLowerCase().includes(key) || t.steps.some((x) => x.includes(q))) {
          hits.push({ kind: 'misc', title: `小型支线 · ${t.name}`, sub: t.steps[0] ? brief(t.steps[0]) : '', href: '' })
        }
      }
    }
    for (const b of data.walkthrough.prep) {
      for (const it of b.items) {
        if (it.text.toLowerCase().includes(key) || b.title.toLowerCase().includes(key)) {
          hits.push({ kind: 'prep', title: `${b.title} · ${it.cat}`, sub: brief(it.text), href: '#/prep' })
        }
      }
    }
  }

  return (
    <div class="search-page">
      <div class="flow-head">
        <button class="back-btn" onClick={() => nav('#/')}>‹ 返回</button>
        <h1 class="serif">搜索：{q}</h1>
      </div>
      {key ? (
        hits.length ? (
          <div class="hits">
            {hits.slice(0, 80).map((h, i) => (
              <div class="card hit-card" key={i} onClick={() => h.href && nav(h.href)} role="link" tabIndex={0}>
                <div class="hit-kind">{h.kind === 'step' ? '流程' : h.kind === 'misc' ? '小型支线' : '传承'}</div>
                <div>
                  <div class="hit-title">{h.title}</div>
                  <div class="hit-sub dim">{h.sub}</div>
                </div>
              </div>
            ))}
            {hits.length > 80 ? <p class="dim center">仅显示前 80 条（共 {hits.length}）</p> : null}
          </div>
        ) : (
          <p class="center dim">没有找到与「{q}」相关的内容</p>
        )
      ) : (
        <p class="center dim">输入关键词搜索流程步骤、任务或道具</p>
      )}
    </div>
  )
}

function brief(t: string): string {
  const s = t.replace(/^支线|^主线|^备注/, '').trim()
  return s.length > 60 ? s.slice(0, 60) + '…' : s
}