import { getCategorySize } from "./post";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

export interface SheetFrame {
  id: string;
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteSheetAtlas {
  meta: {
    image: string;
    category: string;
    size: { w: number; h: number };
    frameSize: { w: number; h: number };
    columns: number;
    rows: number;
    count: number;
  };
  frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  >;
}

export interface BuildSpriteSheetOptions {
  /** Directory of per-frame images (e.g. out/tiles). */
  inputDir: string;
  /** Output PNG path for the sheet. */
  outputPath: string;
  /** Asset category for default frame size. */
  category: string;
  /** Override frame width. */
  frameWidth?: number;
  /** Override frame height. */
  frameHeight?: number;
  /** Max columns before wrapping (default: ceil(sqrt(n))). */
  columns?: number;
}

export interface BuildSpriteSheetResult {
  sheetPath: string;
  atlasPath: string;
  atlas: SpriteSheetAtlas;
}

/** List image files in a directory, sorted by name. */
export function listFrameFiles(inputDir: string): string[] {
  if (!fs.existsSync(inputDir)) {
    return [];
  }
  return fs
    .readdirSync(inputDir)
    .filter(name => IMAGE_EXT.test(name) && !name.endsWith(".atlas.json"))
    .filter(name => !name.startsWith("sheet_"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(name => path.join(inputDir, name));
}

function frameIdFromFile(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Pack equal-sized frames into a grid sprite sheet + JSON atlas.
 */
export async function buildSpriteSheet(
  options: BuildSpriteSheetOptions,
): Promise<BuildSpriteSheetResult> {
  const files = listFrameFiles(options.inputDir);
  if (files.length === 0) {
    throw new Error(`No images found in ${options.inputDir}`);
  }

  const size = getCategorySize(options.category);
  const frameW = options.frameWidth ?? size.width;
  const frameH = options.frameHeight ?? size.height;
  const columns =
    options.columns ?? Math.max(1, Math.ceil(Math.sqrt(files.length)));
  const rows = Math.ceil(files.length / columns);
  const sheetW = columns * frameW;
  const sheetH = rows * frameH;

  const composites: sharp.OverlayOptions[] = [];
  const frames: SpriteSheetAtlas["frames"] = {};
  const frameList: SheetFrame[] = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = col * frameW;
    const y = row * frameH;
    const id = frameIdFromFile(filePath);

    const buffer = await sharp(filePath)
      .ensureAlpha()
      .resize(frameW, frameH, {
        fit: "contain",
        kernel: "nearest",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    composites.push({ input: buffer, left: x, top: y });
    frames[id] = { frame: { x, y, w: frameW, h: frameH } };
    frameList.push({
      id,
      file: path.basename(filePath),
      x,
      y,
      w: frameW,
      h: frameH,
    });
  }

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });

  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(options.outputPath);

  const atlas: SpriteSheetAtlas = {
    meta: {
      image: path.basename(options.outputPath),
      category: options.category,
      size: { w: sheetW, h: sheetH },
      frameSize: { w: frameW, h: frameH },
      columns,
      rows,
      count: files.length,
    },
    frames,
  };

  const atlasPath = options.outputPath.replace(/\.png$/i, "") + ".atlas.json";
  fs.writeFileSync(atlasPath, JSON.stringify(atlas, null, 2));

  return { sheetPath: options.outputPath, atlasPath, atlas };
}

/**
 * Build one sheet per category subdirectory under outDir.
 */
export async function buildSheetsForOutDir(
  outDir: string,
): Promise<BuildSpriteSheetResult[]> {
  if (!fs.existsSync(outDir)) {
    return [];
  }

  const entries = fs.readdirSync(outDir, { withFileTypes: true });
  const results: BuildSpriteSheetResult[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.startsWith(".")) {
      continue;
    }

    const categoryDir = path.join(outDir, entry.name);
    const files = listFrameFiles(categoryDir);
    if (files.length === 0) {
      continue;
    }

    const result = await buildSpriteSheet({
      inputDir: categoryDir,
      outputPath: path.join(outDir, `sheet_${entry.name}.png`),
      category: entry.name,
    });
    results.push(result);
  }

  return results;
}
