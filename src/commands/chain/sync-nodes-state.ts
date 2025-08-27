import { DevNetError, command } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

import { nodesExtension } from "./extensions/nodes.extension.js";

const SUPPORTED_CL = ["lighthouse", "teku", "prysm"];
const SUPPORTED_EL = ["geth"];

const elRegex = new RegExp(`^el-[1-9]-(${SUPPORTED_EL.join('|')})-(${SUPPORTED_CL.join('|')})$`);
const clRegex = new RegExp(`^cl-[1-9]-(${SUPPORTED_CL.join("|")})-(${SUPPORTED_EL.join('|')})`);
const vcRegex = new RegExp(`^vc-[1-9]-(${SUPPORTED_EL.join("|")})-(${SUPPORTED_CL.join('|')})`);

export const SyncNodesState = command.cli({
  description:
    "Get nodes state from K8s and save it to JSON state",
  params: {},
  extensions: [nodesExtension],
  async handler({ dre }) {
    const { network, logger, state } = dre;

    logger.log(
      "Getting nodes state from K8s...",
    );

    const kc = await state.getK8s();
    const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

    const k8sServices = await k8sCoreApi.listNamespacedService({ namespace: `kt-${network.name}`});

    const elService = k8sServices.items.filter(
      (service) => (service.metadata?.name?.match(elRegex))
    ).pop();

    // execution
    const elRpcPort = elService?.spec?.ports?.find((p) => p.name === 'rpc')?.port;
    const elWsPort = elService?.spec?.ports?.find((p) => p.name === 'ws')?.port;

    if (!elRpcPort) {
      throw new DevNetError("❌ Execution node service [rpc] port not found");
    }

    if (!elWsPort) {
      throw new DevNetError("❌ Execution node service [rpc] port not found");
    }

    const elServiceName = elService?.metadata?.name;

    if (!elServiceName) {
      throw new DevNetError("❌ Execution node service not found");
    }

    // consensus
    const clService = k8sServices.items.filter(
      (service) => (service.metadata?.name?.match(clRegex))
    ).pop();

    const clHttpPort = clService?.spec?.ports?.find((p) => p.name === 'http')?.port;

    if (!clHttpPort) {
      throw new DevNetError("❌ Consensus node service [http] port not found");
    }

    const clServiceName = clService?.metadata?.name;

    if (!clServiceName) {
      throw new DevNetError("❌ Consensus node service not found");
    }

    // validator client
    const vcService = k8sServices.items.filter(
      (service) => (service.metadata?.name?.match(vcRegex))
    ).pop();

    const vcHttpValidatorPort = vcService?.spec?.ports?.find((p) => p.name === 'http-validator')?.port;

    if (!vcHttpValidatorPort) {
      throw new DevNetError("❌ Validator client node service [http-validator] port not found");
    }

    const vlServiceName = vcService?.metadata?.name;

    if (!vlServiceName) {
      throw new DevNetError("❌ Validator client node service not found");
    }

    await dre.state.updateNodes({
      el: {
        client: 'geth',
        service: elServiceName,
        rpcPort: elRpcPort,
        wsPort: elWsPort,
      },
      cl: {
        client: 'teku',
        service: clServiceName,
        httpPort: clHttpPort,
      },
      vc: {
        client: 'teku',
        service: vlServiceName,
        httpValidatorPort: vcHttpValidatorPort,
      }
    })
  },
});
