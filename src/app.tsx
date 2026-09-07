import { useEffect, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import type { GuideData } from './types'
import { loadGuide } from './data'
import { useProgress } from './store'
import { useHash, parseHash, nav } from './router'
import { Home } from './pages/home'
import { MainFlow } from './pages/mainflow'
import { QuestFlow } from './pages/questflow'
import { Prep } from './pages/prep'
import { Companions } from './pages/companions'
import { Search } from './pages/search'

export function App(): JSX.Element {
  const hash = useHash()
  const route = parseHash(hash)
  const { progress } = useProgress() // 保持 store 订阅（进度 icon 等）
  const [data, setData] = useState<GuideData | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadGuide().then(setData).catch((e) => setErr(String(e)))
  }, [])

  const submit = (e: Event) => {
    e.preventDefault()
    const q = query.trim()
    if (q) nav(`#/search/${encodeURIComponent(q)}`)
  }

  const doneTotal = data
    ? data.flows.flows.reduce((n, f) => n + f.steps.filter((s) => progress[`s:${s.id}`]).length, 0)
    : 0

  return (
    <div class="shell">
      <header class="topbar">
        <div class="bar-inner">
          <span class="logo" onClick={() => nav('#/')} role="link" tabIndex={0}>
            <span class="logo-dot" />
            逸剑攻略
          </span>
          <form class="tb-search" onSubmit={submit}>
            <input
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder="搜索 步骤 / 支线 / 道具…"
              aria-label="搜索"
            />
          </form>
          <span class="tb-progress" title="已打勾步骤数">{doneTotal} ✓</span>
        </div>
      </header>

      <main class="main">
        {err ? (
          <div class="load-state">数据加载失败：{err}</div>
        ) : !data ? (
          <div class="load-state">
            <div class="spinner" />
            <p>正在装载攻略数据…</p>
            <p class="dim">（内容随应用打包，离线可用）</p>
          </div>
        ) : (
          <>
            {route.page === 'home' && <Home data={data} />}
            {route.page === 'main' && <MainFlow data={data} id={route.id} step={route.step} misc={route.misc} />}
            {route.page === 'quest' && <QuestFlow data={data} id={route.id} step={route.step} misc={route.misc} />}
            {route.page === 'prep' && <Prep data={data} />}
            {route.page === 'companions' && <Companions data={data} id={route.id} />}
            {route.page === 'search' && <Search data={data} q={route.q} />}
          </>
        )}
      </main>
    </div>
  )
}