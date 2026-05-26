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
      description: "Git branch, tag, or commit hash (defaults to develop)",
      default: "develop",
      required: false,
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
    // runCommandByName bypasses oclif default-resolution, so subcommand params
    // arrive as undefined unless mirrored explicitly here.
    if (params.service === "oracle") {
      const networkName = dre.network.name;
      // Sanitize like build-multi.sanitizeBranch — docker tags forbid '/' etc.
      const sanitizedRef = params.ref.replaceAll(/[^\w.-]+/g, "_");
      const oracleImage = "lido/oracle";
      // Tags include ref so different refs occupy distinct slots in registry.
      const accountingTag = `kt-${networkName}-${sanitizedRef}-ao`;
      const ejectorTag = `kt-${networkName}-${sanitizedRef}-vebo`;
      const csmTag = `kt-${networkName}-${sanitizedRef}-csm`;

      logger.log(`🏗️  Building oracle images via build-multi from ${params.ref}...`);
      await dre.runCommandByName(`${topic}:build-multi`, {
        accountingBranch: params.ref,
        ejectorBranch: params.ref,
        csmBranch: params.ref,
        image: oracleImage,
        accountingTag,
        ejectorTag,
        csmTag,
        fetch: true,
        keepWorktrees: true,
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
      // Pass per-role tags explicitly: hasNoImageOverrides() returns false,
      // getImageConfig falls to its bottom return with image="lido/oracle",
      // and getReleaseImage picks our explicit tags. No placeholder needed.
      await dre.runCommandByName(`${topic}:up`, {
        image: oracleImage,
        accountingTag,
        ejectorTag,
        csmTag,
        build: false,
      });

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
