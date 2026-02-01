import * as p from "@clack/prompts";
import { Command } from "commander";
import color from "picocolors";
import config from "./config";
import mime from "mime";
import pkg from '../package.json';

const program = new Command();

program
  .name("image-wizard")
  .description("Generate images from text prompts in your terminal using python package bing-create")
  .version(pkg.version)
  .argument("[prompt]", "The image generation prompt")
 

    //   const response = await p.group(
    //     {
    //       prompt: () =>
    //         p.text({
    //           message: "What would you like to generate?",
    //           placeholder: "A futuristic city at sunset",
    //           validate: value => (!value ? "Prompt is required" : undefined),
    //         }),
    //     },
    //     {
    //       onCancel: () => {
    //         p.cancel("Operation cancelled.");
    //         process.exit(0);
    //       },
    //     },
    //   );
    //   prompt = response.prompt;
    

    //   p.outro(color.green("Enjoy your image!"));
    // } catch (error: any) {
    //   s.stop("Generation failed.");
    //   p.log.error(error.message || "An unknown error occurred.");
    //   process.exit(1);
    // }
  

program.parse(process.argv);
