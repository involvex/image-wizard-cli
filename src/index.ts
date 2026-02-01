import config, { validateConfig } from "./config";
import type { ConfigSchema } from "./config";
import { generateImages } from "./python";
import * as p from "@clack/prompts";
import { Command } from "commander";
import { fileURLToPath } from "url";
import pkg from "../package.json";
import color from "picocolors";
import path from "path";
import open from "open";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name("image-wizard")
  .description(
    "Generate images from text prompts in your terminal using python package bing-create",
  )
  .version(pkg.version)
  .argument("[prompt]", "The image generation prompt")
  .option("-n, --number <num>", "Number of images to generate", "4")
  .option("-o, --output <dir>", "Output directory", "./output")
  .action(
    async (
      prompt: string | undefined,
      options: { number: string; output: string },
    ) => {
      // If no prompt provided, show help
      if (!prompt) {
        program.help();
        return;
      }

      try {
        // Check if config exists and is valid
        const cfg = config.store;
        if (!validateConfig(cfg)) {
          p.log.error(color.red("Configuration not found or invalid."));
          p.log.message(
            `Please run ${color.cyan("image-wizard setup")} to configure your authentication cookies.`,
          );
          process.exit(1);
        }

        // Parse options
        const numImages = parseInt(options.number, 10) || cfg.num_images || 4;
        const outputDir = options.output || cfg.output_dir || "./output";

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Show generation info
        p.intro(color.cyan("🎨 Image Wizard"));

        const s = p.spinner();
        s.start(`Generating ${numImages} image${numImages > 1 ? "s" : ""}...`);

        // Generate images
        const result = await generateImages({
          prompt,
          numImages,
          outputDir,
          authCookieU: cfg.auth_cookie_u,
          authCookieSrchhpgusr: cfg.auth_cookie_srchhpgusr,
        });

        if (result.success) {
          s.stop(
            `Generated ${result.images?.length || 0} image${result.images?.length === 1 ? "" : "s"}!`,
          );

          if (result.images && result.images.length > 0) {
            p.note(
              result.images.map((url, i) => `${i + 1}. ${url}`).join("\n"),
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

// Setup command
program
  .command("setup")
  .description("Configure authentication cookies for Bing Image Creator")
  .action(async () => {
    p.intro(color.cyan("🔐 Image Wizard Setup"));

    try {
      // First, open browser and show instructions
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

      // Then collect cookies
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

      // Save config
      const configData: ConfigSchema = {
        auth_cookie_u: response.auth_cookie_u as string,
        auth_cookie_srchhpgusr: response.auth_cookie_srchhpgusr as string,
        output_dir: response.output_dir as string,
        num_images: parseInt(response.num_images as string, 10),
      };

      config.clear();
      config.set(configData);

      p.note(
        `Cookies configured: ${(response.auth_cookie_u as string).substring(0, 10)}...`,
        color.green("Configuration Saved"),
      );

      p.outro(color.green("Setup complete! You can now generate images."));
    } catch (error: unknown) {
      p.log.error(color.red((error as Error).message || "Setup failed."));
      process.exit(1);
    }
  });

program.parse(process.argv);
