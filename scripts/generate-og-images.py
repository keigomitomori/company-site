#!/usr/bin/env python3
"""記事のアイキャッチ（OGP画像 1200x630）を frontmatter から自動生成する。

使い方:
  python3 scripts/generate-og-images.py                        # 公開済み記事（src/content/articles）全件
  python3 scripts/generate-og-images.py <slug> [<slug> ...]    # 特定記事のみ
  python3 scripts/generate-og-images.py _stock/articles/<slug>.md  # ファイルパスで指定

slug は src/content/articles と _stock/articles の両方から探す。
見つからない、または両方にあって決められない場合はエラー終了する（後者はパスで指定する）。

出力先は記事の置き場所で決まる:
  src/content/articles/<slug>.md → public/images/og/<slug>.png
  _stock/articles/<slug>.md      → _stock/og/<slug>.png（公開時に記事と一緒に mv する）
Chrome のパスは環境変数 CHROME_BIN で上書き可。
"""
import html
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = ROOT / "src" / "content" / "articles"
OUT_DIR = ROOT / "public" / "images" / "og"
STOCK_ARTICLES_DIR = ROOT / "_stock" / "articles"
STOCK_OUT_DIR = ROOT / "_stock" / "og"
# 記事の置き場所 → アイキャッチの出力先（slug の探索順でもある）
SOURCES = [(ARTICLES_DIR, OUT_DIR), (STOCK_ARTICLES_DIR, STOCK_OUT_DIR)]
CHROME = os.environ.get(
    "CHROME_BIN", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)

TEMPLATE = """<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700&display=swap">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    font-family: 'Noto Sans JP', sans-serif;
    background: linear-gradient(135deg, #0f1b33 0%, #16264a 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 72px 80px 60px;
    position: relative;
    overflow: hidden;
  }
  .deco {
    position: absolute;
    right: -160px;
    bottom: -220px;
    width: 560px;
    height: 560px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.28) 0%, rgba(37, 99, 235, 0) 70%);
  }
  .deco2 {
    position: absolute;
    right: 96px;
    top: 72px;
    width: 88px;
    height: 4px;
    background: #2563eb;
  }
  .category {
    display: inline-block;
    align-self: flex-start;
    background: #2563eb;
    color: #fff;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 10px 26px;
    border-radius: 4px;
  }
  .title-block { position: relative; }
  .title {
    font-size: __MAIN_SIZE__px;
    font-weight: 700;
    line-height: 1.42;
    letter-spacing: 0.01em;
    max-width: 1010px;
  }
  .subtitle {
    margin-top: 22px;
    font-size: 33px;
    font-weight: 500;
    line-height: 1.5;
    color: #a9bad9;
    max-width: 1010px;
  }
  .footer {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    position: relative;
  }
  .brand {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .brand span {
    font-weight: 500;
    font-size: 26px;
    color: #a9bad9;
    margin-left: 18px;
  }
  .domain {
    font-size: 24px;
    font-weight: 500;
    color: #a9bad9;
    letter-spacing: 0.04em;
  }
</style>
</head>
<body>
  <div class="deco"></div>
  <div class="deco2"></div>
  <div class="category">__CATEGORY__</div>
  <div class="title-block">
    <div class="title">__TITLE__</div>
    __SUBTITLE__
  </div>
  <div class="footer">
    <div class="brand">NEXT Bridge<span>コラム</span></div>
    <div class="domain">nextb.net</div>
  </div>
</body>
</html>
"""


def parse_frontmatter(md_path: Path) -> dict:
    text = md_path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not m:
        raise ValueError(f"frontmatter not found: {md_path}")
    fm = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^(\w+):\s*(.+)$", line)
        if kv:
            fm[kv.group(1)] = kv.group(2).strip().strip("'\"")
    return fm


def build_html(title: str, category: str) -> str:
    # 「メイン — サブ」形式のタイトルは2段に分ける
    main, sub = title, None
    for sep in (" — ", " – ", " - "):
        if sep in title:
            main, sub = title.split(sep, 1)
            break
    main_size = 62 if len(main) <= 22 else (54 if len(main) <= 30 else 46)
    sub_html = f'<div class="subtitle">{html.escape(sub)}</div>' if sub else ""
    return (
        TEMPLATE.replace("__MAIN_SIZE__", str(main_size))
        .replace("__CATEGORY__", html.escape(category))
        .replace("__TITLE__", html.escape(main))
        .replace("__SUBTITLE__", sub_html)
    )


def generate(md_path: Path, out_dir: Path) -> Path | None:
    fm = parse_frontmatter(md_path)
    if fm.get("draft") == "true":
        return None
    slug = md_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    out_png = out_dir / f"{slug}.png"
    with tempfile.TemporaryDirectory() as td:
        html_path = Path(td) / "og.html"
        html_path.write_text(build_html(fm["title"], fm.get("category", "コラム")), encoding="utf-8")
        subprocess.run(
            [
                CHROME,
                "--headless",
                "--disable-gpu",
                f"--screenshot={out_png}",
                "--window-size=1200,630",
                "--hide-scrollbars",
                "--virtual-time-budget=15000",
                html_path.as_uri(),
            ],
            check=True,
            capture_output=True,
        )
    return out_png


def out_dir_for(md_path: Path) -> Path:
    """記事ファイルの置き場所から出力先を決める（_stock 配下なら _stock/og）。"""
    resolved = md_path.resolve()
    for articles_dir, out_dir in SOURCES:
        if resolved.parent == articles_dir.resolve():
            return out_dir
    return OUT_DIR


def resolve_target(target: str) -> Path:
    """slug またはファイルパスを記事ファイルに解決する。解決できなければエラー終了する。"""
    if target.endswith(".md") or "/" in target or os.sep in target:
        path = Path(target)
        if not path.is_absolute():
            path = Path.cwd() / path
        if not path.is_file():
            sys.exit(f"error: 記事ファイルが見つかりません: {target}")
        return path
    found = [d / f"{target}.md" for d, _ in SOURCES if (d / f"{target}.md").is_file()]
    if not found:
        searched = "、".join(str(d.relative_to(ROOT)) for d, _ in SOURCES)
        sys.exit(f"error: slug '{target}' の記事が見つかりません（探した場所: {searched}）")
    if len(found) > 1:
        paths = "、".join(str(p.relative_to(ROOT)) for p in found)
        sys.exit(f"error: slug '{target}' の記事が複数あります（{paths}）。ファイルパスで指定してください")
    return found[0]


def main():
    targets = sys.argv[1:]
    if targets:
        # 先に全件を解決し、1件でも見つからなければ何も生成せずに止める
        md_files = [resolve_target(t) for t in targets]
    else:
        md_files = sorted(ARTICLES_DIR.glob("*.md"))
    for md in md_files:
        out = generate(md, out_dir_for(md))
        if out:
            print(f"generated: {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")
        elif targets:
            print(f"skipped (draft: true): {md}")


if __name__ == "__main__":
    main()
