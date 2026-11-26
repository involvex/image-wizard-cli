## [0.0.5](https://github.com/involvex/image-wizard-cli/compare/v0.0.4...v0.0.5) (2026-11-26)

### Security

- Remove unused `setuptools` pin from `requirements.txt` / `setup.py` (Dependabot alerts)

### Features

- Add sharp post-processing (`src/post.ts`): magenta→alpha, trim, nearest-neighbor resize by category, ≤32-color PNG
- Add sprite-sheet export (`src/sheet.ts`): grid pack + `.atlas.json`; `image-wizard sheet` and batch `--sheets`
- Add `scripts/check-assets.py` (Pillow) for alpha / size / ≤32-color checks
- Add `image-wizard post` command and batch `--no-post` flag
- Document `batch` command and manifest schema in README

### Bug Fixes

- Print local paths when saving images so the CLI reports success correctly
- Reject placeholder Bing cookies in `validateConfig`
- Batch skip-existing now checks `outDir/<category>/`
- Clear Python subprocess timeout on process exit; try `python` / `py` / `python3`
- Quiet Python debug by default (`--verbose` to enable)
- Use `#!/usr/bin/env node` shebang for npm global installs

### Tests / CI

- Add unit tests for config, batch skip, and post pipeline
- Add GitHub Actions CI (typecheck, lint, test, build)

## [0.0.3](https://github.com/involvex/image-wizard-cli/compare/v0.0.2...v0.0.3) (2026-02-01)

## [0.0.2](https://github.com/involvex/image-wizard-cli/compare/4f8f9d0579c89d51297b3fdf00f42bcc4a4ed124...v0.0.2) (2026-02-01)

### Features

- **cli:** add Image Wizard CLI wrapper and project tooling ([4f8f9d0](https://github.com/involvex/image-wizard-cli/commit/4f8f9d0579c89d51297b3fdf00f42bcc4a4ed124))
