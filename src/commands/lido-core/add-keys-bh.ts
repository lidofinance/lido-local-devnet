import { Params, command } from "@devnet/command";
import { DevNetError, assert } from "@devnet/utils";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { LidoSetStakingLimit } from "../lido-core/set-staking-limit.js";

const norAbi = [
  "function addSigningKeysOperatorBH(uint256 _nodeOperatorId, uint256 _quantity, bytes _publicKeys, bytes _signatures)",
  "function getNodeOperator(uint256 _nodeOperatorId, bool _fullInfo) view returns (bool active, string name, address rewardAddress, uint64 stakingLimit, uint64 stoppedValidators, uint64 totalSigningKeys, uint64 usedSigningKeys)",
  "function getTotalSigningKeyCount(uint256 _nodeOperatorId) view returns (uint256)",
];

type DepositDataEntry = { pubkey: string; signature: string };

const concatHex = (entries: DepositDataEntry[], field: "pubkey" | "signature") =>
  "0x" + entries.map((e) => e[field].replace(/^0x/, "")).join("");

export const LidoAddKeysBH = command.cli({
  description:
    "Adds validator keys to an existing NOR operator via addSigningKeysOperatorBH (signed by the operator's reward address). Use this on mature devnets where lido-core add-keys silently reverts. See docs/troubleshooting/nor-add-keys-mature-devnet.md.",
  params: {
    operatorId: Params.integer({
      description: "Operator ID.",
      required: true,
    }),
    validators: Params.integer({
      description: "Total number of validator keys to generate and add.",
      default: 30,
    }),
    name: Params.string({
      description:
        "Name under which fresh keys are saved in lido-cli (generated-keys/<name>.json or <name>_batch_<i>.json when batched). Refuses to overwrite an existing file.",
      required: true,
    }),
    batchSize: Params.integer({
      description:
        "Max keys per single addSigningKeysOperatorBH transaction. ~100 keys fit in a 16M block gas limit.",
      default: 100,
    }),
    wcType: Params.string({
      description: "Withdrawal credentials type (0x01 or 0x02).",
      default: "0x01",
    }),
    signer: Params.string({
      description:
        "Signer to use (deployer or secondDeployer). Must equal the operator's rewardAddress.",
      default: "deployer",
    }),
    increaseLimit: Params.boolean({
      description:
        "After adding keys, raise stakingLimit to the new totalSigningKeys via setNodeOperatorStakingLimit.",
      default: true,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { services, state, network } = dre;
    const { lidoCLI } = services;

    assert(params.validators > 0, "validators must be > 0");
    assert(params.batchSize > 0, "batchSize must be > 0");

    await network.waitEL();

    const lido = await state.getLido();
    const norAddress = lido.curatedModule;
    const { elPublic } = await state.getChain();
    const { deployer, secondDeployer } = await state.getNamedWallet();
    const signer =
      params.signer === "secondDeployer" ? secondDeployer : deployer;

    const provider = new JsonRpcProvider(elPublic);
    const wallet = new Wallet(signer.privateKey, provider);
    const nor = new Contract(norAddress, norAbi, wallet);

    const [, , rewardAddress, , , totalSigningKeysBefore] =
      await nor.getNodeOperator(params.operatorId, false);

    if (rewardAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new DevNetError(
        `Signer ${wallet.address} is not the reward address of operator ${params.operatorId} (${rewardAddress}). addSigningKeysOperatorBH would revert. Pass --signer matching the reward wallet.`,
      );
    }

    logger.log(`▶ NOR:           ${norAddress}`);
    logger.log(`▶ Operator:      ${params.operatorId} (reward ${rewardAddress})`);
    logger.log(`▶ Keys before:   ${totalSigningKeysBefore}`);
    logger.log(`▶ Adding:        ${params.validators}`);

    const total = params.validators;
    const batchSize = Math.max(1, params.batchSize);
    const batches: number[] = [];
    for (let remaining = total; remaining > 0; remaining -= batchSize) {
      batches.push(Math.min(batchSize, remaining));
    }
    const useBatching = batches.length > 1;

    for (let i = 0; i < batches.length; i++) {
      const count = batches[i];
      const batchName = useBatching ? `${params.name}_batch_${i}` : params.name;
      const keysPath = `generated-keys/${batchName}.json`;

      if (await lidoCLI.fileExists(keysPath)) {
        throw new DevNetError(
          `${keysPath} already exists in lidoCLI service. Pick a different --name or remove the file.`,
        );
      }

      logger.log(
        `🚀 [${i + 1}/${batches.length}] Generating ${count} fresh keys (wcType=${params.wcType})...`,
      );
      await dre.runCommand(GenerateLidoDevNetKeys, {
        validators: count,
        wcType: params.wcType,
      });
      await dre.runCommand(UseLidoDevNetKeys, {
        name: batchName,
        wcType: params.wcType,
      });

      const entries = (await lidoCLI.readJson(keysPath)) as DepositDataEntry[];
      assert(
        entries.length === count,
        `Expected ${count} keys in ${keysPath}, found ${entries.length}`,
      );

      const pubkeys = concatHex(entries, "pubkey");
      const signatures = concatHex(entries, "signature");

      logger.log(
        `🚀 [${i + 1}/${batches.length}] addSigningKeysOperatorBH(${params.operatorId}, ${count}, ...)`,
      );
      const tx = await nor.addSigningKeysOperatorBH(
        params.operatorId,
        count,
        pubkeys,
        signatures,
      );
      const receipt = await tx.wait();
      logger.log(
        `✅ [${i + 1}/${batches.length}] tx ${receipt.hash} (gas ${receipt.gasUsed})`,
      );
    }

    const totalAfter: bigint = await nor.getTotalSigningKeyCount(params.operatorId);
    const expectedTotal = BigInt(totalSigningKeysBefore) + BigInt(total);
    assert(
      totalAfter === expectedTotal,
      `Post-tx totalSigningKeys mismatch: expected ${expectedTotal}, got ${totalAfter}`,
    );
    logger.log(`✅ Keys on-chain: total ${totalAfter}`);

    if (params.increaseLimit) {
      const newLimit = Number(totalAfter);
      logger.log(`🚀 Raising stakingLimit → ${newLimit}`);
      await dre.runCommand(LidoSetStakingLimit, {
        operatorId: params.operatorId,
        limit: newLimit,
      });
    }
  },
});
