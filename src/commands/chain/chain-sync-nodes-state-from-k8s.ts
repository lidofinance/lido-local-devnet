import { command } from "@devnet/command";
import { getK8sService } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import {
  assertNonEmpty,
  isInstance, isNonEmptyArray,
  not,
  throwError
} from "@devnet/utils";

import { nodesExtension } from "./extensions/nodes.extension.js";

const SUPPORTED_CL = ["lighthouse", "teku", "prysm"];
const SUPPORTED_EL = ["geth", "reth", "lodestar"];

const elRegex = new RegExp(`^el-[1-9]-(${SUPPORTED_EL.join('|')})-(${SUPPORTED_CL.join('|')})$`);
const clRegex = new RegExp(`^cl-[1-9]-(${SUPPORTED_CL.join("|")})-(${SUPPORTED_EL.join('|')})$`);
const vcRegex = new RegExp(`^vc-[1-9]-(${SUPPORTED_EL.join("|")})-(${SUPPORTED_CL.join('|')})$`);

const getClientTypeFromK8sServiceName = (k8sServiceName: string, regex: RegExp) => {
  const results = k8sServiceName.match(regex);
  return results?.[1];
}

const getVcClientTypeFromK8sServiceName = (k8sServiceName: string, regex: RegExp) => {
  const results = k8sServiceName.match(regex);
  return results?.[2];
}

export const ChainSyncNodesStateFromK8s = command.cli({
  description:
    "Get nodes state from K8s and save it to JSON state",
  params: {},
  extensions: [nodesExtension],
  async handler({ dre, dre: { logger } }) {
    logger.log("Getting nodes state from K8s...");

    const elServices = await getK8sService(dre, { name: elRegex });

    // execution
    const elNodes = elServices.map((elService) => {
      logger.log(`Found execution node service: [${elService.metadata?.name}]`);

      const elRpcPort = elService
        .spec?.ports?.find((p) => p.name === 'rpc')?.port;
      const elWsPort = elService
        .spec?.ports?.find((p) => p.name === 'ws')?.port;

      if (!elRpcPort) {
        return new DevNetError("❌ Execution node service [rpc] port not found");
      }

      if (!elWsPort) {
        return new DevNetError("❌ Execution node service [ws] port not found");
      }

      const elK8sServiceName = elService?.metadata?.name;
      if (!elK8sServiceName) {
        return new DevNetError("❌ Execution node k8s service name not found or empty");
      }

      const clientType = getClientTypeFromK8sServiceName(elK8sServiceName, elRegex);

      if (!clientType) {
        return new DevNetError("❌ Execution node client type not found or empty");
      }

      return { clientType, rpcPort: elRpcPort, wsPort: elWsPort, k8sService: elK8sServiceName };
    });

    // consensus
    const clServices = await getK8sService(dre, { name: clRegex });
    const clNodes = clServices.map((clService) => {
      logger.log(`Found consensus node service: [${clService.metadata?.name}]`);

      const clHttpPort = clService
        .spec?.ports?.find((p) => p.name === 'http')?.port;

      if (!clHttpPort) {
        return new DevNetError("❌ Consensus node service [http] port not found");
      }

      const clK8sServiceName = clService?.metadata?.name;
      if (!clK8sServiceName) {
        return new DevNetError("❌ Consensus node k8s service name not found or empty");
      }

      const clientType = getClientTypeFromK8sServiceName(clK8sServiceName, clRegex);

      if (!clientType) {
        return new DevNetError("❌ Consensus node client type not found or empty");
      }

      return { clientType, httpPort: clHttpPort, k8sService: clK8sServiceName };
    });

    // validator client
    const vcServices = await getK8sService(dre, { name: vcRegex });
    const vcNodes = vcServices.map((vlService) => {
      logger.log(`Found validator client node service: [${vlService.metadata?.name}]`);

      const vcHttpValidatorPort = vlService
        .spec?.ports?.find((p) => p.name === 'http-validator')?.port;

      if (!vcHttpValidatorPort) {
        return new DevNetError("❌ Validator client node service [http-validator] port not found");
      }

      const k8sServiceName = vlService?.metadata?.name;
      if (!k8sServiceName) {
        return new DevNetError("❌ Validator client nodes k8s service name not found or empty");
      }

      const clientType = getVcClientTypeFromK8sServiceName(k8sServiceName, vcRegex);

      if (!clientType) {
        return new DevNetError("❌ Validator client node client type not found or empty");
      }

      return { clientType, httpValidatorPort: vcHttpValidatorPort, k8sService: k8sServiceName };
    });

    if (elNodes.every(isInstance(DevNetError)) && isNonEmptyArray(elNodes)) {
      return throwError(elNodes[0]);
    }

    if (clNodes.every(isInstance(DevNetError)) && isNonEmptyArray(clNodes)) {
      return throwError(clNodes[0]);
    }

    if (vcNodes.every(isInstance(DevNetError)) && isNonEmptyArray(vcNodes)) {
      return throwError(vcNodes[0]);
    }

    await dre.state.updateNodes({
      el: assertNonEmpty(elNodes.filter(not(isInstance(DevNetError))),
        () => new DevNetError('No execution nodes found')),
      cl: assertNonEmpty(clNodes.filter(not(isInstance(DevNetError))),
        () => new DevNetError('No consensus nodes found')),
      vc: assertNonEmpty(vcNodes.filter(not(isInstance(DevNetError))),
        () => new DevNetError('No validator client nodes found')),
    })
  },
});
