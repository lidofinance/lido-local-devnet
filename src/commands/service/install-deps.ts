import { Params, command } from "@devnet/command";
import { serviceConfigs } from "@devnet/service";

export const ServiceInstallDeps = command.cli({
  description: "Install dependencies for a service using its configured package manager",
  params: {
    service: Params.option({
      description: "Service name (e.g. oracle, kapi, csm)",
      options: Object.keys(serviceConfigs) as (keyof typeof serviceConfigs)[],
      required: true,
    })(),
  },
  async handler({ params, dre, dre: { logger } }) {
    const service = dre.services[params.service];
    const installCmd = (service.config as { installCommand?: string }).installCommand;

    if (!installCmd) {
      logger.log(`⚠️ No installCommand configured for "${params.service}", skipping`);
      return;
    }

    logger.log(`📦 Installing dependencies for ${params.service}: ${installCmd}`);
    await service.sh`${installCmd}`;
    logger.log(`✅ Dependencies installed for ${params.service}`);
  },
});
