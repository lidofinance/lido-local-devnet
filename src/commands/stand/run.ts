import { Params, command } from "@devnet/command";
import { readFile } from "node:fs/promises";
import * as YAML from "yaml";
import { z } from "zod";

const StandSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(
    z.object({
      command: z.string(),
      params: z.record(z.any()).optional(),
    }),
  ),
});

export const StandRun = command.cli({
  description: "Execute a stand from a YAML configuration file",
  params: {
    file: Params.string({
      description: "Path to stand YAML file",
      required: true,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const raw = await readFile(params.file, "utf-8");
    const stand = StandSchema.parse(YAML.parse(raw));

    logger.log(`🚀 Running stand: ${stand.name}`);
    if (stand.description) logger.log(stand.description);

    for (const [index, step] of stand.steps.entries()) {
      logger.log(
        `\n[${index + 1}/${stand.steps.length}] ${step.command}`,
      );
      // Convert space-separated command name (user-friendly)
      // to oclif ID format (colon-separated)
      const commandId = step.command.trim().split(/\s+/).join(":");
      await dre.runCommandByName(commandId, step.params ?? {});
    }

    logger.log(`\n✅ Stand ${stand.name} completed`);
  },
});
