import { Params, command } from "@devnet/command";
import { assert } from "@devnet/utils";

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
    depositCount: Params.integer({
      description: "Number of deposits to be made for the new operator.",
      default: 30,
    }),
    stakingModuleId: Params.integer({
      description: "Staking module ID to be used for the new operator.",
      default: 1,
    }),
    dsm: Params.boolean({
      description: "Use full DSM setup.",
      default: false,
    }),
  },
  async handler({ params, dre, dre: { logger, services } }) {
    const depositArgs = { dsm: params.dsm };
    const OPERATOR_ID = params.operatorId;
    const STAKING_MODULE_ID = params.stakingModuleId ?? 1;
    const NOR_DEVNET_OPERATOR = `devnet_nor_${OPERATOR_ID}`;
    const DEPOSIT_COUNT = params.depositCount ?? 30;

    assert(
      OPERATOR_ID > 0,
      `Operator ID must be greater than 0, got ${OPERATOR_ID}`,
    );
    assert(
      STAKING_MODULE_ID > 0,
      `Staking Module ID must be greater than 0, got ${STAKING_MODULE_ID}`,
    );

    const operatorExists = await services.lidoCLI.fileExists(
      `generated-keys/${NOR_DEVNET_OPERATOR}.json`,
    );

    const operatorId = OPERATOR_ID - 1;

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
      id: operatorId,
    });
    logger.log("✅ NOR keys added.");

    logger.log("🚀 Increasing staking limit for NOR...");
    await dre.runCommand(LidoSetStakingLimit, {
      operatorId,
      limit: DEPOSIT_COUNT,
    });
    logger.log("✅ Staking limit for NOR increased.");

    logger.log("🚀 Making deposit to NOR...");
    await dre.runCommand(LidoDeposit, {
      id: STAKING_MODULE_ID,
      deposits: DEPOSIT_COUNT,
      ...depositArgs,
    });
    logger.log("✅ Deposit to NOR completed.");

    logger.log("🚀 Adding keys to the validator...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys added.");
  },
});
