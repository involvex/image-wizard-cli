import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

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
  quiet?: boolean;
}

export interface GenerateImagesResult {
  success: boolean;
  images?: string[];
  error?: string;
}

let cachedPythonCommand: string | null = null;

/** Prefer python3 / py launcher on systems where `python` is missing. */
export function getPythonCommand(): string {
  if (cachedPythonCommand) {
    return cachedPythonCommand;
  }

  const candidates =
    process.platform === "win32"
      ? ["python", "py", "python3"]
      : ["python3", "python"];

  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: "ignore", windowsHide: true });
      cachedPythonCommand = cmd;
      return cmd;
    } catch {
      // try next
    }
  }

  cachedPythonCommand = "python";
  return cachedPythonCommand;
}

function collectSavedFiles(outputDir: string): string[] {
  try {
    return fs
      .readdirSync(outputDir)
      .filter(name => /\.(jpe?g|png|webp|gif)$/i.test(name))
      .map(name => path.join(outputDir, name));
  } catch {
    return [];
  }
}

export async function generateImages(
  params: GenerateImagesParams,
): Promise<GenerateImagesResult> {
  return new Promise(resolve => {
    const quiet = params.quiet !== false;
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
    if (quiet) {
      args.push("--quiet");
    }

    const pythonCmd = getPythonCommand();
    const redactedArgs = [
      pythonScriptPath,
      "--u",
      "***",
      "--s",
      "***",
      "--prompt",
      params.prompt,
      "--number",
      params.numImages.toString(),
      "--output",
      params.outputDir,
      ...(quiet ? ["--quiet"] : []),
    ];
    if (!quiet) {
      console.error(`[Node] Starting: ${pythonCmd} ${redactedArgs.join(" ")}`);
    }

    let settled = false;
    const finish = (result: GenerateImagesResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const pythonProcess = spawn(pythonCmd, args, {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout?.on("data", data => {
      const text = data.toString();
      if (!quiet) {
        console.error(`[Node] Python stdout: ${text}`);
      }
      stdout += text;
    });

    pythonProcess.stderr?.on("data", data => {
      const text = data.toString();
      if (!quiet) {
        console.error(`[Node] Python stderr: ${text}`);
      }
      stderr += text;
    });

    pythonProcess.on("error", error => {
      if (!quiet) {
        console.error(`[Node] Python process error:`, error);
      }
      finish({
        success: false,
        error: `${error.message}. Ensure Python 3.7+ is on PATH (tried: python, py, python3).`,
      });
    });

    pythonProcess.on("close", code => {
      if (!quiet) {
        console.error(`[Node] Python exited with code: ${code}`);
      }
      if (code === 0) {
        const fromStdout = stdout
          .split("\n")
          .filter(line => line.includes("🖼"))
          .map(line => line.replace("🖼 ", "").trim())
          .filter(Boolean);

        const fromDisk = collectSavedFiles(params.outputDir);
        const images =
          fromStdout.length > 0
            ? fromStdout
            : fromDisk.length > 0
              ? fromDisk
              : [];

        finish({ success: true, images });
      } else {
        finish({
          success: false,
          error: stderr || stdout || `Process exited with code ${code}`,
        });
      }
    });

    const timeout = setTimeout(() => {
      pythonProcess.kill();
      finish({
        success: false,
        error: "Timed out after 6 minutes",
      });
    }, 360000);
  });
}
