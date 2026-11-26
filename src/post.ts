import sharp from "sharp";
import path from "path";
import fs from "fs";

/** Target sizes by batch category (PHASES C2). */
export const CATEGORY_SIZES: Record<string, { width: number; height: number }> =
  {
    tiles: { width: 64, height: 32 },
    props: { width: 64, height: 64 },
    enemies: { width: 64, height: 64 },
    characters: { width: 64, height: 64 },
    icons: { width: 32, height: 32 },
    ui: { width: 32, height: 32 },
  };

const DEFAULT_SIZE = { width: 64, height: 64 };
const MAX_COLORS = 32;

/** Near-magenta RGB used as chromakey in generation prompts. */
export function isNearMagenta(
  r: number,
  g: number,
  b: number,
  threshold = { minRB: 200, maxG: 80 },
): boolean {
  return r >= threshold.minRB && b >= threshold.minRB && g <= threshold.maxG;
}

export function getCategorySize(category: string): {
  width: number;
  height: number;
} {
  const key = category.toLowerCase();
  return CATEGORY_SIZES[key] ?? DEFAULT_SIZE;
}

export interface ProcessAssetOptions {
  category: string;
  maxColors?: number;
}

export interface ProcessAssetResult {
  outputPath: string;
  width: number;
  height: number;
}

/**
 * Magenta → alpha, trim, nearest-neighbor fit onto transparent canvas, ≤32-color PNG.
 */
export async function processAsset(
  inputPath: string,
  outputPath: string,
  options: ProcessAssetOptions,
): Promise<ProcessAssetResult> {
  const maxColors = options.maxColors ?? MAX_COLORS;
  const { width, height } = getCategorySize(options.category);

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    if (isNearMagenta(data[i], data[i + 1], data[i + 2])) {
      data[i + 3] = 0;
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let spritePng = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  try {
    spritePng = await sharp(spritePng).trim({ threshold: 10 }).png().toBuffer();
  } catch {
    // Fully transparent or trim failed — keep untrimmed image
  }

  const spriteMeta = await sharp(spritePng).metadata();
  const srcW = spriteMeta.width || 1;
  const srcH = spriteMeta.height || 1;
  // Downscale only (nearest). Never upscale — center on transparent canvas instead.
  const scale = Math.min(1, width / srcW, height / srcH);
  const fittedW = Math.max(1, Math.round(srcW * scale));
  const fittedH = Math.max(1, Math.round(srcH * scale));
  const left = Math.floor((width - fittedW) / 2);
  const top = Math.floor((height - fittedH) / 2);

  const fittedSprite = await sharp(spritePng)
    .resize(fittedW, fittedH, { kernel: "nearest" })
    .png()
    .toBuffer();

  const composed = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fittedSprite, left, top }])
    .png()
    .toBuffer();

  await sharp(composed)
    .ensureAlpha()
    .png({
      palette: true,
      colors: maxColors,
      compressionLevel: 9,
      effort: 10,
    })
    .toFile(outputPath);

  // Palette encode can drop tRNS when libimagequant flattens; fall back to RGBA
  const meta = await sharp(outputPath).metadata();
  if (!meta.hasAlpha) {
    await sharp(composed)
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toFile(outputPath);
  }

  const finalMeta = await sharp(outputPath).metadata();
  return {
    outputPath,
    width: finalMeta.width ?? width,
    height: finalMeta.height ?? height,
  };
}
