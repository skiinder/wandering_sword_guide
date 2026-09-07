import { useEffect, useState } from 'preact/hooks'

export type Route =
  | { page: 'home' }
  | { page: 'main'; id: string; step?: string; misc?: string }
  | { page: 'quest'; id: string; step?: string; misc?: string }
  | { page: 'prep' }
  | { page: 'companions'; id?: string }
  | { page: 'search'; q: string }

export function useHash(): string {
  const [hash, setHash] = useState(() => location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return hash
}

export function parseHash(hash: string): Route {
  const s = hash.replace(/^#\/?/, '')
  const [path, query] = s.split('?')
  const parts = path.split('/').filter(Boolean)
  const step = query ? new URLSearchParams(query).get('step') || undefined : undefined
  const misc = query ? new URLSearchParams(query).get('misc') || undefined : undefined
  if (!parts.length) return { page: 'home' }
  if (parts[0] === 'main' && parts[1]) return { page: 'main', id: decodeURIComponent(parts[1]), step, misc }
  if (parts[0] === 'quest' && parts[1]) return { page: 'quest', id: decodeURIComponent(parts[1]), step, misc }
  if (parts[0] === 'prep') return { page: 'prep' }
  if (parts[0] === 'companions') return { page: 'companions', id: parts[1] ? decodeURIComponent(parts[1]) : undefined }
  if (parts[0] === 'search' && parts[1]) return { page: 'search', q: decodeURIComponent(parts[1]) }
  return { page: 'home' }
}

export function nav(h: string): void {
  if (location.hash === h) return
  location.hash = h
  window.scrollTo(0, 0)
}