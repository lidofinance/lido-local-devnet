import { Params, command } from "@devnet/command";
import { serviceConfigs } from "@devnet/service";

import { GitCheckout } from "../git/checkout.js";

import { ServiceInstallDeps } from "./install-deps.js";

export const ServiceRebuild = command.cli({
  description:
    "Rebuild a service: checkout branch, install dependencies, and run service install hook",
  params: {
    service: Params.option({
      description: "Service name (e.g. oracle, kapi, csm)",
      options: Object.keys(serviceConfigs) as (keyof typeof serviceConfigs)[],
      required: true,
    })(),
    ref: Params.string({
      description: "Git branch, tag, or commit hash",
      required: true,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    logger.log(`🔀 Checking out ${params.service} @ ${params.ref}`);
    await dre.runCommand(GitCheckout, {
      service: params.service,
      ref: params.ref,
    });

    logger.log(`📦 Installing dependencies for ${params.service}...`);
    await dre.runCommand(ServiceInstallDeps, {
      service: params.service,
    });

    logger.log(
      `✅ ${params.service} checked out to ${params.ref} with dependencies installed`,
    );
    logger.log(
      `ℹ️  To complete the rebuild, run the service build and deploy commands:`,
    );
    logger.log(
      `   ./bin/run.js ${params.service} build && ./bin/run.js ${params.service} up`,
    );
  },
});
