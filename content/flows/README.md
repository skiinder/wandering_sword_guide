# 内容模型与编辑规范（v2）

> 目标：主线与大型支线**流程解耦**；每步原子化、可被**双向链接**；源码即内容，二次开发者改文件即可扩展，无需动代码。

## 目录结构

```
content/flows/
  main/  01-初出茅庐.md  02-洛村剿匪.md  …（主线流程，每章一个文件）
  quest/ 碧海仙踪.md 武家旧事.md 异种金蝎.md 伤魂鸟.md 霹雳门.md 甘泉苦水.md 绮罗筵.md 旧主线.md
  misc/  小支线/小剧情/成就（按章归类，轻量条目）
  _draft/  由 tools/export-draft.mjs 自动生成的素材底稿（不参与 build）
```

## 文件格式（Markdown + front matter）

```markdown
---
id: quest-碧海仙踪
type: quest          # main | quest | misc
title: 碧海仙踪
group: 入门弟子      # 章组标签
order: 2
source: 模板 s6/s13 段
---

## [bihai-1] 接取：破庙老猿

> window: 拜师武当后（主线 [[main-13]] 之后即可接）

破庙完成老猿任务 → 步微月加入队伍。

> link: 建议品剑大会前入队（见 [[main-21]] 前）

## [bihai-2] 码头提举司

> window: 需冷无情在队（冷无情入队见 [[quest-旧主线:12]]）

…
```

### 语法要点

| 语法 | 含义 |
|---|---|
| `---` front matter | `id`（全局唯一）/`type`/`title`/`group`/`order`/`source` |
| `## [别名] 标题` | 一个步骤；**别名**是步骤 ID（全局唯一，推荐 `flow-简写-序号`）；不写别名则自动编号 `flowId:序号` |
| `[[main-13]]` | 出链：指向其他流程（默认章首） |
| `[[main-13:5]]` | 出链：指向**特定步骤**（flow:seq） |
| `[[quest-碧海仙踪#bihai-1]]` | 出链：指向**别名步骤**（flow#alias） |
| `> window:` | 窗口元行：该步骤的主线时间窗（含出链），前端高亮展示 |
| `> link:` | 关联说明行：正文下方小字 + 出链 |
| 正文空行分隔段落 | 同一步骤多段文字 |

### 回链（自动生成）

`tools/build-content.mjs` 全量扫描出链 → 生成回链索引。前端步骤卡底部展示「↗ 跳到此步」与「← 从这些步骤跳入」。

### 新增主线/支线流程

1. 新建 `content/flows/main/xx-章名.md` 或 `content/flows/quest/支线名.md`；
2. 按上述格式写 front matter + `## [别名] 步骤`；
3. 用 `[[flow:seq]]` / `[[flow#alias]]` 互相引用；
4. 跑 `node tools/build-content.mjs` → 生成 `public/data/flows.json`，前端即生效。

### 主线条目生成

- 主线每步 `id: main-$序号`（序 = 123 步全局编号），如 `main-043`；
- 主线步骤正文顺推（啰嗦的过渡文字可精简），保留关键坐标/战斗/奖励；
- 窗口/关联全部用出链表达，不再内嵌支线内容。

## 数据流

```
content/flows/**/*.md  ──build-content.mjs──▶  public/data/flows.json
content/raw/walkthrough.json   （模板素材源，只读参考）
```