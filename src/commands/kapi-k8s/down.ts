import { command } from "@devnet/command";

export const KapiK8sDown = command.cli({
  description: "Stop Kapi in K8s",
  params: {},
  async handler({
    dre: {
      services: { kapi },
    },
  }) {
    await kapi.sh`docker compose -f docker-compose.devnet.yml down -v`;
  },
});
