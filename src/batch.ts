import config, { validateConfig } from "./config";
import { generateImages } from "./python";
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

interface BatchOptions {
  dryRun?: boolean;
  delay?: number;
  maxPerDay?: number;
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
  const store = config.store as any;
  if (store.batchCounter && store.batchCounter.date === getTodayString()) {
    return store.batchCounter;
  }
  return { date: getTodayString(), count: 0 };
}

function updateBatchCounter(count: number): void {
  const store = config.store as any;
  store.batchCounter = { date: getTodayString(), count };
  config.set(store);
}

function hasExistingImage(outDir: string, id: string): boolean {
  try {
    const entries = fs.readdirSync(outDir);
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

  try {
    // Check config
    const cfg = config.store;
    if (!validateConfig(cfg)) {
      p.log.error(color.red("Configuration not found or invalid."));
      p.log.message(
        `Please run ${color.cyan("image-wizard setup")} to configure your authentication cookies.`,
      );
      process.exit(1);
    }

    // Read manifest
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    const manifest: BatchManifest = JSON.parse(manifestContent);

    const fullOutDir = manifest.outDir;
    const style = manifest.style;

    // Ensure directories exist
    if (!dryRun) {
      fs.mkdirSync(fullOutDir, { recursive: true });
    }

    p.intro(color.cyan("🎨 Image Wizard Batch"));

    for (let i = 0; i < manifest.jobs.length; i++) {
      const job = manifest.jobs[i];
      const fullPrompt = job.prompt + ", " + style;
      const categoryDir = path.join(fullOutDir, job.category);
      const numImages = job.n !== undefined ? job.n : 1;

      // Check if already exists
      if (hasExistingImage(fullOutDir, job.id)) {
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

      // Check daily limit
      const counter = getBatchCounter();
      if (counter.count >= maxPerDay) {
        p.log.error(
          color.red(
            `Daily limit reached (${counter.count}/${maxPerDay}). Stopping cleanly.`,
          ),
        );
        break;
      }

      // Create necessary directories
      fs.mkdirSync(categoryDir, { recursive: true });
      const tmpDir = path.join(fullOutDir, ".tmp", job.id);
      fs.mkdirSync(tmpDir, { recursive: true });

      const s = p.spinner();
      s.start(`Generating ${job.id} (${job.category})...`);

      let success = false;
      let generatedFiles: string[] = [];
      let attempts = 0;
      const maxAttempts = 3; // initial + 2 retries = 3 attempts total

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

          if (result.success && result.images && result.images.length > 0) {
            success = true;
            generatedFiles = result.images;
          } else {
            throw new Error(result.error || "Generation failed");
          }
        } catch (error: unknown) {
          if (attempts < maxAttempts) {
            const waitTime = attempts === 1 ? 60000 : 120000; // 60s after first failure, 120s after second
            s.stop(
              `Failed attempt ${attempts}, retrying in ${waitTime / 1000}s...`,
            );
            await sleep(waitTime);
            s.start(
              `Retrying ${job.id} (${job.category}) (attempt ${attempts + 1})...`,
            );
          } else {
            s.stop(color.red(`Failed ${job.id} after ${maxAttempts} attempts`));
            p.log.error(
              color.red(
                `Error for ${job.id}: ${(error as Error).message || "Unknown error"}`,
              ),
            );
          }
        }
      }

      if (!success) {
        // Clean up tmp dir if it exists
        try {
          if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          }
        } catch {}
        continue; // move to next job
      }

      s.stop(
        color.green(
          `Generated ${generatedFiles.length} image(s) for ${job.id}`,
        ),
      );

      // Move files from tmp to category dir with proper naming
      const movedFiles: string[] = [];
      try {
        const tmpFiles = fs.readdirSync(tmpDir);
        for (let j = 0; j < tmpFiles.length; j++) {
          const tmpFile = tmpFiles[j];
          const ext = path.extname(tmpFile);
          const newName = `${job.id}_${j}.${ext.replace(".", "")}`;
          const srcPath = path.join(tmpDir, tmpFile);
          const destPath = path.join(categoryDir, newName);
          fs.renameSync(srcPath, destPath);
          movedFiles.push(destPath);
        }
      } catch (error: unknown) {
        p.log.error(
          color.red(
            `Error moving files for ${job.id}: ${(error as Error).message}`,
          ),
        );
      }

      // Clean up tmp dir
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch {}

      // Update daily counter
      const currentCounter = getBatchCounter();
      updateBatchCounter(currentCounter.count + numImages);

      // Append to manifest.json in outDir
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

      // Wait between jobs
      if (i < manifest.jobs.length - 1) {
        p.log.message(
          color.gray(`Waiting ${delaySeconds}s before next job...`),
        );
        await sleep(delaySeconds * 1000);
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
