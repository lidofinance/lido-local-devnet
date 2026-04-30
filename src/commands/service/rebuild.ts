import { Params, command } from "@devnet/command";
import { serviceConfigs } from "@devnet/service";

import { GitCheckout } from "../git/checkout.js";
import { ServiceInstallDeps } from "./install-deps.js";

export const ServiceRebuild = command.cli({
  description:
    "Rebuild a service end-to-end: checkout branch, install deps, build image and redeploy",
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
    skipDeploy: Params.boolean({
      description: "Skip build and deploy steps (only checkout + install deps)",
      default: false,
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

    if (params.skipDeploy) {
      logger.log(
        `✅ ${params.service} checked out to ${params.ref}. skipDeploy=true → build/up not executed`,
      );
      return;
    }

    const config = dre.services[params.service].config as { k8sTopic?: string };
    const topic = config.k8sTopic;

    if (!topic) {
      logger.log(
        `⚠️  Service "${params.service}" has no k8sTopic — build/up skipped`,
      );
      return;
    }

    // Oracle has three role-specific images (ao/vebo/csm) and a stateful
    // performance DB; route through build-multi + down --keepDb so the DB
    // survives the redeploy and all roles get the new code.
    if (params.service === "oracle") {
      logger.log(`🏗️  Building oracle images via build-multi from ${params.ref}...`);
      await dre.runCommandByName(`${topic}:build-multi`, {
        accountingBranch: params.ref,
        ejectorBranch: params.ref,
        csmBranch: params.ref,
      });

      logger.log(`🧹 Tearing down oracle deployment (keeping performance DB)...`);
      try {
        await dre.runCommandByName(`${topic}:down`, { force: true, keepDb: true });
      } catch (error) {
        logger.log(
          `⚠️  ${topic}:down failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      logger.log(`🚀 Deploying oracle...`);
      await dre.runCommandByName(`${topic}:up`, {});

      logger.log(`✅ oracle rebuilt and deployed`);
      return;
    }

    logger.log(`🏗️  Building ${topic} image...`);
    await dre.runCommandByName(`${topic}:build`, {});

    // Tear down existing deployment first so `up` doesn't skip with
    // "already running" and the fresh image is actually picked up.
    logger.log(`🧹 Tearing down existing ${topic} deployment (if any)...`);
    try {
      await dre.runCommandByName(`${topic}:down`, {});
    } catch (error) {
      logger.log(
        `⚠️  ${topic}:down failed (probably not deployed yet): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    logger.log(`🚀 Deploying ${topic}...`);
    await dre.runCommandByName(`${topic}:up`, {});

    logger.log(`✅ ${params.service} rebuilt and deployed`);
  },
});
