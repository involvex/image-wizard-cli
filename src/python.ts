import { spawn } from "child_process";
import { fileURLToPath } from "url";
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

// Determine Python command
function getPythonCommand(): string {
  // Use 'python' on all platforms
  return "python";
}

export async function generateImages(
  params: GenerateImagesParams,
): Promise<GenerateImagesResult> {
  return new Promise(resolve => {
    const args = [
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
    ];

    console.error(`[Node] Starting: ${getPythonCommand()} ${args.join(" ")}`);

    const pythonProcess = spawn(getPythonCommand(), args, {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout?.on("data", data => {
      const text = data.toString();
      console.error(`[Node] Python stdout: ${text}`);
      stdout += text;
    });

    pythonProcess.stderr?.on("data", data => {
      const text = data.toString();
      console.error(`[Node] Python stderr: ${text}`);
      stderr += text;
    });

    pythonProcess.on("error", error => {
      console.error(`[Node] Python process error:`, error);
      resolve({
        success: false,
        error: error.message,
      });
    });

    pythonProcess.on("close", code => {
      console.error(`[Node] Python exited with code: ${code}`);
      if (code === 0) {
        // Parse image URLs from stdout
        const images = stdout
          .split("\n")
          .filter(line => line.includes("🖼"))
          .map(line => line.replace("🖼 ", "").trim());
        resolve({ success: true, images });
      } else {
        resolve({
          success: false,
          error: stderr || stdout || `Process exited with code ${code}`,
        });
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      pythonProcess.kill();
      resolve({
        success: false,
        error: "Timed out after 5 minutes",
      });
    }, 300000);
  });
}
