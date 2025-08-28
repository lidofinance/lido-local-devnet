import { DevNetServiceConfig } from "../service-config.js";

export const kurtosis = new DevNetServiceConfig({
  workspace: "workspaces/kurtosis",
  name: "kurtosis" as const,
  constants: {},
  labels: {
    dora: "service_name=dora",
    el: "com.kurtosistech.custom.ethereum-package.client-type=execution",
    cl: "com.kurtosistech.custom.ethereum-package.client-type=beacon",
    vc: "com.kurtosistech.custom.ethereum-package.client-type=validator",
  },
  getters: {
    async DEPOSIT_CONTRACT_ADDRESS() {
      return '1';
    },
    async GENESIS_TIME() {
      return 1;
    }
  }
});
