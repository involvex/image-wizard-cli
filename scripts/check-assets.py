#!/usr/bin/env python3
"""Validate post-processed / sheet assets: alpha, size, palette ≤32 colors.

Usage:
  python scripts/check-assets.py out/icons/icon_sword_0.png
  python scripts/check-assets.py out/ --category icons --expect 32x32
  python scripts/check-assets.py out/sheet_icons.png --sheet
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow required: pip install Pillow", file=sys.stderr)
    sys.exit(2)


def unique_colors(img: Image.Image) -> int:
    rgba = img.convert("RGBA")
    return len({pixel for pixel in rgba.getdata()})


def has_transparency(img: Image.Image) -> bool:
    if "A" not in img.getbands():
        return False
    alpha = img.getchannel("A")
    return any(a < 255 for a in alpha.getdata())


def check_file(
    path: Path,
    expect_w: int | None,
    expect_h: int | None,
    max_colors: int,
    require_alpha: bool,
) -> list[str]:
    errors: list[str] = []
    with Image.open(path) as img:
        w, h = img.size
        if expect_w is not None and w != expect_w:
            errors.append(f"{path}: width {w} != {expect_w}")
        if expect_h is not None and h != expect_h:
            errors.append(f"{path}: height {h} != {expect_h}")
        if require_alpha and not has_transparency(img) and img.mode not in ("RGBA", "LA", "PA"):
            errors.append(f"{path}: missing alpha channel (mode={img.mode})")
        colors = unique_colors(img)
        if colors > max_colors:
            errors.append(f"{path}: {colors} colors > {max_colors}")
    return errors


def iter_images(root: Path) -> list[Path]:
    if root.is_file():
        return [root]
    exts = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    return sorted(
        p for p in root.rglob("*") if p.suffix.lower() in exts and p.is_file()
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="File or directory to check")
    parser.add_argument("--expect", help="Expected WxH, e.g. 32x32")
    parser.add_argument(
        "--category",
        help="If set with a directory, only check <path>/<category>/",
    )
    parser.add_argument("--max-colors", type=int, default=32)
    parser.add_argument(
        "--require-alpha",
        action="store_true",
        default=True,
        help="Require alpha-capable mode (default: on)",
    )
    parser.add_argument(
        "--no-require-alpha",
        action="store_true",
        help="Do not require alpha channel",
    )
    parser.add_argument(
        "--sheet",
        action="store_true",
        help="Treat as sprite sheet (skip per-frame size check unless --expect)",
    )
    args = parser.parse_args()

    expect_w = expect_h = None
    if args.expect:
        parts = args.expect.lower().split("x")
        if len(parts) != 2:
            print("--expect must look like 64x32", file=sys.stderr)
            return 2
        expect_w, expect_h = int(parts[0]), int(parts[1])

    root = args.path
    if args.category and root.is_dir():
        root = root / args.category

    if not root.exists():
        print(f"Not found: {root}", file=sys.stderr)
        return 2

    require_alpha = args.require_alpha and not args.no_require_alpha
    files = iter_images(root)
    if not files:
        print(f"No images under {root}", file=sys.stderr)
        return 2

    # For sheets without --expect, only check alpha + colors
    check_w = None if args.sheet and expect_w is None else expect_w
    check_h = None if args.sheet and expect_h is None else expect_h

    all_errors: list[str] = []
    for file_path in files:
        all_errors.extend(
            check_file(
                file_path,
                check_w,
                check_h,
                args.max_colors,
                require_alpha,
            )
        )

    if all_errors:
        for err in all_errors:
            print(err, file=sys.stderr)
        print(f"FAILED: {len(all_errors)} issue(s) in {len(files)} file(s)")
        return 1

    print(f"OK: {len(files)} file(s) passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
