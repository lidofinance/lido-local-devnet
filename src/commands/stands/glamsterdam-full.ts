import { Params, command } from "@devnet/command";
import { resolve } from "node:path";

import { ChainGenerateValidatorKeys } from "../chain/generate-validator-keys.js";
import { ChainGetInfo } from "../chain/info.js";
import { ChainValidatorUp } from "../chain/validator-up.js";
import { ActivateCMv2 } from "../cmv2/activate.js";
import { LidoAddCMv2OperatorWithKeys } from "../cmv2/add-operator.js";
import { CMv2BuildAllowlist } from "../cmv2/build-allowlist.js";
import { DeployCMv2Contracts } from "../cmv2/deploy.js";
import { CMv2SetGateTree } from "../cmv2/set-gate-tree.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DGDeploy } from "../dg/deploy.js";
import { DGHandover } from "../dg/handover.js";
import { GitCheckout } from "../git/checkout.js";
import { LidoCLIInstall } from "../lido-cli/install.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { AddNewOperator } from "../lido-core/add-new-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { ReplaceDSM } from "../lido-core/replace-dsm.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";
import { ValidatorAdd } from "../validator/add.js";

export const GlamsterdamFullDevNetUp = command.cli({
  description:
    "Glamsterdam — full Lido protocol on top of self-hosted CL/EL nodes (run after `stands glamsterdam` and `wallet fund`).",
  params: {
    verify: Params.boolean({
      description: "Enables verification of smart contracts during deployment.",
      default: false,
    }),
    dsm: Params.boolean({
      description: "Use full DSM setup (Council + DSM-bots). Otherwise replaces DSM with EOA.",
      default: false,
    }),
    norKeys: Params.integer({
      description: "Number of NOR (curated) operator validators.",
      default: 30,
    }),
    csmOperatorsCount: Params.integer({
      description: "Number of CSM operators to add.",
      default: 2,
    }),
    cmv2OperatorsCount: Params.integer({
      description: "Number of CMv2 operators to add.",
      default: 2,
    }),
    keysPerOperator: Params.integer({
      description: "Validator keys per CSM/CMv2 operator.",
      default: 25,
    }),
    vcClient: Params.string({
      description: "Validator client: lighthouse | teku | prysm.",
      default: "lighthouse",
    }),
    vcImage: Params.string({
      description: "Custom validator-client Docker image (e.g. ethpandaops/prysm-validator:glamsterdam-devnet-4).",
    }),
    withDg: Params.boolean({
      description: "Deploy Dual Governance contracts and grant AdminExecutor RUN_SCRIPT_ROLE on Agent after Lido activation. Set USE_DG=1 in shell to route subsequent omnibus scripts through DG.",
      default: false,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const deployArgs = { verify: params.verify };
    const depositArgs = { dsm: params.dsm };
    const norKeys = params.norKeys ?? 30;
    const csmOpCount = params.csmOperatorsCount ?? 2;
    const cmv2OpCount = params.cmv2OperatorsCount ?? 2;
    const keysPerOp = params.keysPerOperator ?? 25;
    const vcClient = params.vcClient ?? "lighthouse";

    // ── 1. Git checkouts ───────────────────────────────────────────────
    await dre.runCommand(GitCheckout, { service: "lidoCore", ref: "develop" });
    await dre.runCommand(GitCheckout, { service: "csm",      ref: "develop" });
    await dre.runCommand(GitCheckout, { service: "cmv2",     ref: "develop" });

    // ── 2. Bring up Validator Client ───────────────────────────────────
    // VC must exist before NOR `AddNewOperator` (which internally calls
    // `ValidatorAdd` against the VC Key Manager API). We seed the VC with
    // a placeholder keystore; real per-module keys are imported afterwards.
    logger.log("🚀 Generating placeholder validator key for VC startup...");
    await dre.runCommand(ChainGenerateValidatorKeys, {
      count: 1,
      wcType: "0x01",
      password: "12345678",
      startIndex: 0,
    } as never);
    logger.log("🚀 Deploying validator client...");
    await dre.runCommand(ChainValidatorUp, {
      vcClient,
      vcImage: params.vcImage,
      ingress: false,
    } as never);
    logger.log("✅ Validator client deployed.");

    // ── 3. Deploy contracts ────────────────────────────────────────────
    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, {
      ...deployArgs,
      voteDuration: 60,
      gasMaxFee: "30",
      gasPriorityFee: "1",
      gasLimit: "50000000",
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

    if (params.withDg) {
      logger.log("🚀 Deploying Dual Governance contracts...");
      await dre.runCommand(DGDeploy, {
        afterSubmitDelay: undefined,
        afterScheduleDelay: undefined,
        minExecutionDelay: undefined,
      });
      logger.log("✅ Dual Governance contracts deployed.");

      logger.log("🚀 Performing DG handover (grant RUN_SCRIPT_ROLE on Agent to AdminExecutor)...");
      await dre.runCommand(DGHandover, {});
      logger.log("✅ DG handover complete. To route omnibus through DG, set USE_DG=1 in shell.");
    }

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
    logger.log("🚀 Adding NOR operator with validators...");
    await dre.runCommand(AddNewOperator, {
      ...depositArgs,
      operatorId: 0,
      stakingModuleId: 1,
      depositCount: norKeys,
      skipDeposit: false,
    });
    logger.log("✅ NOR operator ready.");

    // ── 7. CSM operators ───────────────────────────────────────────────
    const CSM_OPERATOR_PREFIX = "devnet_csm_";
    logger.log("🚀 Generating and allocating keys for CSM Module...");
    for (let i = 0; i < csmOpCount; i++) {
      await dre.runCommand(GenerateLidoDevNetKeys, { validators: keysPerOp, wcType: "0x01" });
      await dre.runCommand(UseLidoDevNetKeys, {
        name: `${CSM_OPERATOR_PREFIX}${i}`,
        wcType: "0x01",
      });
    }
    logger.log("✅ CSM Module keys generated and allocated.");

    logger.log("🚀 Adding CSM operators with keys...");
    for (let i = 0; i < csmOpCount; i++) {
      await dre.runCommand(LidoAddCSMOperatorWithKeys, {
        name: `${CSM_OPERATOR_PREFIX}${i}`,
      });
      logger.log(`✅ CSM operator ${CSM_OPERATOR_PREFIX}${i} added.`);
    }

    // ── 8. CMv2 operators ──────────────────────────────────────────────
    const CMV2_OPERATOR_PREFIX = "devnet_cmv2___";
    logger.log("🚀 Generating and allocating keys for CMv2 Module...");
    for (let i = 0; i < cmv2OpCount; i++) {
      await dre.runCommand(GenerateLidoDevNetKeys, { validators: keysPerOp, wcType: "0x02" });
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
    for (let i = 0; i < cmv2OpCount; i++) {
      await dre.runCommand(LidoAddCMv2OperatorWithKeys, {
        name: `${CMV2_OPERATOR_PREFIX}${i}`,
        signer: i === 0 ? "deployer" : "secondDeployer",
      });
      logger.log(`✅ CMv2 operator ${CMV2_OPERATOR_PREFIX}${i} added.`);
    }

    // ── 9. Import all module keys into the validator client ───────────
    logger.log("🚀 Loading CSM/CMv2 keys into validator client...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys loaded.");

    // ── 10. KAPI ───────────────────────────────────────────────────────
    await dre.runCommand(GitCheckout, { service: "kapi", ref: "feat/withdrawal-creds-type" });
    logger.log("🚀 Starting KAPI in K8s...");
    await dre.runCommand(KapiK8sUp, {});
    logger.log("✅ KAPI started.");

    await dre.runCommand(ChainGetInfo, {});
    logger.log("🎉 Glamsterdam full Lido stand is ready.");
  },
});
