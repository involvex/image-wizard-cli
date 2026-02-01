import Conf from "conf";

interface ConfigSchema {
  auth_cookie_u: string;
  uth_cookie_srchhpgusr: string;
}

const config = new Conf<ConfigSchema>({
  projectName: "image-wizard-cli",
  defaults: {
    auth_cookie_u: "_U:",
    uth_cookie_srchhpgusr: "SRCHHPGUSR:",
  },
});

export default config;
