import type { GuideData, MiscTask, Step } from './types'
import { hrefForRef, refLabel, textParts } from './data'
import { nav } from './router'

// ---------- 徽章 ----------
export function Badges({ step }: { step: Step }) {
  const t = step.tags || {}
  const items: [string, string, string][] = []
  for (const s of t.save || []) items.push(['save', '存 档', s])
  for (const i of t.imp || []) items.push(['imp', '必 选', i])
  for (const d of t.drop || []) items.push(['drop', '掉 落', d])
  if (!items.length) return null
  return (
    <div class="badges">
      {items.map(([k, label, txt]) => (
        <span class={`bd bd-${k}`} title={txt}>
          {label}
        </span>
      ))}
    </div>
  )
}

// ---------- 队友入队提示 ----------
export function TeamTag({ step }: { step: Step }) {
  const team = (step.tags && step.tags.team) || []
  if (!team.length) return null
  return (
    <div class="teamline">
      {team.map((t, i) => (
        <span key={i}>🧑‍🤝‍🧑 {t}</span>
      ))}
    </div>
  )
}

// ---------- 窗口条 ----------
export function WindowBar({ step, data }: { step: Step; data: GuideData }) {
  if (!step.window) return null
  return <div class="window">⚠ {linkify(step.window, data)}</div>
}

// ---------- 链接胶囊 ----------
export function LinkPills({ step, data }: { step: Step; data: GuideData }) {
  const outs = step.out || []
  if (!outs.length) return null
  return (
    <div class="links">
      {outs.map((o, i) => {
        const h = o.unresolved ? null : hrefForRef(o.ref, data)
        const label = `↗ ${h ? refLabel(o.ref, data) : o.ref}`
        return h ? (
          <span class="pill" key={i} onClick={() => nav(h)} role="link" tabIndex={0}>
            {label}
          </span>
        ) : (
          <span class="pill unresolved" key={i} title="链接目标未生成">
            {label}
          </span>
        )
      })}
    </div>
  )
}

// ---------- 关联说明（step.links 元行，含 [[...]] 内联引用） ----------
export function LinkNotes({ step, data }: { step: Step; data: GuideData }) {
  const links = step.links || []
  if (!links.length) return null
  return (
    <div class="link-notes">
      {links.map((l, i) => (
        <div class="link-note" key={i}>
          {linkify(l, data)}
        </div>
      ))}
    </div>
  )
}

// ---------- Excel 补充信息块（tags.fill，跨文档差异细节） ----------
export function FillBlock({ step }: { step: Step }) {
  const fill = (step.tags && step.tags.fill) || []
  if (!fill.length) return null
  return (
    <div class="fillin">
      <div class="fillin-label">📋 补充信息</div>
      {fill.map((f, i) => (
        <p key={i}>{f}</p>
      ))}
    </div>
  )
}

// ---------- 回链区 ----------
export function BackLinks({ step, data }: { step: Step; data: GuideData }) {
  const backs = step.back || []
  if (!backs.length) return null
  return (
    <div class="back">
      <span class="back-label">← 从这些步骤跳入：</span>
      {backs.map((b, i) => {
        const h = hrefForRef(b.stepId, data)
        return (
          <a
            key={i}
            href={h || '#'}
            onClick={(e) => {
              if (h) {
                e.preventDefault()
                nav(h)
              }
            }}
          >
            {refLabel(b.stepId, data)}
          </a>
        )
      })}
    </div>
  )
}

// ---------- 链接化文本：把 [[ref]] 渲染为可点击胶囊 ----------
export function linkify(text: string, data: GuideData) {
  const parts = text.split(/(\[\[[^\[\]]+\]\])/)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((p, i) => {
        if (!p.startsWith('[[')) return <span key={i}>{p}</span>
        const ref = p.slice(2, -2)
        const h = hrefForRef(ref, data)
        return h ? (
          <a class="ref" key={i} href={h} onClick={(e) => { e.preventDefault(); nav(h) }}>
            ↗ {refLabel(ref, data)}
          </a>
        ) : (
          <span class="ref-ref" key={i} title={`链接目标未生成：${ref}`}>
            {ref}
          </span>
        )
      })}
    </>
  )
}

// ---------- 步骤卡 ----------
export function StepCard({ step, kind, data, done, onToggle }: { step: Step; kind: 'main' | 'quest'; data: GuideData; done: boolean; onToggle: (id: string) => void }) {
  const cls = kind === 'main' ? 'card main-card' : 'card quest-card'
  return (
    <div class={`${cls}${done ? ' done' : ''}`} onClick={() => onToggle(step.id)}>
      {kind === 'main' ? (
        <div class="seqnum">{String(step.seq).padStart(2, '0')}</div>
      ) : (
        <div class="q-step">第 {step.seq} 步</div>
      )}
      <div class="step-body">
        <div class={kind === 'main' ? 'm-title' : 'q-title'}>{step.title}</div>
        <WindowBar step={step} data={data} />
        <div class={kind === 'main' ? 'm-body' : 'q-body'}>
          {textParts(step.text).map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
        <TeamTag step={step} />
        <Badges step={step} />
        <LinkNotes step={step} data={data} />
        <FillBlock step={step} />
        <LinkPills step={step} data={data} />
        <BackLinks step={step} data={data} />
      </div>
    </div>
  )
}

// ---------- 小型支线任务卡 ----------
// 关键信息（触发位置/前置/收益/好感）默认可见；完整步骤可折叠展开
export function MiscBlock({ task, open, onToggle, data }: { task: MiscTask; open: boolean; onToggle: () => void; data: GuideData }) {
  const name = task.name
  const cid = `misc-${name}`
  return (
    <div class="misc card" id={cid} data-misc={name}>
      <div class="t" onClick={onToggle} role="button" tabIndex={0}>
        <span class="misc-dot">▸</span> {name}
        {task.close_before ? <span class="misc-window"> · 主线步 {task.close_before} 前</span> : null}
      </div>
      <div class="misc-info">
        {task.trigger ? (
          <p class="mi"><span class="mi-k">📍 触发</span><span class="mi-v">{task.trigger}</span></p>
        ) : null}
        {task.prereq ? (
          <p class="mi"><span class="mi-k">🔒 前置</span><span class="mi-v">{task.prereq}</span></p>
        ) : null}
        {task.gains && task.gains.length ? (
          <p class="mi"><span class="mi-k">🎁 收益</span><span class="mi-v">{task.gains.join('、')}</span></p>
        ) : null}
        {task.fav && task.fav.length ? (
          <p class="mi"><span class="mi-k">💗 好感</span>
            <span class="mi-v">
              {task.fav.map((f, i) => (
                <FavLink key={i} who={f.who} val={f.val} data={data} />
              ))}
            </span>
          </p>
        ) : null}
      </div>
      {open ? (
        <div class="misc-body">
          {task.steps.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      ) : (
        <p class="misc-hint" onClick={onToggle} role="button" tabIndex={0}>展开查看完整步骤</p>
      )}
    </div>
  )
}

// 好感收益 → 人物页链接（companions.json 按名字找档案）
export function FavLink({ who, val, data }: { who: string; val: string; data: GuideData }) {
  const comp = (data.companions || []).find((c) => c.name.includes(who) || who.includes(c.name.replace(/（.*$/, '')))
  const h = comp ? `#/companions/${comp.id}` : '#/companions'
  return (
    <a
      class="fav-link"
      href={h}
      onClick={(e) => { e.preventDefault(); nav(h) }}
      title={`好感度收益 · 查看 ${who} 档案`}
    >
      {who} {val}
    </a>
  )
}