import { command } from "@devnet/command";

export const OracleK8sDown = command.cli({
  description: "Stop Oracle(s) in K8s",
  params: {},
  async handler({ dre: { services: { oracle }, }, }) {

  },
});
