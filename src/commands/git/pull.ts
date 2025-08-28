import { Params, command } from "@devnet/command";
import { serviceConfigs } from "@devnet/service";

export const GitCheckout = command.cli({
  description: "Retrieve changes from a Git branch in a specified service.",
  params: {
    service: Params.option({
      description: "Name of one of the existing services.",
      options: Object.keys(serviceConfigs) as (keyof typeof serviceConfigs)[],
      required: true,
    })(),
    branch: Params.string({
      description: "Git branch name.",
      required: true,
    }),
  },
  async handler({ params: { service, branch }, dre }) {
    const targetService = dre.services[service];

    await targetService.sh`git pull origin ${branch}`;
  },
});
