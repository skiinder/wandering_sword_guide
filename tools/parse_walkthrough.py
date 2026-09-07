#!/usr/bin/env python3
"""M1a: 解析《逸剑风云决》攻略 .mht → content/raw/walkthrough.json

输出结构:
  meta     : 来源/版本/解析时间
  prep     : 准备篇（前言 + 二周目继承建议等，按 prep-sec 分组）
  sections : 23 个区块（sec），每个含按顺序排列的原子行:
             main(主线步, 全局编号 main_no) / side(支线, quest名) /
             note(备注) / ach(成就) / scene(小剧情,name) / sect(门派,name) /
             choice(分支) / steps(编号速通步骤)
  内嵌标记: save(存档点) / imp(必选) / drop(掉落) 从行文本中拆分保留
"""
import re
import html
import json
import sys
from pathlib import Path
from email import policy
from email.parser import BytesParser

ROOT = Path(__file__).resolve().parent.parent
MHT = ROOT / "《逸剑风云决》全流程完美攻略(上+下整合)·彩色标注版.mht"
OUT = ROOT / "content" / "raw" / "walkthrough.json"


def extract_html() -> str:
    with open(MHT, "rb") as f:
        msg = BytesParser(policy=policy.default).parse(f)
    for part in msg.iter_parts():
        if part.get_content_type() == "text/html":
            return part.get_payload(decode=True).decode("utf-8", errors="replace")
    raise SystemExit("MHT 中未找到 text/html 部分")


def clean(s: str) -> str:
    """去标签(保留 <br> 为换行)、还原实体、压缩空白。"""
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def norm(s: str) -> str:
    return re.sub(r"\s+", "", s)


def collect(pattern: str, doc: str):
    """返回 [(start, end, groups...)]，按 start 排序。"""
    out = []
    for m in re.finditer(pattern, doc, re.S):
        out.append((m.start(), m.end(), m))
    return out


def main() -> int:
    doc = extract_html()
    doc_plain = doc

    # ---------- 1. 区块边界（准备篇 + 23 sec） ----------
    sec_bounds = []  # (start, end, sec_num, title)
    for m in re.finditer(
        r'<div class="sec"[^>]*>\s*<div class="sec-head"><span class="sec-num">(\d+)</span><h2>(.*?)</h2></div>',
        doc, re.S):
        sec_bounds.append([m.start(), None, int(m.group(1)), clean(m.group(2))])
    # 结束位置 = 下一个 sec 起始（或准备篇重建区/文档尾）
    for i in range(len(sec_bounds) - 1):
        sec_bounds[i][1] = sec_bounds[i + 1][0]
    sec_bounds[-1][1] = len(doc)
    print(f"secs: {len(sec_bounds)}")

    prep_blocks = []  # (start, end, title, caption)
    for m in re.finditer(
        r'<div class="prep-sec"[^>]*>\s*<div class="ph">(.*?)</div>(.*?)</div>\s*(?=<div class="prep-sec"|<!-- ===== )',
        doc, re.S):
        head = m.group(1)
        title = clean(re.sub(r"<small>.*?</small>", "", head))
        caption = clean(re.search(r"<small>(.*?)</small>", head, re.S).group(1)) if "<small>" in head else ""
        prep_blocks.append([m.start(), m.end(), title, caption])
    print(f"prep_blocks: {len(prep_blocks)}")

    # ---------- 2. 原子块（位置法，避开嵌套 div） ----------
    lines = []      # (start, end, kind, text)
    for m in re.finditer(r'<div class="line l-([a-z]+)"[^>]*>(.*?)</div>', doc, re.S):
        lines.append([m.start(), m.end(), m.group(1), m.group(2)])
    choices = []
    for m in re.finditer(r'<div class="choice">(.*?)</div>', doc, re.S):
        choices.append([m.start(), m.end(), m.group(1)])
    steps = []
    for m in re.finditer(r'<div class="step"><span class="sn">(.*?)</span>(.*?)</div>', doc, re.S):
        steps.append([m.start(), m.end(), m.group(1), m.group(2)])
    print(f"lines={len(lines)} choices={len(choices)} steps={len(steps)}")

    def tags(inner: str, cls: str):
        """提取 inner 中所有 class=cls 的 span 文本。"""
        return [clean(x) for x in re.findall(rf'<span class="{cls}".*?>(.*?)</span>', inner, re.S)]

    # ---------- 3. 准备篇 ----------
    prep_out = []
    for start, end, title, caption in prep_blocks:
        block = doc[start:end]
        items = []
        for m in re.finditer(r'<div class="prep-item">(.*?)</div>', block, re.S):
            inner = m.group(1)
            cat_m = re.search(r'<span class="cat">(.*?)</span>', inner, re.S)
            items.append({
                "cat": clean(cat_m.group(1)) if cat_m else "",
                "text": clean(inner),
            })
        prep_out.append({"title": title, "caption": caption, "items": items})
    print(f"prep items: {sum(len(p['items']) for p in prep_out)}")

    # ---------- 4. 正文区块组装 ----------
    sections = []
    main_no = 0
    for start, end, sec_num, title in sec_bounds:
        block = doc[start:end]
        atoms = []
        for s, e, kind, inner in lines:
            if start <= s < end:
                atoms.append((s, "line", kind, inner))
        for s, e, inner in choices:
            if start <= s < end:
                atoms.append((s, "choice", inner))
        for s, e, sn, inner in steps:
            if start <= s < end:
                atoms.append((s, "step", sn, inner))
        atoms.sort(key=lambda a: a[0])

        rows = []
        for s, kind, *rest in atoms:
            if kind == "line":
                k, inner = rest
                text = clean(inner)
                row = {"type": k, "text": text}
                if k == "side":
                    nm = re.search(r'<span class="name n-side">(.*?)</span>', inner, re.S)
                    row["quest"] = clean(nm.group(1)) if nm else ""
                    row["quest_norm"] = norm(row["quest"])
                elif k == "scene":
                    nm = re.search(r'<span class="name n-scene">(.*?)</span>', inner, re.S)
                    row["name"] = clean(nm.group(1)) if nm else ""
                elif k == "sect":
                    nm = re.search(r'<span class="name n-sect">(.*?)</span>', inner, re.S)
                    row["name"] = clean(nm.group(1)) if nm else ""
                row["saves"] = tags(inner, "save")
                row["imps"] = tags(inner, "imp")
                drops = [clean(x) for x in re.findall(r'<span class="drop".*?>(.*?)</span>', inner, re.S)]
                row["drops"] = drops
                # 去标记后的纯文本（用于窗口推导的一致性匹配）
                row["text_plain"] = clean(re.sub(
                    r'<span class="(?:save|imp|drop)".*?>.*?</span>', "", inner, flags=re.S))
                rows.append(row)
            elif kind == "choice":
                inner = rest[0]
                opt = re.search(r"<b>(.*?)</b>", inner, re.S)
                rows.append({
                    "type": "choice",
                    "option": clean(opt.group(1)) if opt else "",
                    "text": clean(inner),
                    "saves": tags(inner, "save"),
                    "drops": [clean(x) for x in re.findall(r'<span class="drop".*?>(.*?)</span>', inner, re.S)],
                })
            else:  # step
                sn, inner = rest
                rows.append({
                    "type": "step",
                    "no": clean(sn),
                    "text": clean(inner),
                    "saves": tags(inner, "save"),
                })

        # 主线步全局编号
        for r in rows:
            if r["type"] == "main":
                main_no += 1
                r["main_no"] = main_no
            else:
                r["main_no"] = main_no  # 当前最近的主线步编号（0=章首尚无主线步）

        sections.append({"id": sec_num, "title": title, "lines": rows})
    print(f"total main lines: {main_no}")

    # ---------- 5. 统计 & 输出 ----------
    from collections import Counter
    types = Counter(r["type"] for s in sections for r in s["lines"])
    print("line type counts:", dict(types))
    quests = Counter(r.get("quest_norm") for s in sections for r in s["lines"] if r["type"] == "side")
    print(f"side rows={sum(quests.values())} unique quest names={len(quests)}")

    out = {
        "meta": {
            "source_file": MHT.name,
            "game_version": "1.24.32",
            "dlc_notes": ["碧海仙踪 DLC", "武家旧事 DLC"],
            "parsed_at": "2026-09-07",
            "sec_count": len(sections),
            "main_step_count": main_no,
        },
        "prep": prep_out,
        "sections": sections,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"written: {OUT} ({OUT.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())