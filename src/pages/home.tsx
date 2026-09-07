import type { GuideData } from '../types'
import { GROUP_ORDER, groupOf } from '../data'
import { nav } from '../router'

export function Home({ data }: { data: GuideData }) {
  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    mains: data.mainChapters.filter((f) => groupOf(f) === g),
    quests: data.questFlows.filter((f) => groupOf(f) === g),
  })).filter((g) => g.mains.length || g.quests.length)

  return (
    <div class="home">
      <div class="hero">
        <h1 class="serif">逸剑风云决 · 全流程攻略</h1>
        <p class="hero-sub">以武当弟子身份为索引 · 主线 / 大型支线 / 小型支线 · 离线可用</p>
      </div>

      <div class="entry-row">
        <div class="card entry-card" onClick={() => nav('#/companions')} role="link" tabIndex={0}>
          <div class="entry-emoji">🧑‍🤝‍🧑</div>
          <div class="step-body">
            <div class="m-title">队友档案</div>
            <div class="m-body dim">按人分：入队条件 + 个人支线清单</div>
          </div>
          <div class="chev">›</div>
        </div>
        <div class="card entry-card" onClick={() => nav('#/prep')} role="link" tabIndex={0}>
          <div class="entry-emoji">📜</div>
          <div class="step-body">
            <div class="m-title">准备 · 传承</div>
            <div class="m-body dim">开局设置 · 传承继承 · 存档点 · 速通专题</div>
          </div>
          <div class="chev">›</div>
        </div>
      </div>

      {groups.map((g) => (
        <section class="group" key={g.name}>
          <div class="group-head">
            <span class="group-dot" />
            <h2 class="serif">{g.name}</h2>
            <span class="group-count">{g.mains.length + g.quests.length} 流程</span>
          </div>

          {g.mains.map((f) => (
            <div class="card main-chapter" key={f.id} onClick={() => nav(`#/main/${encodeURIComponent(f.id)}`)} role="link" tabIndex={0}>
              <div class="seqnum">{String(f.order).padStart(2, '0')}</div>
              <div class="step-body">
                <div class="m-title">{f.title}</div>
                <div class="m-body dim">
                  主线流程 {f.steps.length} 步 · {f.source.replace('模板主线步 ', '')}
                </div>
              </div>
              <div class="chev">›</div>
            </div>
          ))}

          {g.quests.map((f) => (
            <div class="card quest-chapter" key={f.id} onClick={() => nav(`#/quest/${encodeURIComponent(f.id)}`)} role="link" tabIndex={0}>
              <div class="q-tag">支线</div>
              <div class="step-body">
                <div class="q-title">{f.title}</div>
                <div class="m-body dim">大型支线 · 独立完整流程 {f.steps.length} 步</div>
              </div>
              <div class="chev">›</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}