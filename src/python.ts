import { execa } from "execa";

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

export async function generateImages(
  params: GenerateImagesParams,
): Promise<GenerateImagesResult> {
  try {
    const { stdout } = await execa(
      "python",
      [
        "bing_create/main.py",
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
