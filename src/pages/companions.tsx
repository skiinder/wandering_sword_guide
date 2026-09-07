import { useEffect } from 'preact/hooks'
import type { GuideData, Companion } from '../types'
import { hrefForRef } from '../data'
import { nav } from '../router'
import { FavLink } from '../components'

// 队友档案：按人分——入队条件 + 个人支线（含触发/收益/好感）
export function Companions({ data, id }: { data: GuideData; id?: string }) {
  const list = data.companions || []

  useEffect(() => {
    if (!id) return
    const el = document.getElementById(`comp-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1600)
    }
  }, [id])

  return (
    <div class="companions-page">
      <div class="flow-head">
        <button class="back-btn" onClick={() => nav('#/')}>‹ 返回</button>
        <h1 class="serif">队友档案</h1>
        <div class="flow-meta">
          按人分：入队条件 + 个人支线 {list.reduce((s, c) => s + c.quests.length, 0)} 条 · 共 {list.length} 位队友
        </div>
      </div>

      {list.map((c) => (
        <CompanionCard key={c.id} c={c} data={data} />
      ))}
    </div>
  )
}

function CompanionCard({ c, data }: { c: Companion; data: GuideData }) {
  const joinHref = hrefForRef(`main-${c.join.main}`, data)
  return (
    <div class="card comp-card" id={`comp-${c.id}`}>
      <div class="comp-head">
        <h2 class="serif comp-name">{c.name}</h2>
        <span class="comp-join" onClick={() => joinHref && nav(joinHref)} role="link" tabIndex={0}>
          🧑‍🤝‍🧑 入队：主线 {c.join.main} · {c.join.text}
        </span>
      </div>
      <ul class="comp-quests">
        {c.quests.map((q, i) => {
          const h = q.ref ? hrefForRef(q.ref, data) : null
          return (
            <li key={i}>
              <span class="comp-q-name" onClick={() => h && nav(h)} role="link" tabIndex={0} title={q.ref ? '跳转到对应步骤' : '无跳转目标'}>
                {q.name}
              </span>
              {q.open || q.close ? (
                <span class="comp-win">
                  {q.open ? `主线 ${q.open} 后开启` : ''}
                  {q.close ? ` · 主线 ${q.close} 前` : ''}
                </span>
              ) : null}
              {q.note ? <span class="comp-note">{q.note}</span> : null}
              {q.gains && q.gains.length ? (
                <span class="comp-gains">🎁 {q.gains.join('、')}</span>
              ) : null}
              {q.fav && q.fav.length ? (
                <span class="comp-favs">
                  💗 {q.fav.map((f, j) => <FavLink key={j} who={f.who} val={f.val} data={data} />)}
                </span>
              ) : null}
              {h ? <span class="comp-chev" onClick={() => nav(h)} role="link" tabIndex={0}>›</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}