import { fileURLToPath } from "url";
import { execa } from "execa";
import path from "path";

// Get the directory of the current module (dist/index.js after bundling)
// Then resolve bing_create relative to the package root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pythonScriptPath = path.join(
  path.dirname(__dirname), // Go up from dist/ to package root
  "bing_create",
  "main.py",
);

export interface GenerateImagesParams {
  prompt: string;
  numImages: number;
  outputDir: string;
  authCookieU: string;
  authCookieSrchhpgusr: string;
}

export interface GenerateImagesResult {
  success: boolean;
  images?: string[];
  error?: string;
}

// Determine Python command (python for Unix/Mac, py for Windows)
function getPythonCommand(): string {
  try {
    // On Windows, try 'py' first (Python Launcher for Windows)
    if (process.platform === "win32") {
      return "py";
    }
  } catch {
    // Fall through to default
  }
  return "python";
}

export async function generateImages(
  params: GenerateImagesParams,
): Promise<GenerateImagesResult> {
  try {
    // Debug: log the resolved Python script path
    console.error(`[DEBUG] Python script path: ${pythonScriptPath}`);
    console.error(`[DEBUG] __filename: ${__filename}`);
    console.error(`[DEBUG] __dirname: ${__dirname}`);

    const { stdout } = await execa(
      getPythonCommand(),
      [
        pythonScriptPath,
        "--u",
        params.authCookieU,
        "--s",
        params.authCookieSrchhpgusr,
        "--prompt",
        params.prompt,
        "--number",
        params.numImages.toString(),
        "--output",
        params.outputDir,
      ],
      {
        timeout: 300000, // 5 minutes
        env: { PYTHONIOENCODING: "utf-8" },
      },
    );

    // Parse image URLs from stdout
    const images = stdout
      .split("\n")
      .filter(line => line.includes("🖼"))
      .map(line => line.replace("🖼 ", "").trim());

    return { success: true, images };
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    return {
      success: false,
      error: err.stderr || err.message || "Unknown error",
    };
  }
}
