import Conf from "conf";

export interface ConfigSchema {
  auth_cookie_u: string;
  auth_cookie_srchhpgusr: string;
  output_dir?: string;
  num_images?: number;
}

export function validateConfig(cfg: ConfigSchema): boolean {
  return !!(cfg.auth_cookie_u && cfg.auth_cookie_srchhpgusr);
}

const config = new Conf<ConfigSchema>({
  projectName: "image-wizard-cli",
  defaults: {
    auth_cookie_u: "_U:",
    auth_cookie_srchhpgusr: "SRCHHPGUSR:",
    output_dir: "./output",
    num_images: 4,
  },
});

export default config;
