import { toHex, getAddress } from 'viem'

import { DevnetServiceConfig } from "../devnet-service-config.js";


export const kurtosis = new DevnetServiceConfig({
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
    async DEPOSIT_CONTRACT_ADDRESS(service) {
      const json = await service.readJson('network/genesis.json');

      return getAddress(json?.config?.depositContractAddress ?? '');
    },
    async GENESIS_TIME(service) {
      const json = await service.readJson('network/genesis.json');

      return Number(json.timestamp as number);
    }
  }
});
