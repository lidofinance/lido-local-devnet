import { Params, command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";
import { assert } from "@devnet/utils";
import { Contract, JsonRpcProvider } from "ethers";

import { nodesExtension } from "../chain/extensions/nodes.extension.js";
import { nodesIngressExtension } from "../chain/extensions/nodes-ingress.extension.js";
import { cmv2Extension } from "../cmv2/extensions/cmv2.extension.js";
import { csmExtension } from "../csm/extensions/csm.extension.js";

const MODULES = new Set(["csm", "cmv2"]);

const moduleAbi = [
  "function getSigningKeysWithSignatures(uint256,uint256,uint256) view returns (bytes pubkeys, bytes signatures)",
];

const splitPubkeys = (hexValue: string): string[] => {
  const raw = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
  const pubkeyHexLength = 48 * 2;

  if (raw.length === 0) return [];
  assert(raw.length % pubkeyHexLength === 0, "Invalid pubkeys payload length");

  const result: string[] = [];
  for (let i = 0; i < raw.length; i += pubkeyHexLength) {
    result.push(`0x${raw.slice(i, i + pubkeyHexLength)}`);
  }

  return result;
};

const parseApiList = (raw: string) =>
  raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

export const ValidatorRemoveBatch = command.cli({
  description:
    "Removes a batch of validator keys from validator client(s) using CSM/CMv2 operator keys as source.",
  params: {
    module: Params.string({
      description: "Module name: csm | cmv2",
      required: true,
    }),
    operatorId: Params.integer({
      description: "Node operator id.",
      required: true,
    }),
    fromIndex: Params.integer({
      description: "Start index in module keys list.",
      default: 0,
    }),
    count: Params.integer({
      description: "How many keys to remove.",
      default: 1,
    }),
    validatorApis: Params.string({
      description:
        "Comma-separated validator keymanager URLs. Overrides --allVc/default.",
    }),
    allVc: Params.boolean({
      description: "Apply deletion on all validator clients from state.",
      default: false,
    }),
    dryRun: Params.boolean({
      description: "Show keys and targets without deleting.",
      default: false,
    }),
  },
  extensions: [csmExtension, cmv2Extension, nodesExtension, nodesIngressExtension],
  async handler({ params, dre: { logger, state, network } }) {
    const moduleName = params.module.toLowerCase();
    assert(MODULES.has(moduleName), "module must be one of: csm, cmv2");
    assert(params.count > 0, "count must be > 0");
    assert(params.fromIndex >= 0, "fromIndex must be >= 0");

    const { elPublic, validatorsApiPublic } = await state.getChain();
    const provider = new JsonRpcProvider(elPublic);
    const moduleAddress =
      moduleName === "csm" ? (await state.getCSM()).module : (await state.getCMv2()).module;
    const moduleContract = new Contract(moduleAddress, moduleAbi, provider);

    const [pubkeysHex] = await moduleContract.getSigningKeysWithSignatures(
      params.operatorId,
      params.fromIndex,
      params.count,
    );
    const modulePubkeys = splitPubkeys(pubkeysHex).map((key) => key.toLowerCase());
    assert(modulePubkeys.length > 0, "No keys returned from module for provided range");

    let targetApis: string[] = [];
    if (params.validatorApis) {
      targetApis = parseApiList(params.validatorApis);
    } else if (params.allVc) {
      const nodesIngress = await state.getNodesIngress(false);
      if (nodesIngress.vc && nodesIngress.vc.length > 0) {
        targetApis = nodesIngress.vc.map((vc) => vc.publicIngressUrl);
      } else {
        const nodes = await state.getNodes();
        targetApis = nodes.vc.map(
          (vc) =>
            `http://${vc.k8sService}.kt-${network.name}.svc.cluster.local:${vc.httpValidatorPort}`,
        );
      }
    } else {
      targetApis = [validatorsApiPublic];
    }

    const uniqueTargetApis = [...new Set(targetApis)];
    const token =
      process.env.VALIDATOR_KEYMANAGER_TOKEN ?? keyManager.KEY_MANAGER_DEFAULT_API_TOKEN;

    logger.log(`Module: ${moduleName}`);
    logger.log(`Operator ID: ${params.operatorId}`);
    logger.log(`Key range: [${params.fromIndex}, ${params.fromIndex + params.count})`);
    logger.log(`Fetched module keys: ${modulePubkeys.length}`);
    logger.log(`Target validator APIs: ${JSON.stringify(uniqueTargetApis)}`);

    let totalMatched = 0;
    for (const api of uniqueTargetApis) {
      const keystores = await keyManager.fetchKeystores(api, token);
      const existing = new Set(
        (keystores.data ?? []).map((item) => item.validating_pubkey.toLowerCase()),
      );
      const toDelete = modulePubkeys.filter((pubkey) => existing.has(pubkey));
      totalMatched += toDelete.length;

      if (toDelete.length === 0) {
        logger.log(`No matching keys on ${api}`);
        continue;
      }

      logger.log(`Matching keys on ${api}: ${toDelete.length}`);
      logger.log(`Matching pubkeys on ${api}: ${JSON.stringify(toDelete)}`);
      if (params.dryRun) {
        logger.log(`Dry run, skip deletion on ${api}`);
        continue;
      }

      const result = await keyManager.deleteKeystores(api, toDelete, token);
      const report = toDelete.map((pubkey, index) => ({
        pubkey,
        status: result.data?.[index]?.status ?? "unknown",
        message: result.data?.[index]?.message ?? "",
      }));
      logger.log(`Deletion report on ${api}: ${JSON.stringify(report)}`);
    }

    logger.log(`Total matching keys across targets: ${totalMatched}`);
    if (!params.dryRun) {
      logger.log("If needed, restart VC services to apply changes immediately.");
    }
  },
});
