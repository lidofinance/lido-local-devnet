import { Params, command } from "@devnet/command";
import { resolve } from "node:path";

import { ChainGetInfo } from "../chain/info.js";
import { ChainKurtosisUp } from "../chain/kurtosis-up.js";
import { ActivateCMv2 } from "../cmv2/activate.js";
import { LidoAddCMv2OperatorWithKeys } from "../cmv2/add-operator.js";
import { CMv2BuildAllowlist } from "../cmv2/build-allowlist.js";
import { DeployCMv2Contracts } from "../cmv2/deploy.js";
import { CMv2SetGateTree } from "../cmv2/set-gate-tree.js";
import { CouncilK8sUp } from "../council-k8s/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsK8sUp } from "../dsm-bots-k8s/up.js";
import { GitCheckout } from "../git/checkout.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";
import { LidoCLIInstall } from "../lido-cli/install.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { AddNewOperator } from "../lido-core/add-new-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { ReplaceDSM } from "../lido-core/replace-dsm.js";
import { ValidatorAdd } from "../validator/add.js";

export const GlamsterdamKurtosisUp = command.cli({
  description:
    "Glamsterdam local kurtosis devnet with delayed Gloas fork (~4.3h). Deploys full Lido (Core + CSM + CMv2) on pre-Gloas EVM, then waits for Gloas to test post-Gloas behavior.",
  params: {
    verify: Params.boolean({
      description: "Verify smart contracts during deployment.",
      default: false,
    }),
    dsm: Params.boolean({
      description: "Use full DSM setup (Council + DSM-bots). Otherwise replaces DSM with EOA.",
      default: false,
    }),
    preset: Params.string({
      description: "Kurtosis preset name.",
      default: "glamsterdam-delayed-gloas",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const deployArgs = { verify: params.verify };
    const depositArgs = { dsm: params.dsm };

    // ── 1. Git checkouts ────────────────────────────────────────────────
    await dre.runCommand(GitCheckout, { service: "lidoCore", ref: "develop" });
    await dre.runCommand(GitCheckout, { service: "csm",      ref: "develop" });
    await dre.runCommand(GitCheckout, { service: "cmv2",     ref: "develop" });

    // ── 2. Kurtosis chain ───────────────────────────────────────────────
    await dre.runCommand(ChainKurtosisUp, { preset: params.preset });
    logger.log("✅ Kurtosis chain initialized (pre-Gloas window starts now).");

    // ── 3. Deploy contracts ─────────────────────────────────────────────
    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, {
      ...deployArgs,
      voteDuration: 60,
      gasMaxFee: "60",
      gasPriorityFee: "1",
      gasLimit: "16000000",
      configFile: dre.services.lidoCore.config.constants.SCRATCH_DEPLOY_CONFIG,
      normalizedClRewardPerEpoch: 64,
      normalizedClRewardMistakeRateBp: 1000,
      rebaseCheckNearestEpochDistance: 1,
      rebaseCheckDistantEpochDistance: 2,
      validatorDelayedTimeoutInSlots: 7200,
      validatorDelinquentTimeoutInSlots: 28_800,
      nodeOperatorNetworkPenetrationThresholdBp: 100,
      predictionDurationInSlots: 50_400,
      finalizationMaxNegativeRebaseEpochShift: 1350,
      exitEventsLookbackWindowInSlots: 7200,
      consolidationMigratorTargetModuleId: undefined,
    });
    logger.log("✅ Lido Core contracts deployed.");

    logger.log("🚀 Deploying CSM contracts...");
    await dre.runCommand(DeployCSMContracts, { ...deployArgs, verifierUrl: undefined });
    logger.log("✅ CSM contracts deployed.");

    logger.log("🚀 Deploying CMv2 contracts...");
    await dre.runCommand(DeployCMv2Contracts, deployArgs);
    logger.log("✅ CMv2 contracts deployed.");

    // ── 4. lidoCLI install ─────────────────────────────────────────────
    await dre.runCommand(GitCheckout, {
      service: "lidoCLI",
      ref: "develop",
    });
    await dre.runCommand(LidoCLIInstall, {});

    // ── 5. Activate ─────────────────────────────────────────────────────
    logger.log("🚀 Activating Lido Core protocol...");
    await dre.runCommand(ActivateLidoProtocol, {});
    logger.log("✅ Lido Core protocol activated.");

    logger.log("🚀 Activating CSM module...");
    await dre.runCommand(ActivateCSM, {
      stakeShareLimitBP: 2000,
      priorityExitShareThresholdBP: 2500,
      maxDepositsPerBlock: 30,
    });
    logger.log("✅ CSM module activated.");

    logger.log("🚀 Activating CMv2 module...");
    await dre.runCommand(ActivateCMv2, {
      stakeShareLimitBP: 2000,
      priorityExitShareThresholdBP: 2500,
      maxDepositsPerBlock: 30,
      defaultKeysLimit: "max",
    });
    logger.log("✅ CMv2 module activated.");

    if (!params.dsm) {
      logger.log("🚀 Replacing DSM with EOA...");
      await dre.runCommand(ReplaceDSM, {});
      logger.log("✅ DSM replaced with EOA.");
    }

    // ── 6. NOR (curated) operator ──────────────────────────────────────
    const validators = 30;
    logger.log("🚀 Adding NOR operator with validators...");
    await dre.runCommand(AddNewOperator, {
      ...depositArgs,
      operatorId: 0,
      stakingModuleId: 1,
      depositCount: validators,
      skipDeposit: false,
    });
    logger.log("✅ NOR operator ready.");

    // ── 7. CSM operators ───────────────────────────────────────────────
    const CSM_OPERATOR_PREFIX = "devnet_csm_";
    const CSM_OPERATORS_COUNT = 2;
    const KEYS_PER_OPERATOR = 25;

    logger.log("🚀 Generating and allocating keys for CSM Module...");
    for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
      await dre.runCommand(GenerateLidoDevNetKeys, { validators: KEYS_PER_OPERATOR, wcType: "0x01" });
      await dre.runCommand(UseLidoDevNetKeys, {
        name: `${CSM_OPERATOR_PREFIX}${i}`,
        wcType: "0x01",
      });
    }
    logger.log("✅ CSM Module keys generated and allocated.");

    logger.log("🚀 Adding CSM operators with keys...");
    for (let i = 0; i < CSM_OPERATORS_COUNT; i++) {
      await dre.runCommand(LidoAddCSMOperatorWithKeys, {
        name: `${CSM_OPERATOR_PREFIX}${i}`,
      });
      logger.log(`✅ CSM operator ${CSM_OPERATOR_PREFIX}${i} added.`);
    }

    // ── 8. CMv2 operators ──────────────────────────────────────────────
    const CMV2_OPERATOR_PREFIX = "devnet_cmv2___";
    const CMV2_OPERATORS_COUNT = 2;

    logger.log("🚀 Generating and allocating keys for CMv2 Module...");
    for (let i = 0; i < CMV2_OPERATORS_COUNT; i++) {
      await dre.runCommand(GenerateLidoDevNetKeys, { validators: KEYS_PER_OPERATOR, wcType: "0x02" });
      await dre.runCommand(UseLidoDevNetKeys, {
        name: `${CMV2_OPERATOR_PREFIX}${i}`,
        wcType: "0x02",
      });
    }
    logger.log("✅ CMv2 Module keys generated and allocated.");

    logger.log("🚀 Building CMv2 allowlist and updating gate tree...");
    const cmv2MerkleDir = resolve("artifacts", dre.network.name, "merkle");
    const allowlistPath = resolve(cmv2MerkleDir, "allowlist.json");
    await dre.runCommand(CMv2BuildAllowlist, {
      addresses: undefined,
      includeDeployer: true,
      includeSecondDeployer: true,
      output: allowlistPath,
    });
    await dre.services.lidoCLI.sh`./run.sh cmv2 grant-set-tree-role-vote`;
    await dre.runCommand(CMv2SetGateTree, {
      input: allowlistPath,
      outputDir: cmv2MerkleDir,
      setRoot: true,
      vote: true,
      treeCid: "devnet-allowlist",
      gate: undefined,
    });
    logger.log("✅ CMv2 gate tree updated.");

    logger.log("🚀 Adding CMv2 operators with keys...");
    for (let i = 0; i < CMV2_OPERATORS_COUNT; i++) {
      await dre.runCommand(LidoAddCMv2OperatorWithKeys, {
        name: `${CMV2_OPERATOR_PREFIX}${i}`,
        signer: i === 0 ? "deployer" : "secondDeployer",
      });
      logger.log(`✅ CMv2 operator ${CMV2_OPERATOR_PREFIX}${i} added.`);
    }

    // ── 9. Import all module keys into validator client ───────────────
    logger.log("🚀 Loading CSM/CMv2 keys into validator client...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys loaded.");

    // ── 10. KAPI ───────────────────────────────────────────────────────
    // Council reads from KAPI at startup, so KAPI must be up before the
    // DSM stack block below.
    await dre.runCommand(GitCheckout, { service: "kapi", ref: "develop" });
    logger.log("🚀 Starting KAPI in K8s...");
    await dre.runCommand(KapiK8sUp, {});
    logger.log("✅ KAPI started.");

    // ── 11. DSM stack (only when --dsm) ───────────────────────────────
    if (params.dsm) {
      logger.log("🚀 Deploying Data-bus...");
      await dre.runCommand(DataBusDeploy, {});
      logger.log("✅ Data-bus deployed.");

      await dre.runCommand(GitCheckout, {
        service: "council",
        ref: "feat/sr-67-wc-two-types-devnet",
      });
      logger.log("🚀 Starting Council...");
      await dre.runCommand(CouncilK8sUp, {});
      logger.log("✅ Council started.");

      await dre.runCommand(GitCheckout, {
        service: "dsmBots",
        ref: "fix/0x02-modules-support",
      });
      logger.log("🚀 Starting DSM-bots...");
      await dre.runCommand(DSMBotsK8sUp, {});
      logger.log("✅ DSM-bots started.");
    }

    await dre.runCommand(ChainGetInfo, {});
    logger.log("🎉 Glamsterdam kurtosis stand ready (pre-Gloas). Gloas activates at epoch 40 (~4.3h after chain start).");
  },
});
