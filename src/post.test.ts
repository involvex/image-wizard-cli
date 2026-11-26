import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { processAsset, isNearMagenta, getCategorySize } from "./post";
import sharp from "sharp";
import path from "path";
import os from "os";
import fs from "fs";

describe("isNearMagenta", () => {
  test("detects pure magenta", () => {
    expect(isNearMagenta(255, 0, 255)).toBe(true);
  });

  test("rejects non-magenta", () => {
    expect(isNearMagenta(10, 200, 10)).toBe(false);
  });
});

describe("getCategorySize", () => {
  test("tiles are 64x32", () => {
    expect(getCategorySize("tiles")).toEqual({ width: 64, height: 32 });
  });

  test("icons are 32x32", () => {
    expect(getCategorySize("icons")).toEqual({ width: 32, height: 32 });
  });

  test("unknown falls back to 64x64", () => {
    expect(getCategorySize("misc")).toEqual({ width: 64, height: 64 });
  });
});

describe("processAsset", () => {
  const tmpRoot = path.join(os.tmpdir(), `iw-post-test-${Date.now()}`);
  const inputPath = path.join(tmpRoot, "input.png");
  const outputPath = path.join(tmpRoot, "out", "icon_0.png");

  beforeAll(async () => {
    fs.mkdirSync(tmpRoot, { recursive: true });
    // 64x64: magenta background + green square in center
    const size = 64;
    const buf = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const inCenter = x >= 20 && x < 44 && y >= 20 && y < 44;
        if (inCenter) {
          buf[i] = 40;
          buf[i + 1] = 200;
          buf[i + 2] = 40;
          buf[i + 3] = 255;
        } else {
          buf[i] = 255;
          buf[i + 1] = 0;
          buf[i + 2] = 255;
          buf[i + 3] = 255;
        }
      }
    }
    await sharp(buf, { raw: { width: size, height: size, channels: 4 } })
      .png()
      .toFile(inputPath);
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("writes PNG with target size and alpha", async () => {
    const result = await processAsset(inputPath, outputPath, {
      category: "icons",
    });

    expect(result.width).toBe(32);
    expect(result.height).toBe(32);
    expect(fs.existsSync(outputPath)).toBe(true);

    const meta = await sharp(outputPath).metadata();
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);

    const { data, info } = await sharp(outputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let transparent = 0;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) {
        transparent++;
      }
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
    }
    expect(transparent).toBeGreaterThan(0);
    expect(colors.size).toBeLessThanOrEqual(32);
    expect(info.width).toBe(32);
    expect(info.height).toBe(32);
  });
});
