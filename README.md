# Image Wizard CLI

[![npm version](https://badge.fury.io/js/%40involvex%2Fimage-wizard-cli.svg)](https://www.npmjs.com/package/@involvex/image-wizard-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Generate AI images from text prompts in your terminal using Bing's DALL-E 3 service

## Features

- Interactive setup wizard for authentication
- Generate multiple images at once
- Batch generation from JSON manifests
- Sharp post-processing for pixel-art assets (magenta→alpha, trim, downscale, ≤32 palette)
- Custom output directories
- Beautiful CLI interface powered by [@clack/prompts](https://github.com/natemoo-re/clack)
- Works on Windows, macOS, and Linux

## Prerequisites

- **Node.js** 18+ or **Bun**
- **Python** 3.7+ (for the Bing image generation backend)

> Python dependencies (`aiofiles`, `httpx`) are installed automatically via the package `postinstall` script.

## Installation

```bash
npm install -g @involvex/image-wizard-cli
```

## Quick Start

### 1. Setup

Run the interactive setup to configure your Bing authentication:

```bash
image-wizard setup
```

This will open bing.com in your browser and guide you through extracting your authentication cookies.

**Manual Cookie Extraction (if needed):**

Open bing.com in your browser, open DevTools (F12), and run in the console:

```javascript
console.log(
  `_U:\n${document.cookie.match(/(?:^|;\s*)_U=(.*?)(?:;|$)/)[1]}\n\nSRCHHPGUSR:\n${document.cookie.match(/(?:^|;\s*)SRCHHPGUSR=(.*?)(?:;|$)/)[1]}`,
);
```

### 2. Generate Images

```bash
# Basic usage
image-wizard "A photo of an astronaut riding a horse on Mars"

# With options
image-wizard "A futuristic city at sunset" -n 4 -o ./output

# Verbose Python/backend logs
image-wizard "A beautiful landscape" --verbose
```

## Options

| Option           | Short | Default (from config) | Description                  |
| ---------------- | ----- | --------------------- | ---------------------------- |
| `--number <num>` | `-n`  | `4`                   | Number of images to generate |
| `--output <dir>` | `-o`  | `./output`            | Output directory for images  |
| `--verbose`      | `-v`  | off                   | Show backend debug logs      |

## Commands

### `image-wizard setup`

Configure authentication cookies for Bing Image Creator.

### `image-wizard <prompt> [options]`

Generate images from a text prompt.

### `image-wizard batch <manifest.json>`

Generate many assets from a JSON manifest (see `manifests/riftborn-pixel.json`).

```bash
image-wizard batch manifests/riftborn-pixel.json --dry-run
image-wizard batch manifests/riftborn-pixel.json --delay 20 --max-per-day 200
image-wizard batch manifests/riftborn-pixel.json --no-post
```

| Option          | Default | Description                                    |
| --------------- | ------- | ---------------------------------------------- |
| `--dry-run`     | —       | Print jobs without calling Bing                |
| `--delay <sec>` | `20`    | Wait between jobs                              |
| `--max-per-day` | `200`   | Soft daily prompt cap                          |
| `--no-post`     | —       | Skip sharp post-processing (keep raw JPEG)     |
| `--sheets`      | —       | Pack each category into a sprite sheet + atlas |

**Manifest shape:**

```json
{
  "style": "pixel art game asset, solid flat magenta background, ...",
  "outDir": "out",
  "jobs": [
    {
      "id": "tile_hub_0",
      "category": "tiles",
      "prompt": "seamless isometric ground tile",
      "n": 1
    }
  ]
}
```

Outputs land in `outDir/<category>/<id>_<n>.png` after post-processing. A second run skips jobs that already have files in the category folder.

### `image-wizard post <file> --category <name>`

Re-run sharp post-processing on an existing image.

```bash
image-wizard post raw.jpeg --category icons -o icons/icon_sword.png
```

Categories and target sizes: `tiles` 64×32, `props`/`enemies`/`characters` 64×64, `icons`/`ui` 32×32.

### `image-wizard sheet <dir>`

Pack frames into a grid sprite sheet + `.atlas.json`.

```bash
# One category
image-wizard sheet out/icons -o out/sheet_icons.png

# Every category under out/
image-wizard sheet out --all
```

Validate with Pillow:

```bash
pip install Pillow
python scripts/check-assets.py out/icons --expect 32x32
python scripts/check-assets.py out/sheet_icons.png --sheet
```

## Configuration

Config file locations by platform (`conf` project name `image-wizard-cli`):

- **Windows**: `%APPDATA%\image-wizard-cli\Config\config.json`
- **macOS**: `~/Library/Application Support/image-wizard-cli/config.json`
- **Linux**: `~/.config/image-wizard-cli/config.json`

Example config:

```json
{
  "auth_cookie_u": "your-u-cookie-here",
  "auth_cookie_srchhpgusr": "your-srchhpgusr-cookie-here",
  "output_dir": "./output",
  "num_images": 4
}
```

## Development

```bash
# Clone the repo
git clone https://github.com/involvex/image-wizard-cli.git

# Install dependencies
bun install

# Run in development mode
bun run dev "A test prompt"

# Build for production
bun run build

# Tests (CI skips format/lint:fix hooks)
bun run test:ci
```

## Tech Stack

- **Runtime**: Node.js / Bun
- **Language**: TypeScript
- **CLI Framework**: Commander.js
- **UI Library**: @clack/prompts
- **Post-processing**: sharp
- **Python bridge**: `child_process.spawn`
- **Backend**: vendored `bing_create/main.py`

## License

MIT © [involvex](https://github.com/involvex)

## Funding

[GitHub Sponsors](https://github.com/sponsors/involvex)
