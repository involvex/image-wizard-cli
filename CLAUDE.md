# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Image Wizard CLI is a command-line tool for generating AI images using Microsoft Bing's DALL-E 3 service. The project uses a hybrid Node.js/Python architecture with TypeScript for the CLI interface and Python for the Bing integration backend.

## Architecture

### Hybrid Node.js/Python Structure

- **Frontend (TypeScript/Node.js)**: CLI interface using Commander.js and @clack/prompts
- **Backend (Python)**: Actual Bing Image Creator integration in `bing_create/main.py`
- **Bridge**: `src/python.ts` uses execa to spawn Python subprocesses

### Key Files

| File                  | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `src/index.ts`        | Main CLI entry point with Commander.js commands                              |
| `src/config.ts`       | Configuration management using the `conf` package                            |
| `src/python.ts`       | Python integration layer - spawns Python subprocess and parses stdout        |
| `bing_create/main.py` | Core Bing integration logic (ImageGenerator and AsyncImageGenerator classes) |

### Data Flow

1. User runs `image-wizard "prompt"` → `src/index.ts`
2. Config validated from `conf` store (`src/config.ts`)
3. Python script spawned via execa (`src/python.ts`)
4. Python makes HTTP requests to bing.com/images/create
5. Python prints image URLs to stdout (each prefixed with "🖼")
6. Node.js parses stdout for "🖼" lines and extracts URLs

## Development Commands

```bash
# Development
bun run dev "prompt text"    # Run in development mode
bun run build                # Build for production (dist/index.js)

# Code quality (run automatically before build and test)
bun run format               # Prettier formatting
bun run lint                 # ESLint linting
bun run lint:fix             # Auto-fix linting issues
bun run typecheck            # TypeScript type checking

# Testing
bun test                     # Run tests (no test files exist currently)

# Publishing
bun run prepublishOnly       # Runs build before publishing to npm
```

**Note**: The `prebuild` and `pretest` hooks automatically run format, lint:fix, and typecheck.

## Build Process

1. TypeScript compiled to ESNext JavaScript via `bun build`
2. Bundled into single executable at `dist/index.js`
3. Shebang (`#!/usr/bin/env bun`) added for direct execution
4. Python backend files (`bing_create/`) and `requirements.txt` bundled with npm package

## Key Technical Details

### Authentication

- Uses `_U` and `SRCHHPGUSR` cookies from bing.com (not OAuth flow)
- Interactive setup wizard (`image-wizard setup`) opens browser and guides cookie extraction
- Cookies stored system-wide via `conf` package:
  - Windows: `%APPDATA%\image-wizard-cli-nodejs\Config\config.json`
  - macOS: `~/Library/Application Support/image-wizard-cli-nodejs/config.json`
  - Linux: `~/.config/image-wizard-cli-nodejs/config.json`

### Python Integration

- Python dependencies auto-installed via `postinstall` script: `aiofiles`, `httpx`
- 5-minute timeout (300000ms) for image generation operations
- Stdout parsing: looks for lines containing "🖼" to extract image URLs

### Python Backend (`bing_create/main.py`)

- `ImageGenerator` class: Synchronous image generation
- `AsyncImageGenerator` class: Async version with identical logic
- Polls Bing's async results endpoint (`/images/create/async/results/{id}`) until images are ready
- Both classes accept `logging_enabled` parameter to control output

## Tech Stack

- **Runtime**: Node.js 18+ or Bun
- **Language**: TypeScript (ES modules)
- **CLI Framework**: Commander.js
- **UI Library**: @clack/prompts
- **Configuration**: conf
- **Process Execution**: execa
- **Python**: 3.7+ with httpx and aiofiles
