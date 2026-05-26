import { Params, command } from "@devnet/command";

import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";

export const LidoAddCMv2Keys = command.cli({
  description:
    "Generates fresh validator keys and adds them to an existing CMv2 node operator. Signer pays the bond in ETH; no role/voting required. Auto-batches when validators > batchSize to fit block gas limit.",
  params: {
    id: Params.integer({
      description: "Operator ID.",
      required: true,
    }),
    name: Params.string({
      description:
        "Name under which fresh keys are saved in lido-cli (generated-keys/<name>.json or <name>_batch_<i>.json when batched).",
      required: true,
    }),
    validators: Params.integer({
      description: "Total number of validator keys to generate and add.",
      default: 30,
    }),
    batchSize: Params.integer({
      description:
        "Max keys per single addValidatorKeysETH transaction. Block gas limit caps this around ~100-150 on a typical devnet.",
      default: 100,
    }),
    signer: Params.string({
      description:
        "Signer to use in lidoCLI (deployer or secondDeployer). The signer pays the bond in ETH.",
      default: "deployer",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { services, state } = dre;
    const { lidoCLI } = services;

    await dre.network.waitEL();

    const { deployer, secondDeployer } = await state.getNamedWallet();
    const signer =
      params.signer === "secondDeployer" ? secondDeployer : deployer;

    const total = params.validators;
    const batchSize = Math.max(1, params.batchSize);
    const batches: number[] = [];
    for (let remaining = total; remaining > 0; remaining -= batchSize) {
      batches.push(Math.min(batchSize, remaining));
    }
    const useBatching = batches.length > 1;

    logger.log(
      `🚀 Adding ${total} keys to CMv2 operator id=${params.id} in ${batches.length} batch(es) of up to ${batchSize}...`,
    );

    for (let i = 0; i < batches.length; i++) {
      const count = batches[i];
      const batchName = useBatching ? `${params.name}_batch_${i}` : params.name;

      logger.log(
        `🚀 [${i + 1}/${batches.length}] Generating ${count} fresh CMv2 keys (wcType=0x02)...`,
      );
      await dre.runCommand(GenerateLidoDevNetKeys, {
        validators: count,
        wcType: "0x02",
      });
      await dre.runCommand(UseLidoDevNetKeys, {
        name: batchName,
        wcType: "0x02",
      });
      logger.log(`✅ Allocated keys to generated-keys/${batchName}.json`);

      logger.log(
        `🚀 [${i + 1}/${batches.length}] Sending ${count} keys to CMv2 operator id=${params.id}...`,
      );
      await lidoCLI.sh({
        env: { PRIVATE_KEY: signer.privateKey },
      })`./run.sh cmv2 add-keys-from-file-eth ${params.id} generated-keys/${batchName}.json`;
      logger.log(
        `✅ [${i + 1}/${batches.length}] ${count} keys added to operator id=${params.id}.`,
      );
    }

    logger.log(
      `✅ Done. ${total} keys added to CMv2 operator id=${params.id}.`,
    );
  },
});
