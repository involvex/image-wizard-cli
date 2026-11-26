import { buildSpriteSheet, buildSheetsForOutDir } from "./sheet";
import { processAsset, getCategorySize } from "./post";
import config, { validateConfig } from "./config";
import type { ConfigSchema } from "./config";
import { generateImages } from "./python";
import * as p from "@clack/prompts";
import { Command } from "commander";
import { runBatch } from "./batch";
import pkg from "../package.json";
import color from "picocolors";
import path from "path";
import open from "open";
import fs from "fs";

const program = new Command();

const MAX_IMAGES = 8;

function parseImageCount(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    throw new Error(`Invalid --number value: "${value}". Use an integer ≥ 1.`);
  }
  if (num > MAX_IMAGES) {
    throw new Error(`--number cannot exceed ${MAX_IMAGES}.`);
  }
  return num;
}

program
  .name("image-wizard")
  .description(
    "Generate images from text prompts in your terminal using Bing Image Creator",
  )
  .version(pkg.version)
  .argument("[prompt]", "The image generation prompt")
  .option("-n, --number <num>", "Number of images to generate")
  .option("-o, --output <dir>", "Output directory")
  .option("-v, --verbose", "Show debug output from the Python backend")
  .action(
    async (
      prompt: string | undefined,
      options: { number?: string; output?: string; verbose?: boolean },
    ) => {
      if (!prompt) {
        program.help();
        return;
      }

      try {
        const cfg = config.store;
        if (!validateConfig(cfg)) {
          p.log.error(color.red("Configuration not found or invalid."));
          p.log.message(
            `Please run ${color.cyan("image-wizard setup")} to configure your authentication cookies.`,
          );
          process.exit(1);
        }

        const numImages = parseImageCount(options.number, cfg.num_images || 4);
        const outputDir = options.output || cfg.output_dir || "./output";

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        p.intro(color.cyan("🎨 Image Wizard"));

        const s = p.spinner();
        s.start(`Generating ${numImages} image${numImages > 1 ? "s" : ""}...`);

        const result = await generateImages({
          prompt,
          numImages,
          outputDir,
          authCookieU: cfg.auth_cookie_u,
          authCookieSrchhpgusr: cfg.auth_cookie_srchhpgusr,
          quiet: !options.verbose,
        });

        if (result.success) {
          const images = result.images || [];
          s.stop(
            `Generated ${images.length} image${images.length === 1 ? "" : "s"}!`,
          );

          if (images.length > 0) {
            p.note(
              images.map((item, i) => `${i + 1}. ${item}`).join("\n"),
              color.green("Generated Images"),
            );
          }

          p.outro(color.green("Enjoy your images!"));
        } else {
          s.stop("Generation failed.");
          p.log.error(color.red(result.error || "An unknown error occurred."));
          process.exit(1);
        }
      } catch (error: unknown) {
        p.log.error(
          color.red((error as Error).message || "An unknown error occurred."),
        );
        process.exit(1);
      }
    },
  );

program
  .command("setup")
  .description("Configure authentication cookies for Bing Image Creator")
  .action(async () => {
    p.intro(color.cyan("🔐 Image Wizard Setup"));

    try {
      const openBrowser = (await p.confirm({
        message: "Open bing.com in your browser to get your cookies?",
        initialValue: true,
      })) as boolean | symbol;

      if (openBrowser === true) {
        p.log.message(color.cyan("\nOpening bing.com in your browser..."));
        await open("https://www.bing.com");

        p.log.message(color.yellow("\n📋 Cookie Extraction Instructions:"));
        p.log.message(
          "1. Open Developer Tools (F12 or right-click → Inspect)\n" +
            "2. Go to the Application tab → Cookies → https://www.bing.com\n" +
            "3. Find the _U cookie and copy its value\n" +
            "4. Find the SRCHHPGUSR cookie and copy its value\n\n" +
            color.bold("Or run this in the browser console:"),
        );
        p.log.message(
          color.gray(
            `document.cookie.match(/_U=([^;]+)/)?.[1];
document.cookie.match(/SRCHHPGUSR=([^;]+)/)?.[1];`,
          ),
        );
        p.log.message("");
      }

      const response = await p.group(
        {
          auth_cookie_u: () =>
            p.text({
              message: "Paste your _U cookie value:",
              placeholder: "Long base64 string starting with characters...",
              validate: value => (!value ? "Cookie is required" : undefined),
            }),

          auth_cookie_srchhpgusr: () =>
            p.text({
              message: "Paste your SRCHHPGUSR cookie value:",
              placeholder: "Cookie value (may contain key=value pairs)",
              validate: value => (!value ? "Cookie is required" : undefined),
            }),

          output_dir: () =>
            p.text({
              message: "Default output directory:",
              initialValue: "./output",
              placeholder: "./output",
            }),

          num_images: () =>
            p.text({
              message: "Default number of images to generate:",
              initialValue: "4",
              placeholder: "4",
              validate: value => {
                if (!value) {
                  return "Please enter a number";
                }
                const num = parseInt(value, 10);
                return isNaN(num) || num < 1
                  ? "Please enter a valid number"
                  : undefined;
              },
            }),
        },
        {
          onCancel: () => {
            p.cancel("Setup cancelled.");
            process.exit(0);
          },
        },
      );

      const configData: ConfigSchema = {
        auth_cookie_u: response.auth_cookie_u as string,
        auth_cookie_srchhpgusr: response.auth_cookie_srchhpgusr as string,
        output_dir: response.output_dir as string,
        num_images: parseInt(response.num_images as string, 10),
      };

      config.clear();
      config.set(configData);

      p.note("Cookies configured", color.green("Configuration Saved"));

      p.outro(color.green("Setup complete! You can now generate images."));
    } catch (error: unknown) {
      p.log.error(color.red((error as Error).message || "Setup failed."));
      process.exit(1);
    }
  });

program
  .command("batch")
  .description("Generate images in batch mode from a manifest file")
  .argument("<manifest.json>", "Path to batch manifest JSON file")
  .option(
    "--dry-run",
    "Show what would be generated without actually generating",
  )
  .option("--delay <seconds>", "Delay between jobs in seconds", "20")
  .option("--max-per-day <n>", "Maximum number of prompts per day", "200")
  .option("--no-post", "Skip sharp post-processing (keep raw Bing JPEG output)")
  .option(
    "--sheets",
    "After batch, pack each category folder into a sprite sheet + atlas",
  )
  .action(
    async (
      manifestPath: string,
      options: {
        dryRun?: boolean;
        delay: string;
        maxPerDay: string;
        noPost?: boolean;
        sheets?: boolean;
      },
    ) => {
      await runBatch(manifestPath, {
        dryRun: options.dryRun,
        delay: parseInt(options.delay, 10) || 20,
        maxPerDay: parseInt(options.maxPerDay, 10) || 200,
        noPost: options.noPost,
        sheets: options.sheets,
      });
    },
  );

program
  .command("post")
  .description(
    "Post-process an image (magenta→alpha, trim, downscale, ≤32 palette)",
  )
  .argument("<file>", "Input image path")
  .requiredOption(
    "-c, --category <name>",
    "Asset category (tiles, props, enemies, icons, ui, characters)",
  )
  .option("-o, --output <file>", "Output PNG path (default: <file>.png)")
  .action(
    async (file: string, options: { category: string; output?: string }) => {
      try {
        if (!fs.existsSync(file)) {
          p.log.error(color.red(`File not found: ${file}`));
          process.exit(1);
        }

        const size = getCategorySize(options.category);
        const outputPath =
          options.output ||
          path.join(
            path.dirname(file),
            `${path.basename(file, path.extname(file))}.png`,
          );

        p.intro(color.cyan("🖼 Image Wizard Post"));
        const s = p.spinner();
        s.start(`Processing → ${size.width}x${size.height}, ≤32 colors...`);

        const result = await processAsset(file, outputPath, {
          category: options.category,
        });

        s.stop(`Wrote ${result.outputPath} (${result.width}x${result.height})`);
        p.outro(color.green("Post-processing complete!"));
      } catch (error: unknown) {
        p.log.error(
          color.red((error as Error).message || "Post-processing failed."),
        );
        process.exit(1);
      }
    },
  );

program
  .command("sheet")
  .description(
    "Pack a category folder (or all categories under outDir) into sprite sheets",
  )
  .argument(
    "<dir>",
    "Category directory (out/icons) or output root (out/) with --all",
  )
  .option(
    "-c, --category <name>",
    "Category for frame size (default: directory name)",
  )
  .option(
    "-o, --output <file>",
    "Output sheet PNG (default: ../sheet_<category>.png)",
  )
  .option("--columns <n>", "Max columns in the grid")
  .option("--all", "Build one sheet per subdirectory of <dir>")
  .action(
    async (
      dir: string,
      options: {
        category?: string;
        output?: string;
        columns?: string;
        all?: boolean;
      },
    ) => {
      try {
        if (!fs.existsSync(dir)) {
          p.log.error(color.red(`Directory not found: ${dir}`));
          process.exit(1);
        }

        p.intro(color.cyan("🧩 Image Wizard Sheet"));

        if (options.all) {
          const s = p.spinner();
          s.start("Building sheets for all categories...");
          const built = await buildSheetsForOutDir(dir);
          s.stop(color.green(`Built ${built.length} sheet(s)`));
          for (const sheet of built) {
            p.note(
              `${sheet.sheetPath}\n${sheet.atlasPath}`,
              sheet.atlas.meta.category,
            );
          }
          p.outro(color.green("Sprite sheets ready!"));
          return;
        }

        const category = options.category || path.basename(path.resolve(dir));
        const outputPath =
          options.output ||
          path.join(path.dirname(path.resolve(dir)), `sheet_${category}.png`);
        const columns = options.columns
          ? parseInt(options.columns, 10)
          : undefined;

        const s = p.spinner();
        s.start(`Packing ${category}...`);
        const result = await buildSpriteSheet({
          inputDir: dir,
          outputPath,
          category,
          columns:
            columns && !isNaN(columns) && columns > 0 ? columns : undefined,
        });
        s.stop(
          color.green(
            `Sheet ${result.atlas.meta.count} frames → ${result.sheetPath}`,
          ),
        );
        p.note(result.atlasPath, color.green("Atlas"));
        p.outro(color.green("Sprite sheet ready!"));
      } catch (error: unknown) {
        p.log.error(
          color.red((error as Error).message || "Sheet export failed."),
        );
        process.exit(1);
      }
    },
  );

program.parse(process.argv);
