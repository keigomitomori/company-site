#!/usr/bin/env python3
"""Gemini の画像生成モデル（通称 Nano Banana）で画像を生成する.

使い方:
    nanobanana-gen.py "生成したい画像の説明" -o ./out
    echo "説明" | nanobanana-gen.py -o ./out
    nanobanana-gen.py "この写真の背景を差し替えて青空にして" --ref photo.jpg -o ./out
    nanobanana-gen.py "..." --ref ill.png --transparent-bg --autocrop -o ./out  # イラスト素材向け後処理
    nanobanana-gen.py --list-models   # 利用可能なモデルIDを確認する（名称が変わった場合はこれで探す）

APIキーの置き場所（優先順）:
    1. 環境変数 NANOBANANA_API_KEY（GEMINI_API_KEY も可）
    2. ~/.config/nanobanana/api_key （chmod 600・Google Drive 同期外）

--ref で参照画像を渡すと、画像編集・スタイル踏襲・複数素材の合成ができる（複数指定可、png/jpeg/webp）。

--transparent-bg / --autocrop（要 Pillow）:
    モデル出力は白背景固定の JPEG になりがちなので、白系ピクセルを透過に変換し（--transparent-bg）、
    透過を除いた内容の外接矩形でトリミングする（--autocrop）。出力は強制的に PNG になる。
    複製サムネイルが混入する等の構図崩れはこの後処理では直せないため、プロンプト側で
    「1枚のみ・比較レイアウト禁止」等を明示すること。

注意: モデルIDは既定値を入れているが、Gemini 側の命名は変わりやすい。
404 が返る場合は --list-models で "image" を含むモデル名を確認し、--model で指定し直すこと。
"""

import argparse
import base64
import io
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import deque
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = "gemini-3.1-flash-image"
KEY_FILE = Path.home() / ".config" / "nanobanana" / "api_key"

RETRYABLE_CODES = (429, 500, 502, 503, 504)
ASPECT_RATIOS = {"1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"}
ALLOWED_REF_MIME = {"image/png", "image/jpeg", "image/webp"}


class ApiError(RuntimeError):
    pass


def load_key() -> str:
    key = os.environ.get("NANOBANANA_API_KEY", "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    if not key and KEY_FILE.is_file():
        if KEY_FILE.stat().st_mode & 0o077:
            print(
                f"警告: {KEY_FILE} が所有者以外から読める権限になっています。"
                "chmod 600 を推奨します。",
                file=sys.stderr,
            )
        key = KEY_FILE.read_text(encoding="utf-8").strip()
    if not key:
        sys.exit(
            "エラー: APIキーが見つかりません。\n"
            "  環境変数 NANOBANANA_API_KEY を設定するか、\n"
            f"  {KEY_FILE} にキーを保存してください（chmod 600 推奨）。"
        )
    return key


def http_call(url: str, key: str, payload: dict | None, retries: int, timeout: int) -> dict:
    sep = "&" if "?" in url else "?"
    full_url = f"{url}{sep}key={urllib.parse.quote(key)}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    attempt = 0
    while True:
        req = urllib.request.Request(
            full_url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST" if payload is not None else "GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in RETRYABLE_CODES and attempt < retries:
                wait = 2.0 * (attempt + 1)
                retry_after = e.headers.get("Retry-After")
                if retry_after:
                    try:
                        wait = max(wait, float(retry_after))
                    except ValueError:
                        pass
                time.sleep(wait)
                attempt += 1
                continue
            body = e.read().decode("utf-8", errors="replace")
            hint = ""
            if e.code == 404:
                hint = "\n  ヒント: モデルIDが誤っている可能性。--list-models で確認してください。"
            raise ApiError(f"API が {e.code} を返しました{hint}\n{body}") from None
        except urllib.error.URLError as e:
            if attempt < retries:
                time.sleep(2.0 * (attempt + 1))
                attempt += 1
                continue
            raise ApiError(f"API に接続できません: {e.reason}") from None
        except json.JSONDecodeError:
            raise ApiError("API の応答を JSON として解釈できません。") from None


def save_atomic(dest: Path, data: bytes) -> None:
    tmp = dest.with_name(dest.name + ".part")
    tmp.write_bytes(data)
    tmp.replace(dest)


def whiten_to_transparent(img, threshold: int = 245, feather: int = 12):
    """白系ピクセルを透過にする。threshold 以上は完全透過、threshold-feather 〜 threshold は
    グラデーションで滑らかにする（アンチエイリアス境界のギザギザ防止）。"""
    img = img.convert("RGBA")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            min_c = min(r, g, b)
            if min_c >= threshold:
                pixels[x, y] = (r, g, b, 0)
            elif min_c >= threshold - feather:
                scale = (threshold - min_c) / feather
                pixels[x, y] = (r, g, b, int(a * scale))
    return img


def _connected_components(pixels, w: int, h: int, alpha_threshold: int) -> list[dict]:
    """4近傍の連結成分を求め、各成分の {members, bbox} のリストを返す。"""
    visited = bytearray(w * h)
    components = []

    def idx(x, y):
        return y * w + x

    for y in range(h):
        for x in range(w):
            i = idx(x, y)
            if visited[i]:
                continue
            visited[i] = 1
            if pixels[x, y][3] < alpha_threshold:
                continue
            queue = deque([(x, y)])
            members = [i]
            min_x = max_x = x
            min_y = max_y = y
            while queue:
                cx, cy = queue.popleft()
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = idx(nx, ny)
                        if not visited[ni]:
                            visited[ni] = 1
                            if pixels[nx, ny][3] >= alpha_threshold:
                                members.append(ni)
                                queue.append((nx, ny))
                                min_x, max_x = min(min_x, nx), max(max_x, nx)
                                min_y, max_y = min(min_y, ny), max(max_y, ny)
            components.append({"members": members, "bbox": (min_x, min_y, max_x, max_y)})
    return components


def _bboxes_close(b1: tuple, b2: tuple, margin: int) -> bool:
    l1, t1, r1, btm1 = b1
    l2, t2, r2, btm2 = b2
    return not (r1 + margin < l2 or r2 + margin < l1 or btm1 + margin < t2 or btm2 + margin < t1)


def keep_largest_cluster(img, alpha_threshold: int = 10, cluster_margin: int = 30):
    """透過マスクの連結成分を近接クラスタにまとめ、最大クラスタ（合計ピクセル数）だけを残す。
    目・眉・ボタン等は本体の輪郭線とアンチエイリアスの隙間で非連結になりがちだが、
    近接クラスタリングにより本体と同じクラスタにまとまるため保持される。
    モデルが本編と別に離れた位置へ出力する複製サムネイルは、別クラスタとして除去される。
    純正Python実装（scipy等の追加依存を避けるため）。"""
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()
    components = _connected_components(pixels, w, h, alpha_threshold)
    if not components:
        return img

    n = len(components)
    parent = list(range(n))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for i in range(n):
        for j in range(i + 1, n):
            if _bboxes_close(components[i]["bbox"], components[j]["bbox"], cluster_margin):
                union(i, j)

    cluster_size: dict[int, int] = {}
    for i, comp in enumerate(components):
        root = find(i)
        cluster_size[root] = cluster_size.get(root, 0) + len(comp["members"])
    best_root = max(cluster_size, key=cluster_size.get)

    keep = bytearray(w * h)
    for i, comp in enumerate(components):
        if find(i) == best_root:
            for m in comp["members"]:
                keep[m] = 1

    for y in range(h):
        for x in range(w):
            i = y * w + x
            if not keep[i] and pixels[x, y][3] > 0:
                r, g, b, _a = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    return img


def autocrop_transparent(img, padding: int = 16):
    """透過を除いた内容の外接矩形でトリミングする（padding px の余白を残す）。"""
    img = img.convert("RGBA")
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox is None:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(img.width, right + padding)
    bottom = min(img.height, bottom + padding)
    return img.crop((left, top, right, bottom))


def build_parts(content: str, ref_paths: list[Path]) -> list[dict]:
    parts = []
    for ref in ref_paths:
        mime, _ = mimetypes.guess_type(str(ref))
        if mime not in ALLOWED_REF_MIME:
            sys.exit(
                f"エラー: {ref} の形式（{mime}）は参照画像として未対応です。"
                f"対応形式: {', '.join(sorted(ALLOWED_REF_MIME))}"
            )
        data = ref.read_bytes()
        parts.append({"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode("ascii")}})
    parts.append({"text": content})
    return parts


def list_models(key: str) -> None:
    res = http_call(f"{API_BASE}/models", key, None, retries=2, timeout=30)
    models = res.get("models", [])
    hits = [m for m in models if "image" in m.get("name", "").lower()]
    if not hits:
        print("「image」を含むモデルが見つかりませんでした。全モデル一覧を表示します。", file=sys.stderr)
        hits = models
    for m in hits:
        print(f"{m.get('name', '?')}  ({m.get('displayName', '')})")


def main() -> None:
    p = argparse.ArgumentParser(
        description="Gemini の画像生成モデル（Nano Banana）で画像を生成する",
        epilog=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("content", nargs="?", help="生成したい画像の説明（省略時は標準入力）")
    p.add_argument("--ref", nargs="+", type=Path, default=[], help="参照画像（編集・スタイル踏襲・合成用、複数可）")
    p.add_argument("-n", "--num", type=int, default=1, help="生成する画像の枚数（既定: 1、APIを複数回呼ぶ）")
    p.add_argument("--aspect-ratio", choices=sorted(ASPECT_RATIOS), default=None, help="出力アスペクト比")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"モデルID（既定: {DEFAULT_MODEL}）")
    p.add_argument("-o", "--out-dir", default=".", help="保存先ディレクトリ（既定: カレント）")
    p.add_argument("--prefix", default="nanobanana", help="保存ファイル名の接頭辞（既定: nanobanana）")
    p.add_argument("--timeout", type=int, default=120, help="1リクエストのタイムアウト秒数（既定: 120）")
    p.add_argument("--list-models", action="store_true", help="利用可能なモデル一覧を表示して終了する")
    p.add_argument("--transparent-bg", action="store_true",
                   help="白系背景を透過にする（要 Pillow。出力は強制的にPNGになる）")
    p.add_argument("--largest-only", action="store_true",
                   help="透過マスクの最大クラスタだけを残す（複製サムネイル等の孤立領域を除去。目・眉等の細部は本体クラスタとして保持。--transparent-bg 必須）")
    p.add_argument("--autocrop", action="store_true",
                   help="透過を除いた内容の外接矩形でトリミングする（--transparent-bg と併用が前提）")
    p.add_argument("--crop-padding", type=int, default=16, help="--autocrop の余白px（既定: 16）")
    args = p.parse_args()

    if (args.transparent_bg or args.autocrop or args.largest_only) and Image is None:
        sys.exit("エラー: --transparent-bg / --autocrop / --largest-only には Pillow が必要です。`pip install Pillow` を実行してください。")
    if (args.largest_only or args.autocrop) and not args.transparent_bg:
        sys.exit("エラー: --largest-only / --autocrop は --transparent-bg と併用してください。")

    key = load_key()

    if args.list_models:
        list_models(key)
        return

    content = args.content if args.content is not None else sys.stdin.read()
    content = content.strip()
    if not content:
        sys.exit("エラー: 画像の説明が空です。")

    for ref in args.ref:
        if not ref.is_file():
            sys.exit(f"エラー: 参照画像が見つかりません: {ref}")

    parts = build_parts(content, args.ref)
    generation_config = {"responseModalities": ["TEXT", "IMAGE"]}
    if args.aspect_ratio:
        generation_config["imageConfig"] = {"aspectRatio": args.aspect_ratio}
    payload = {"contents": [{"parts": parts}], "generationConfig": generation_config}

    out_dir = Path(args.out_dir)
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        sys.exit(f"エラー: 保存先ディレクトリを作成できません: {e}")

    url = f"{API_BASE}/models/{args.model}:generateContent"
    saved = []
    for i in range(1, args.num + 1):
        try:
            res = http_call(url, key, payload, retries=2, timeout=args.timeout)
        except ApiError as e:
            print(f"警告: {i} 枚目の生成に失敗しました: {e}", file=sys.stderr)
            continue

        candidates = res.get("candidates") or []
        if not candidates:
            print(f"警告: {i} 枚目は候補が返りませんでした（promptFeedback: {res.get('promptFeedback')}）。", file=sys.stderr)
            continue

        finish_reason = candidates[0].get("finishReason")
        image_parts = [
            part["inlineData"]
            for part in candidates[0].get("content", {}).get("parts", [])
            if "inlineData" in part
        ]
        if not image_parts:
            print(
                f"警告: {i} 枚目に画像データがありません（finishReason: {finish_reason}）。"
                "安全フィルタでブロックされた可能性があります。",
                file=sys.stderr,
            )
            continue

        for j, img in enumerate(image_parts, start=1):
            raw = base64.b64decode(img["data"])
            ext = (img.get("mimeType", "image/png").split("/")[-1]) or "png"
            suffix = f"-{i}" if args.num > 1 else ""
            suffix += f"-{j}" if len(image_parts) > 1 else ""

            if args.transparent_bg:
                ext = "png"  # 透過を持てるのは PNG のみ
                pil_img = Image.open(io.BytesIO(raw))
                pil_img = whiten_to_transparent(pil_img)
                if args.largest_only:
                    pil_img = keep_largest_cluster(pil_img)
                if args.autocrop:
                    pil_img = autocrop_transparent(pil_img, padding=args.crop_padding)
                buf = io.BytesIO()
                pil_img.save(buf, format="PNG")
                raw = buf.getvalue()

            dest = out_dir / f"{args.prefix}{suffix}.{ext}"
            try:
                save_atomic(dest, raw)
            except OSError as e:
                sys.exit(f"エラー: ファイルを保存できません ({dest}): {e}")
            saved.append(dest)
            print(dest)

    if not saved:
        sys.exit("エラー: 1件も生成できませんでした。")
    print(f"{len(saved)} 件を保存しました。", file=sys.stderr)


if __name__ == "__main__":
    main()
