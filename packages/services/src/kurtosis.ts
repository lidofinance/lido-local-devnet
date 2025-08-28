import { DevNetServiceConfig } from "./service.js";

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
});
