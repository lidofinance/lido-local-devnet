import { Params, assert, command } from "@devnet/command";

import { LidoAddKeys } from "../lido-core/add-keys.js";
import { LidoAddOperator } from "../lido-core/add-operator.js";
import { LidoDeposit } from "../lido-core/deposit.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { LidoSetStakingLimit } from "../lido-core/set-staking-limit.js";
import { ValidatorAdd } from "../validator/add.js";

export const AddNewOperator = command.cli({
  description:
    "Generate keys, add operator, add keys to operator and reload validator client.",
  params: {
    operatorId: Params.integer({
      description: "Operator ID to be used for the new operator.",
      default: 1,
    }),
  },
  async handler({ params, dre, dre: { logger, services } }) {
    const depositArgs = { dsm: false };
    const OPERATOR_ID = params.operatorId;

    assert(
      OPERATOR_ID > 0,
      `Operator ID must be greater than 0, got ${OPERATOR_ID}`,
    );

    const NOR_DEVNET_OPERATOR = `devnet_nor_${OPERATOR_ID}`;

    const DEPOSIT_COUNT = 100;

    const operatorExists = await services.lidoCLI.fileExists(
      `generated-keys/${NOR_DEVNET_OPERATOR}.json`,
    );

    assert(!operatorExists, `Operator ${NOR_DEVNET_OPERATOR} already exists.`);

    logger.log("🚀 Generating and allocating keys for NOR Module...");
    await dre.runCommand(GenerateLidoDevNetKeys, { validators: DEPOSIT_COUNT });
    await dre.runCommand(UseLidoDevNetKeys, { name: NOR_DEVNET_OPERATOR });
    logger.log("✅ NOR Module keys generated and allocated.");

    logger.log("🚀 Adding NOR operator...");
    await dre.runCommand(LidoAddOperator, { name: NOR_DEVNET_OPERATOR });
    logger.log(`✅ Operator ${NOR_DEVNET_OPERATOR} added.`);

    logger.log("🚀 Adding NOR keys...");
    await dre.runCommand(LidoAddKeys, {
      name: NOR_DEVNET_OPERATOR,
      id: OPERATOR_ID,
    });
    logger.log("✅ NOR keys added.");

    logger.log("🚀 Increasing staking limit for NOR...");
    await dre.runCommand(LidoSetStakingLimit, {
      operatorId: OPERATOR_ID,
      limit: DEPOSIT_COUNT,
    });
    logger.log("✅ Staking limit for NOR increased.");

    logger.log("🚀 Making deposit to NOR...");
    await dre.runCommand(LidoDeposit, {
      id: 1,
      deposits: DEPOSIT_COUNT,
      ...depositArgs,
    });
    logger.log("✅ Deposit to NOR completed.");

    logger.log("🚀 Adding keys to the validator...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys added.");
  },
});
