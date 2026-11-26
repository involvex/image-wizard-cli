import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { buildSpriteSheet, listFrameFiles } from "./sheet";
import sharp from "sharp";
import path from "path";
import os from "os";
import fs from "fs";

describe("buildSpriteSheet", () => {
  const tmpRoot = path.join(os.tmpdir(), `iw-sheet-test-${Date.now()}`);
  const inputDir = path.join(tmpRoot, "icons");

  beforeAll(async () => {
    fs.mkdirSync(inputDir, { recursive: true });
    for (let i = 0; i < 4; i++) {
      const buf = Buffer.alloc(32 * 32 * 4);
      for (let p = 0; p < buf.length; p += 4) {
        buf[p] = 40 + i * 40;
        buf[p + 1] = 180;
        buf[p + 2] = 40;
        buf[p + 3] = 255;
      }
      // transparent border
      for (let x = 0; x < 32; x++) {
        buf[x * 4 + 3] = 0;
        buf[(31 * 32 + x) * 4 + 3] = 0;
      }
      await sharp(buf, { raw: { width: 32, height: 32, channels: 4 } })
        .png()
        .toFile(path.join(inputDir, `icon_test_${i}.png`));
    }
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("lists frame files sorted", () => {
    const files = listFrameFiles(inputDir);
    expect(files.length).toBe(4);
    expect(path.basename(files[0])).toBe("icon_test_0.png");
  });

  test("packs frames into sheet and atlas", async () => {
    const sheetPath = path.join(tmpRoot, "sheet_icons.png");
    const result = await buildSpriteSheet({
      inputDir,
      outputPath: sheetPath,
      category: "icons",
      columns: 2,
    });

    expect(fs.existsSync(result.sheetPath)).toBe(true);
    expect(fs.existsSync(result.atlasPath)).toBe(true);
    expect(result.atlas.meta.count).toBe(4);
    expect(result.atlas.meta.columns).toBe(2);
    expect(result.atlas.meta.rows).toBe(2);
    expect(result.atlas.meta.size).toEqual({ w: 64, h: 64 });
    expect(result.atlas.meta.frameSize).toEqual({ w: 32, h: 32 });
    expect(result.atlas.frames["icon_test_0"].frame).toEqual({
      x: 0,
      y: 0,
      w: 32,
      h: 32,
    });
    expect(result.atlas.frames["icon_test_3"].frame).toEqual({
      x: 32,
      y: 32,
      w: 32,
      h: 32,
    });

    const meta = await sharp(result.sheetPath).metadata();
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
    expect(meta.hasAlpha).toBe(true);
  });
});
