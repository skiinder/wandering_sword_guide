// 将 content 数据同步到 public/data/（build/dev 前自动执行）
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dest = resolve(root, 'public/data')
mkdirSync(dest, { recursive: true })

const files = [
  ['content/raw/walkthrough.json', 'walkthrough.json'],
  ['content/windows/windows.json', 'windows.json'],
  ['content/windows/external.json', 'external.json'],
  ['content/companions.json', 'companions.json'],
  ['content/misc-tasks.json', 'misc-tasks.json'],
]
for (const [src, name] of files) {
  const s = resolve(root, src)
  if (!existsSync(s)) { console.error(`MISSING: ${s}`); process.exit(1) }
  cpSync(s, resolve(dest, name))
  console.log(`synced: ${name}`)
}