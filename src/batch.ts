import config, { validateConfig } from "./config";
import { buildSheetsForOutDir } from "./sheet";
import { generateImages } from "./python";
import { processAsset } from "./post";
import * as p from "@clack/prompts";
import color from "picocolors";
import path from "path";
import fs from "fs";

interface BatchJob {
  id: string;
  category: string;
  prompt: string;
  n?: number;
}

interface BatchManifest {
  style: string;
  outDir: string;
  jobs: BatchJob[];
}

interface BatchManifestEntry {
  id: string;
  category: string;
  prompt: string;
  files: string[];
  createdAt: string;
}

export interface BatchOptions {
  dryRun?: boolean;
  delay?: number;
  maxPerDay?: number;
  noPost?: boolean;
  sheets?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBatchCounter(): { date: string; count: number } {
  const store = config.store;
  if (store.batchCounter && store.batchCounter.date === getTodayString()) {
    return store.batchCounter;
  }
  return { date: getTodayString(), count: 0 };
}

function updateBatchCounter(count: number): void {
  config.set("batchCounter", { date: getTodayString(), count });
}

/** True if any file named `{id}_*` exists in the category directory. */
export function hasExistingImage(categoryDir: string, id: string): boolean {
  try {
    const entries = fs.readdirSync(categoryDir);
    return entries.some(entry => entry.startsWith(id + "_"));
  } catch {
    return false;
  }
}

export async function runBatch(
  manifestPath: string,
  options: BatchOptions = {},
): Promise<void> {
  const dryRun = options.dryRun || false;
  const delaySeconds = options.delay !== undefined ? options.delay : 20;
  const maxPerDay = options.maxPerDay !== undefined ? options.maxPerDay : 200;
  const noPost = options.noPost || false;
  const sheets = options.sheets || false;

  try {
    const cfg = config.store;
    if (!validateConfig(cfg)) {
      p.log.error(color.red("Configuration not found or invalid."));
      p.log.message(
        `Please run ${color.cyan("image-wizard setup")} to configure your authentication cookies.`,
      );
      process.exit(1);
    }

    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    const manifest: BatchManifest = JSON.parse(manifestContent);

    const fullOutDir = manifest.outDir;
    const style = manifest.style;

    if (!dryRun) {
      fs.mkdirSync(fullOutDir, { recursive: true });
    }

    p.intro(color.cyan("🎨 Image Wizard Batch"));

    for (let i = 0; i < manifest.jobs.length; i++) {
      const job = manifest.jobs[i];
      const fullPrompt = job.prompt + ", " + style;
      const categoryDir = path.join(fullOutDir, job.category);
      const numImages = job.n !== undefined ? job.n : 1;

      if (hasExistingImage(categoryDir, job.id)) {
        p.log.info(
          color.yellow(`SKIP ${job.id} (${job.category}) - already exists`),
        );
        continue;
      }

      if (dryRun) {
        p.log.info(
          color.cyan(`GEN ${job.id} (${job.category}) - "${fullPrompt}"`),
        );
        continue;
      }

      const counter = getBatchCounter();
      if (counter.count >= maxPerDay) {
        p.log.error(
          color.red(
            `Daily limit reached (${counter.count}/${maxPerDay}). Stopping cleanly.`,
          ),
        );
        break;
      }

      fs.mkdirSync(categoryDir, { recursive: true });
      const tmpDir = path.join(fullOutDir, ".tmp", job.id);
      fs.mkdirSync(tmpDir, { recursive: true });

      const s = p.spinner();
      s.start(`Generating ${job.id} (${job.category})...`);

      let success = false;
      let generatedFiles: string[] = [];
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = "";

      while (attempts < maxAttempts && !success) {
        attempts++;
        try {
          const result = await generateImages({
            prompt: fullPrompt,
            numImages: numImages,
            outputDir: tmpDir,
            authCookieU: cfg.auth_cookie_u,
            authCookieSrchhpgusr: cfg.auth_cookie_srchhpgusr,
          });

          if (result.error) {
            lastError = result.error;
          }

          const tmpFilesCheck = fs.existsSync(tmpDir)
            ? fs.readdirSync(tmpDir).filter(f => !f.startsWith("."))
            : [];

          if (tmpFilesCheck.length > 0) {
            success = true;
            generatedFiles = tmpFilesCheck.map(f => path.join(tmpDir, f));
          } else if (
            result.success &&
            result.images &&
            result.images.length > 0
          ) {
            success = true;
            generatedFiles = result.images;
          } else {
            throw new Error(result.error || "Generation failed");
          }
        } catch (error: unknown) {
          if ((error as Error).message) {
            lastError = (error as Error).message;
          }
          if (attempts < maxAttempts) {
            const waitTime = attempts === 1 ? 60000 : 120000;
            s.stop(
              `Failed attempt ${attempts}, retrying in ${waitTime / 1000}s...`,
            );
            await sleep(waitTime);
            s.start(
              `Retrying ${job.id} (${job.category}) (attempt ${attempts + 1})...`,
            );
          } else {
            s.stop(color.red(`Failed ${job.id} after ${maxAttempts} attempts`));
            const errMsg =
              lastError.length > 300 ? lastError.substring(0, 300) : lastError;
            p.log.error(color.red(`Error for ${job.id}: ${errMsg}`));
          }
        }
      }

      if (!success) {
        try {
          if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          }
        } catch (cleanupError: unknown) {
          p.log.warn(
            color.yellow(
              `Could not clean tmp for ${job.id}: ${(cleanupError as Error).message}`,
            ),
          );
        }
        continue;
      }

      s.stop(
        color.green(
          `Generated ${generatedFiles.length} image(s) for ${job.id}`,
        ),
      );

      const movedFiles: string[] = [];
      try {
        const tmpFiles = fs.readdirSync(tmpDir);
        for (let j = 0; j < tmpFiles.length; j++) {
          const tmpFile = tmpFiles[j];
          const srcPath = path.join(tmpDir, tmpFile);

          if (noPost) {
            const ext = path.extname(tmpFile).replace(".", "") || "jpeg";
            const destPath = path.join(categoryDir, `${job.id}_${j}.${ext}`);
            fs.renameSync(srcPath, destPath);
            movedFiles.push(destPath);
          } else {
            const destPath = path.join(categoryDir, `${job.id}_${j}.png`);
            const postSpinner = p.spinner();
            postSpinner.start(`Post-processing ${job.id}_${j}...`);
            try {
              await processAsset(srcPath, destPath, {
                category: job.category,
              });
              postSpinner.stop(color.green(`Processed ${job.id}_${j}.png`));
              movedFiles.push(destPath);
            } catch (postError: unknown) {
              postSpinner.stop(color.red(`Post-process failed`));
              p.log.error(
                color.red(
                  `Post-process ${job.id}_${j}: ${(postError as Error).message}`,
                ),
              );
              // Fallback: keep raw file
              const ext = path.extname(tmpFile).replace(".", "") || "jpeg";
              const fallback = path.join(categoryDir, `${job.id}_${j}.${ext}`);
              fs.renameSync(srcPath, fallback);
              movedFiles.push(fallback);
            }
          }
        }
      } catch (error: unknown) {
        p.log.error(
          color.red(
            `Error moving files for ${job.id}: ${(error as Error).message}`,
          ),
        );
      }

      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch (cleanupError: unknown) {
        p.log.warn(
          color.yellow(
            `Could not clean tmp for ${job.id}: ${(cleanupError as Error).message}`,
          ),
        );
      }

      const currentCounter = getBatchCounter();
      updateBatchCounter(currentCounter.count + numImages);

      const manifestOutPath = path.join(fullOutDir, "manifest.json");
      let manifestEntries: BatchManifestEntry[] = [];
      try {
        if (fs.existsSync(manifestOutPath)) {
          const existingContent = fs.readFileSync(manifestOutPath, "utf-8");
          manifestEntries = JSON.parse(existingContent);
          if (!Array.isArray(manifestEntries)) {
            manifestEntries = [];
          }
        }
      } catch {
        manifestEntries = [];
      }

      manifestEntries.push({
        id: job.id,
        category: job.category,
        prompt: fullPrompt,
        files: movedFiles,
        createdAt: new Date().toISOString(),
      });

      fs.writeFileSync(
        manifestOutPath,
        JSON.stringify(manifestEntries, null, 2),
      );

      if (i < manifest.jobs.length - 1) {
        p.log.message(
          color.gray(`Waiting ${delaySeconds}s before next job...`),
        );
        await sleep(delaySeconds * 1000);
      }
    }

    if (!dryRun && sheets) {
      const s = p.spinner();
      s.start("Building sprite sheets...");
      try {
        const built = await buildSheetsForOutDir(fullOutDir);
        s.stop(
          color.green(
            `Built ${built.length} sheet${built.length === 1 ? "" : "s"}`,
          ),
        );
        for (const sheet of built) {
          p.log.info(
            color.cyan(
              `${sheet.atlas.meta.category}: ${sheet.sheetPath} (${sheet.atlas.meta.count} frames)`,
            ),
          );
        }
      } catch (sheetError: unknown) {
        s.stop(color.red("Sprite sheet export failed"));
        p.log.error(color.red((sheetError as Error).message));
      }
    }

    p.outro(color.green("Batch complete!"));
  } catch (error: unknown) {
    p.log.error(
      color.red((error as Error).message || "An unknown error occurred."),
    );
    process.exit(1);
  }
}
