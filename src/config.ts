import Conf from "conf";

export interface ConfigSchema {
  auth_cookie_u: string;
  auth_cookie_srchhpgusr: string;
  output_dir?: string;
  num_images?: number;
  batchCounter?: { date: string; count: number };
}

const PLACEHOLDER_U = "_U:";
const PLACEHOLDER_SRCH = "SRCHHPGUSR:";

export function validateConfig(cfg: ConfigSchema): boolean {
  const u = cfg.auth_cookie_u?.trim() ?? "";
  const s = cfg.auth_cookie_srchhpgusr?.trim() ?? "";
  if (!u || !s) {
    return false;
  }
  if (u === PLACEHOLDER_U || u.length < 10) {
    return false;
  }
  if (s === PLACEHOLDER_SRCH || s.length < 10) {
    return false;
  }
  return true;
}

const config = new Conf<ConfigSchema>({
  projectName: "image-wizard-cli",
  defaults: {
    auth_cookie_u: PLACEHOLDER_U,
    auth_cookie_srchhpgusr: PLACEHOLDER_SRCH,
    output_dir: "./output",
    num_images: 4,
  },
});

export default config;
