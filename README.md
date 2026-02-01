# Image Wizard CLI

[![npm version](https://badge.fury.io/js/%40involvex%2Fimage-wizard-cli.svg)](https://www.npmjs.com/package/@involvex/image-wizard-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Generate AI images from text prompts in your terminal using Bing's DALL-E 3 service

## Features

- Interactive setup wizard for authentication
- Generate multiple images at once
- Custom output directories
- Beautiful CLI interface powered by [@clack/prompts](https://github.com/natemoo-re/clack)
- Works on Windows, macOS, and Linux
- **Bundled Python backend** - no manual Python setup required

## Prerequisites

- **Node.js** 18+ or **Bun**
- **Python** 3.7+ (for the image generation backend)

> Python dependencies are installed automatically when you install this package.

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

# Short options
image-wizard "A beautiful landscape" --number 6 --output my-images
```

## Options

| Option           | Short | Default    | Description                  |
| ---------------- | ----- | ---------- | ---------------------------- |
| `--number <num>` | `-n`  | `4`        | Number of images to generate |
| `--output <dir>` | `-o`  | `./output` | Output directory for images  |

## Commands

### `image-wizard setup`

Configure authentication cookies for Bing Image Creator.

### `image-wizard <prompt> [options]`

Generate images from a text prompt.

## Configuration

Config file locations by platform:

- **Windows**: `%APPDATA%\image-wizard-cli-nodejs\Config\config.json`
- **macOS**: `~/Library/Application Support/image-wizard-cli-nodejs/config.json`
- **Linux**: `~/.config/image-wizard-cli-nodejs/config.json`

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

# Run tests
bun test
```

## Tech Stack

- **Runtime**: Node.js / Bun
- **Language**: TypeScript
- **CLI Framework**: Commander.js
- **UI Library**: @clack/prompts
- **Python Integration**: execa
- **Backend**: bing-create (bundled)

## License

MIT © [involvex](https://github.com/involvex)

## Funding

[GitHub Sponsors](https://github.com/sponsors/involvex)
