# AGENTS.md

This file provides guidance to AI agents working with this codebase.

## Project Overview

Image Wizard CLI is a command-line tool for generating AI images using Microsoft's Bing DALL-E 3 service. The project uses a hybrid Node.js/Python architecture:

- **Frontend (TypeScript/Node.js)**: CLI interface built with Commander.js and @clack/prompts
- **Backend (Python)**: Bing Image Creator integration in `bing_create/main.py`
- **Bridge**: `src/python.ts` spawns Python subprocesses via `child_process.spawn`
- **Post-processing**: `src/post.ts` uses sharp (magenta→alpha, trim, nearest downscale, ≤32 palette)

## Useful Commands

### Development

```bash
# Run in development mode with hot reload (via bun)
bun run dev "A test prompt"

# Build for production (outputs to dist/index.js)
bun run build
```

### Code Quality

```bash
# Format code with Prettier
bun run format

# Lint TypeScript files
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Type check with TypeScript
bun run typecheck
```

**Note:** The `prebuild` and `pretest` hooks automatically run `format`, `lint:fix`, and `typecheck`.

### Testing

```bash
# Run tests (local pretest formats/lints)
bun test

# CI-friendly tests (no mutating pretest)
bun run test:ci
```

### Running the Built CLI

```bash
# Run the built version
bun run start
# or
./dist/index.js "prompt"
```

### Installing Dependencies

```bash
# Install all dependencies (including Python deps via postinstall)
bun install
```

Python dependencies (`aiofiles`, `httpx`) are installed automatically via the `postinstall` script. Requires Python 3.7+.

### Publishing

```bash
# Pre-publish hook runs build automatically
bun run prepublishOnly
```

## Technologies

### Runtime & Language

- **Runtime**: Node.js 18+ or Bun (ES modules)
- **Frontend Language**: TypeScript 5.9+ (target ESNext)
- **Backend Language**: Python 3.7+
- **Module System**: ES modules (`"type": "module"`)

### Core Dependencies (Frontend)

| Package          | Version | Purpose                                 |
| ---------------- | ------- | --------------------------------------- |
| `@clack/prompts` | 1.0.0   | Beautiful interactive CLI prompts       |
| `commander`      | 14.0.3  | CLI command parsing and help generation |
| `conf`           | 15.0.2  | Cross-platform configuration storage    |
| `sharp`          | 0.34.x  | Pixel-art post-processing               |
| `open`           | 11.0.0  | Opens browser for setup flow            |
| `picocolors`     | 1.1.1   | Terminal colors and styling             |
| `execa`          | 9.6.1   | Declared; bridge currently uses `spawn` |

### Core Dependencies (Backend)

| Package    | Purpose                                             |
| ---------- | --------------------------------------------------- |
| `httpx`    | HTTP requests to Bing Image Creator API             |
| `aiofiles` | Async file operations (used by AsyncImageGenerator) |

### Development Tools

- **Build Tool**: Bun's bundler (`bun build`)
- **Linting**: ESLint 9 with TypeScript ESLint
- **Formatting**: Prettier with plugins for import sorting and package.json
- **Type Checking**: TypeScript compiler in noEmit mode

## Architecture Details

### Key Files

| File                      | Purpose                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `src/index.ts`            | CLI entry: default generate, `setup`, `batch`, `post`, `sheet`                      |
| `src/config.ts`           | Configuration management using `conf` package with validation                       |
| `src/python.ts`           | Python integration layer - spawns Python subprocess and parses stdout               |
| `src/batch.ts`            | Manifest-driven batch runner with skip-existing and daily cap                       |
| `src/post.ts`             | Sharp post-processing pipeline                                                      |
| `src/sheet.ts`            | Sprite-sheet + atlas export                                                         |
| `scripts/check-assets.py` | Pillow validator for alpha, size, palette                                           |
| `bing_create/main.py`     | Core Bing integration logic with `ImageGenerator` and `AsyncImageGenerator` classes |
| `package.json`            | Project metadata, scripts, and dependencies                                         |

### Data Flow

1. User runs `image-wizard "prompt"` → `src/index.ts` parses command
2. Config validated from `conf` store (`src/config.ts`)
3. Python script spawned via `child_process.spawn` (`src/python.ts`) with cookies and parameters
4. Python makes HTTP requests to bing.com/images/create, polls for results
5. Python prints local paths or URLs to stdout (each prefixed with "🖼")
6. Node.js parses stdout for lines containing "🖼" (and falls back to scanning the output dir)
7. Batch mode optionally runs `src/post.ts` (sharp) before writing final PNGs

### Configuration

Configuration is stored system-wide via the `conf` package (`projectName: image-wizard-cli`):

- **Windows**: `%APPDATA%\image-wizard-cli\Config\config.json`
- **macOS**: `~/Library/Application Support/image-wizard-cli/config.json`
- **Linux**: `~/.config/image-wizard-cli/config.json`

Required config keys: `auth_cookie_u`, `auth_cookie_srchhpgusr`. Optional: `output_dir`, `num_images`.

## Best Practices and Guidelines

### Code Style

- **TypeScript**: Use strict mode. All code must pass `tsc --noEmit` and ESLint
- **Module imports**: Use ES module syntax. Import ordering is handled by Prettier plugins
- **Error handling**: Always provide meaningful error messages to users via `@clack/prompts` (`p.log.error()`, etc.)
- **Type safety**: Define interfaces for function parameters and return types (see `GenerateImagesParams`, `GenerateImagesResult` in `src/python.ts`)
- **Async/await**: Prefer async/await over callbacks for asynchronous operations

### CLI Development

- **User experience**: Use `@clack/prompts` for all interactive prompts, spinners, and output formatting
- **Colors**: Use `picocolors` for terminal styling
- **Help text**: Commander.js handles help automatically; ensure descriptions are clear
- **Error messages**: On configuration errors, guide users to run `image-wizard setup`
- **Process exit**: Use `process.exit(1)` on errors, `process.exit(0)` on clean cancellation

### Python Backend

- **Authentication**: Uses Bing cookies (`_U` and `SRCHHPGUSR`) - no OAuth flow
- **Browser simulation**: Use realistic headers and session establishment (GET to `/images/create` first) to mimic real browser behavior
- **Polling**: Bing returns results asynchronously; poll `/images/create/async/results/{id}` until ready
- **Error handling**: Check for blocked prompts, language restrictions, and timeouts
- **Output format**: Print `🖼 <path-or-url>` for Node.js parsing (including when saving to disk)
- **Timeout**: 6-minute timeout on the Node.js side; Python has internal timeouts

### Build & Bundling

- **Target**: Build for Node.js with Bun bundler
- **Entry point**: `src/index.ts` → `dist/index.js`
- **Shebang**: `#!/usr/bin/env node` added via banner
- **External**: `sharp` is marked `--external` (native bindings)
- **Bundled files**: Ensure `bing_create/` directory and `requirements.txt` are included in npm package (configured in `package.json` files array)
- **Python path resolution**: After bundling to `dist/`, the Python script path resolves via `path.join(path.dirname(__dirname), "bing_create", "main.py")` to reach the package root

### Configuration Management

- **Validation**: Always validate config with `validateConfig()` before attempting image generation
- **Defaults**: Sensible defaults are set in `src/config.ts` (`output_dir: "./output"`, `num_images: 4`)
- **CLI overrides**: Command-line options override config defaults
- **Secure storage**: Cookies are stored in platform-appropriate config directories via `conf`

### Development Workflow

1. Make changes to TypeScript files in `src/` or Python files in `bing_create/`
2. Run `bun run format && bun run lint:fix && bun run typecheck` before committing (or rely on prebuild/pretest hooks)
3. Test with `bun run dev "test prompt"`
4. Build with `bun run build` to verify bundling works correctly
5. Ensure Python dependencies are available in development environment

### Important Notes

- **Windows compatibility**: The postinstall script has fallback logic for different Python/pip invocations. Use cross-platform compatible code.
- **Debug logging**: Both Node.js and Python have debug logging to stderr - these are intentional for troubleshooting
- **Bing API changes**: This relies on Bing's undocumented API; be aware it may break if Bing changes their implementation
- **Image URLs**: URLs are extracted from `src="https://tse...` patterns in the HTML response
- **Cookie requirements**: Valid Bing session cookies (`_U`, `SRCHHPGUSR`) are required for authentication

### Git & Repository

- **Branch**: Main development on `main` branch
- **License**: MIT
- **Package name**: `@involvex/image-wizard-cli`
- **Bin command**: `image-wizard`

## Current work

- See [PHASES.md](PHASES.md). Phases 1, 3, 5, 5b/C2 done; C1 native TS Bing provider is the next large CLI item.

## Learned workspace facts

- `setuptools` must not be a runtime dep (Dependabot); only `aiofiles` + `httpx` in `requirements.txt`
- Batch skip-existing checks `outDir/<category>/`, not the outDir root
- sharp is `--external` in the Bun build (native bindings)
- Python bridge uses `spawn`, not `execa` (dep still listed)
