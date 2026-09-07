#!/usr/bin/env python3
"""M1b+M1d: 支线窗口初稿推导 → content/windows/windows.json + docs/窗口对照表.md

窗口语义（索引型任务的核心数据）:
  open_after   = 任务「首次出现」之前最近的一条主线步编号（0 = 开局即开）
  close_before = 任务「末次出现」之后最近的一条主线步编号（None = 模板内无线性关闭点，标"待核"）
  任务在 open_after 与 close_before 之间可接取/可完成（模板线性推导初稿，人工核查后定稿）。
"""
import json
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "content" / "raw" / "walkthrough.json"
OUT = ROOT / "content" / "windows" / "windows.json"
EXT = ROOT / "content" / "windows" / "external.json"
DOC = ROOT / "docs" / "窗口对照表.md"

# 模板 sec → 章组/等级索引 映射（用于对照表展示）
INDEX_MAP = {
    1: "序章组「入门之前」",
    2: "序章组「入门之前」",
    3: "序章组·旧主线速通专题",
    4: "序章组「入门之前」",
    5: "入门弟子（初入武当）",
    6: "入门弟子·DLC 窗口",
    7: "晋升资深弟子",
    8: "晋升精英弟子（品剑大会）",
    9: "精英弟子·DLC 窗口",
    10: "精英弟子（武家旧事关闭坐标）",
    11: "精英弟子（中原事宜）",
    12: "精英弟子·伤魂鸟窗口",
    13: "精英弟子·碧海仙踪窗口",
    14: "精英弟子·霹雳门窗口",
    15: "晋升传功弟子",
    16: "传功弟子·甘泉苦水窗口",
    17: "传功弟子·绮罗筵窗口",
    18: "传功弟子·旧主线全流程",
    19: "传功弟子·新主线速通专题",
    20: "晋升执法弟子→执法（南疆风云）",
    21: "执法弟子（少林剑诀）",
    22: "执法弟子（天佛大战·南疆关闭提示）",
    23: "终局章组「烟尘回响」",
}


def loc(main_no, main_sec):
    """主线步编号 → 可读坐标。"""
    if main_no is None:
        return "∞（无线性关闭点）"
    sec_id, title = main_sec.get(main_no, (None, "?"))
    return f"「{title}」·步{main_no}" if sec_id else f"步{main_no}"


def window_feature(occs):
    """窗口特征：open_after = 首次出现前最近主线步；close_before = 最后一次出现后最近的推进主线步。"""
    return min(o["main_no"] for o in occs), occs[-1]["next_main"]


def main() -> int:
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    sections = raw["sections"]

    # main_no -> (sec_id, sec_title) 反查
    main_sec = {}
    for sec in sections:
        for r in sec["lines"]:
            if r["type"] == "main":
                main_sec[r["main_no"]] = (sec["id"], sec["title"])

    # ---- 1. 全局线性行表（带 next_main） ----
    rows = []
    for sec in sections:
        for r in sec["lines"]:
            rows.append({
                "sec_id": sec["id"],
                "sec_title": sec["title"],
                "type": r["type"],
                "main_no": r.get("main_no", 0),
                "quest": r.get("quest", ""),
                "quest_norm": r.get("quest_norm", ""),
                "text": r.get("text", ""),
            })
    next_main = None
    for i in range(len(rows) - 1, -1, -1):
        rows[i]["next_main"] = next_main
        if rows[i]["type"] == "main":
            next_main = rows[i]["main_no"]

    # ---- 2. 任务聚合 ----
    agg = defaultdict(list)
    for r in rows:
        if r["type"] == "side" and r["quest_norm"]:
            agg[r["quest_norm"]].append(r)

    windows = []
    for qn, occs in agg.items():
        occs.sort(key=lambda r: (r["sec_id"], r["main_no"]))
        open_after, close_before = window_feature(occs)
        last = occs[-1]
        windows.append({
            "quest": occs[0]["quest"],
            "quest_norm": qn,
            "occurrences": len(occs),
            "chapters": [(o["sec_id"], o["sec_title"]) for o in occs],
            "open_after": open_after,
            "close_before": close_before,
            "first": {"sec_id": occs[0]["sec_id"], "sec_title": occs[0]["sec_title"], "after_main": open_after},
            "last": {"sec_id": last["sec_id"], "sec_title": last["sec_title"], "main_no": last["main_no"], "close_before": close_before},
        })
    windows.sort(key=lambda w: (w["close_before"] if w["close_before"] is not None else 10 ** 9, w["open_after"]))
    print(f"tasks: {len(windows)}")

    # ---- 3. 输出 JSON ----
    out = {
        "meta": {
            "rule": "open_after=任务首次出现前最近主线步; close_before=任务末次出现后最近主线步(模板线性推导初稿,待人工核查)",
            "generated_at": "2026-09-07",
            "base_version": "1.24.32",
        },
        "windows": windows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"written: {OUT}")

    # ---- 4. 摘要打印 ----
    KEY = ["武家旧事", "碧海仙踪", "异种金蝎", "伤魂鸟", "霹雳门", "甘泉苦水", "绮罗筵", "旧主线", "蜃楼"]
    print("\n=== 大型支线相关任务窗口 ===")
    for w in windows:
        if any(k in w["quest"] for k in KEY):
            cb = w["close_before"] if w["close_before"] is not None else "∞待核"
            print(f"{w['quest']:<20} occ={w['occurrences']:<3} open_after={w['open_after']:<4} close_before={cb}")
    print("\n=== 最紧迫 15 条（close_before 最小） ===")
    for w in windows[:15]:
        print(f"{w['quest']:<20} open_after={w['open_after']:<4} close_before={w['close_before']} @{w['last']['sec_title']}")

    gen_md(windows, sections, main_sec)
    return 0


def gen_md(windows, sections, main_sec) -> None:
    ext = {"entries": []}
    if EXT.exists():
        ext = json.loads(EXT.read_text(encoding="utf-8"))

    a = []
    a.append("# 《逸剑风云决》支线窗口对照表 — M1 初稿")
    a.append("")
    a.append("> 内容基线 **v1.24.32**（碧海仙踪 DLC + 武家旧事 DLC）｜生成 2026-09-07")
    a.append("> 数据源：`content/windows/windows.json`（模板 23 区块线性推导，217 个任务）+ `content/windows/external.json`（第一轮外部核查）")
    a.append("> 推导规则：**open_after** = 任务首次出现前最近主线步；**close_before** = 任务末次出现后最近主线步。`待核` = 无硬关闭证据或需人工复核。")
    a.append("")
    a.append("## 0. 章节索引映射（模板区块 → 等级索引）")
    a.append("")
    a.append("| 区块 | 等级/章组 | 主线步区间 |")
    a.append("|---|---|---|")
    for sec_id in sorted(s["id"] for s in sections):
        sec = next(s for s in sections if s["id"] == sec_id)
        mains = [r["main_no"] for r in sec["lines"] if r["type"] == "main"]
        rng = f"步{min(mains)}–{max(mains)}" if mains else "—（纯窗口区）"
        a.append(f"| s{sec_id} {sec['title']} | {INDEX_MAP.get(sec_id, '?')} | {rng} |")
    a.append("")
    a.append("## 1. ⚠️ 最后窗口优先清单（推进主线步前必须完成）")
    a.append("")
    a.append("按主线步 N 分组：**推进到「N」之前，下列任务必须完成或至少保留接取**（若已开启）。")
    a.append("")
    a.append("| 主线步 | 任务（关闭于此步前） | 开启于 |")
    a.append("|---|---|---|")
    by_close = defaultdict(list)
    for w in windows:
        if w["close_before"] is not None:
            by_close[w["close_before"]].append(w)
    for n in sorted(by_close):
        for w in by_close[n]:
            a.append(f"| {loc(n, main_sec)} | {w['quest']} | {loc(w['open_after'], main_sec)} |")
    a.append("")
    a.append("## 2. 跨章任务（同一任务名多处出现）")
    a.append("")
    a.append("| 任务 | 出现次数 | 开启于 | 关闭于 | 分布区块 |")
    a.append("|---|---|---|---|---|")
    for w in windows:
        if w["occurrences"] >= 2 and len(set(c[0] for c in w["chapters"])) >= 2:
            chs = "、".join(f"s{c[0]}" for c in w["chapters"])
            a.append(f"| {w['quest']} | {w['occurrences']} | {loc(w['open_after'], main_sec)} | {loc(w['close_before'], main_sec)} | {chs} |")
    a.append("")
    a.append("## 3. 各章任务窗口明细")
    a.append("")
    for sec in sections:
        rows = [r for r in sec["lines"] if r["type"] == "side"]
        if not rows:
            continue
        a.append(f"### s{sec['id']} {sec['title']}")
        a.append("")
        a.append("| 任务 | 出现 | 开启于 | 关闭于 |")
        a.append("|---|---|---|---|")
        for r in rows:
            w = next((x for x in windows if x["quest_norm"] == r["quest_norm"]), None)
            if not w:
                continue
            a.append(f"| {r['quest']} | {w['occurrences']} | {loc(w['open_after'], main_sec)} | {loc(w['close_before'], main_sec)} |")
        a.append("")
    a.append("## 4. 外部核查窗口（第一轮）")
    a.append("")
    a.append("| 支线 | 开启 | 关闭（依据） | 状态 |")
    a.append("|---|---|---|---|")
    for e in ext["entries"]:
        st = "✅ 有出处" if e["status"] == "confirmed" else "🟡 待核"
        src = "、".join(u.split("//")[1].split("/")[0] for u in e["urls"]) if e["urls"] else "模板显式"
        a.append(f"| {e['name']} | {e['open']} | {e['close']}（{src}） | {st} |")
    a.append("")
    a.append("---")
    a.append("下一步：M2 按此表校验「步级标注」在卡片上的呈现；待核项在全量校验（Q6 校对阶段）补齐。")

    DOC.write_text("\n".join(a), encoding="utf-8")
    print(f"written: {DOC}")


if __name__ == "__main__":
    sys.exit(main())