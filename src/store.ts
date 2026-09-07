import { useSyncExternalStore } from 'preact/compat'

// 进度打勾（localStorage），零弹窗
const KEY = 'ws_guide_progress_v2'

function load(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}
let progress: Record<string, boolean> = load()
const listeners = new Set<() => void>()
function emit() {
  for (const l of listeners) l()
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    /* ignore */
  }
}

export function getProgress(): Record<string, boolean> {
  return progress
}
export function subscribeProgress(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export function toggleProgress(key: string): void {
  if (progress[key]) delete progress[key]
  else progress[key] = true
  persist()
  emit()
}

export function useProgress(): { progress: Record<string, boolean>; toggle: (k: string) => void } {
  const p = useSyncExternalStore(subscribeProgress, getProgress)
  return { progress: p, toggle: toggleProgress }
}

// 步骤打勾键：步骤 id 全局唯一（main-4 / bihai-1 …）
export const keyStep = (id: string): string => `s:${id}`