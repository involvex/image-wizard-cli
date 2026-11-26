import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { hasExistingImage } from "./batch";
import path from "path";
import os from "os";
import fs from "fs";

describe("hasExistingImage", () => {
  const tmpRoot = path.join(os.tmpdir(), `iw-batch-test-${Date.now()}`);
  const categoryDir = path.join(tmpRoot, "tiles");

  beforeAll(() => {
    fs.mkdirSync(categoryDir, { recursive: true });
    fs.writeFileSync(path.join(categoryDir, "tile_hub_0_0.png"), "x");
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("finds existing id in category dir", () => {
    expect(hasExistingImage(categoryDir, "tile_hub_0")).toBe(true);
  });

  test("returns false for missing id", () => {
    expect(hasExistingImage(categoryDir, "tile_hub_99")).toBe(false);
  });

  test("returns false for missing directory", () => {
    expect(hasExistingImage(path.join(tmpRoot, "missing"), "tile_hub_0")).toBe(
      false,
    );
  });

  test("does not match files in parent outDir only", () => {
    fs.writeFileSync(path.join(tmpRoot, "orphan_0.png"), "x");
    expect(hasExistingImage(categoryDir, "orphan")).toBe(false);
  });
});
