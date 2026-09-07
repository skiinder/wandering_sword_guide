import type { GuideData } from '../types'
import { nav } from '../router'

export function Prep({ data }: { data: GuideData }) {
  const { walkthrough, external } = data

  // 存档点总览
  const saves: { main_no: number; secTitle: string; text: string }[] = []
  for (const sec of walkthrough.sections) {
    for (const l of sec.lines) {
      if (l.saves?.length) {
        saves.push({ main_no: l.main_no || 0, secTitle: sec.title, text: (l.text || '').slice(0, 46) })
      }
    }
  }
  const saveHref = (n: number) => {
    const owner = data.stepOwner.get(`main-${n}`)
    if (!owner) return '#/search/' + encodeURIComponent(String(n))
    return `#/${owner.type === 'main' ? 'main' : 'quest'}/${encodeURIComponent(owner.id)}?step=${encodeURIComponent('main-' + n)}`
  }

  // 速通专题区块（模板 s3 旧主线速通 / s19 新主线速通）
  const speedSecs = walkthrough.sections.filter((s) => s.id === 3 || s.id === 19)

  return (
    <div class="page">
      <div class="sec-head">
        <button class="round-back" onClick={() => nav('#/')} aria-label="返回">‹</button>
        <div>
          <h1>准备 · 传承</h1>
          <p class="sec-group">开局前 · 基于 v{walkthrough.meta.game_version}</p>
        </div>
      </div>

      {walkthrough.prep.map((blk) => (
        <section class="prep-card" key={blk.title}>
          <h2>{blk.title}</h2>
          {blk.caption && <p class="prep-cap">{blk.caption}</p>}
          <ul class="prep-list">
            {blk.items.map((it, i) => (
              <li key={i}>
                {it.cat && <span class={`cat-${it.cat}`}>{it.cat}</span>}
                <span>{it.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section class="prep-card">
        <h2>窗口核查（外部来源）</h2>
        <p class="prep-cap">官方说明与网络核查的大支线开启/关闭</p>
        <ul class="prep-list">
          {external.map((e) => (
            <li key={e.id}>
              <span class={`status-chip ${e.status}`}>{e.status === 'confirmed' ? '✓' : '待核'}</span>
              <span>
                <b>{e.name}</b>：{e.notes || e.evidence?.slice(0, 60)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section class="prep-card">
        <h2>存档点总览（{saves.length}）</h2>
        <p class="prep-cap">建议在这些节点存档/读档（多周目轮转）</p>
        <ul class="prep-list">
          {saves.map((s, i) => (
            <li key={i}>
              <span class="save-chip" onClick={() => nav(saveHref(s.main_no))} role="link">
                步{s.main_no} · {s.secTitle}
              </span>
              <span class="save-text" onClick={() => nav(saveHref(s.main_no))} role="link">
                {s.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {speedSecs.map((s) => (
        <section class="prep-card" key={s.id}>
          <h2>速通专题 · {s.title}</h2>
          <p class="prep-cap">编号步骤（含存档点与分支选择）</p>
          {s.lines.map((l, i) => (
            <div class="speed-line" key={i}>
              {l.no && <span class="speed-no">{l.no}</span>}
              <span>{l.text_plain || l.text}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}