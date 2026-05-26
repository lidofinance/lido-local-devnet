import { Params, command } from "@devnet/command";

import { ChainFetchNetworkConfig } from "../chain/fetch-network-config.js";
import { ChainGetInfo } from "../chain/info.js";
import { ChainSelfHostedUp } from "../chain/self-hosted-up.js";
import { CouncilK8sUp } from "../council-k8s/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { CSMProverToolK8sUp } from "../csm-prover-tool-k8s/up.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsK8sUp } from "../dsm-bots-k8s/up.js";
import { EhwUp } from "../ehw/up.js";
import { EvmUp } from "../evm/up.js";
import { GitCheckout } from "../git/checkout.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";
import { LateProverBotK8sUp } from "../late-prover-bot-k8s/up.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { LidoAddKeys } from "../lido-core/add-keys.js";
import { LidoAddOperator } from "../lido-core/add-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { LidoDeposit } from "../lido-core/deposit.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { LidoSetStakingLimit } from "../lido-core/set-staking-limit.js";
import { NoWidgetUp } from "../no-widget/up.js";
import { NoWidgetBackendUp } from "../no-widget-backend/up.js";
import { OracleK8sUp } from "../oracles-k8s/up.js";
import { ValidatorAdd } from "../validator/add.js";

export const EPBSDevNetUp = command.cli({
  description: "ePBS (Glamsterdam) test stand — full Lido deployment on self-hosted ePBS devnet.",
  params: {
    verify: Params.boolean({
      description: "Enables verification of smart contracts during deployment.",
      default: false,
    }),
    skipChain: Params.boolean({
      description: "Skip chain deployment (nodes already running).",
      default: false,
    }),
    evm: Params.boolean({
      description: "Deploy Ethereum Validators Monitoring.",
      default: true,
    }),
    ehw: Params.boolean({
      description: "Deploy Ethereum Head Watcher.",
      default: true,
    }),
    elImage: Params.string({
      description: "Custom EL Docker image (e.g. ethpandaops/geth:epbs-devnet-0).",
    }),
    clImage: Params.string({
      description: "Custom CL Docker image (e.g. ethpandaops/prysm-beacon-chain:epbs-devnet-0).",
    }),
    clClient: Params.string({
      description: "CL client type.",
      default: "prysm",
    }),
    epbsDevnet: Params.string({
      description: "ethpandaops ePBS devnet name (for fetching network config).",
      default: "devnet-0",
    }),
    verifierUrl: Params.string({
      description:
        "External block explorer API URL for contract verification (e.g. https://explorer.epbs-devnet-0.ethpandaops.io/api).",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    // ── 1. Git checkouts ────────────────────────────────────────────────
    await dre.runCommand(GitCheckout, { service: "lidoCore", ref: "develop" });
    await dre.runCommand(GitCheckout, { service: "csm", ref: "main" });

    // ── 2. Chain (self-hosted) ──────────────────────────────────────────
    if (params.skipChain) {
      logger.log("⏭️  Skipping chain deployment (--skipChain).");
    } else {
      logger.log("📡 Fetching ePBS network config from ethpandaops...");
      await dre.runCommand(ChainFetchNetworkConfig, {
        repo: "epbs-devnets",
        devnet: params.epbsDevnet,
        outputDir: undefined,
      });

      logger.log("🔗 Deploying self-hosted EL/CL nodes...");
      await dre.runCommand(ChainSelfHostedUp, {
        elClient: "geth",
        clClient: params.clClient,
        network: dre.network.name,
        elImage: params.elImage,
        clImage: params.clImage,
        checkpointSyncUrl: undefined,
        genesisSSZUrl: undefined,
        ingress: true,
      });
      logger.log("✅ Chain nodes deployed.");
    }

    // ── 3. Wait for EL sync (only EL needed for contract deployment) ───
    await dre.network.waitELSync();

    // ── 4. Deploy contracts ─────────────────────────────────────────────
    const deployArgs = { verify: params.verify };

    logger.log("🚀 Deploying Lido Core contracts...");
    await dre.runCommand(DeployLidoContracts, {
      ...deployArgs,
      voteDuration: 60,
      gasMaxFee: dre.services.lidoCore.config.constants.GAS_MAX_FEE,
      gasPriorityFee: dre.services.lidoCore.config.constants.GAS_PRIORITY_FEE,
      gasLimit: "16000000",
      configFile: dre.services.lidoCore.config.constants.NETWORK_STATE_DEFAULTS_FILE,
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
    logger.log("✅ Lido contracts deployed.");

    logger.log("🚀 Deploying CSM contracts...");
    await dre.runCommand(DeployCSMContracts, {
      ...deployArgs,
      verifierUrl: params.verifierUrl,
    });
    logger.log("✅ CSM contracts deployed.");

    // ── 5. Wait for CL sync (needed for activation and services) ──────
    await dre.network.waitCLSync();

    // ── 6. Activate protocols ───────────────────────────────────────────
    logger.log("🚀 Activating Lido Core protocol...");
    await dre.runCommand(ActivateLidoProtocol, {});
    logger.log("✅ Lido Core protocol activated.");

    logger.log("🚀 Activating CSM protocol...");
    await dre.runCommand(ActivateCSM, {
      stakeShareLimitBP: 2000,
      priorityExitShareThresholdBP: 2500,
      maxDepositsPerBlock: 30,
    });
    logger.log("✅ CSM protocol activated.");

    // ── 7. Keys and operators ───────────────────────────────────────────
    const NOR_DEVNET_OPERATOR = "devnet_nor_1";
    const CSM_DEVNET_OPERATOR = "devnet_csm_1";

    logger.log("🚀 Generating and allocating keys for NOR Module...");
    await dre.runCommand(GenerateLidoDevNetKeys, { validators: 30, wcType: "0x01" });
    await dre.runCommand(UseLidoDevNetKeys, { name: NOR_DEVNET_OPERATOR, wcType: "0x01" });

    logger.log("🚀 Generating and allocating keys for CSM Module...");
    await dre.runCommand(GenerateLidoDevNetKeys, { validators: 30, wcType: "0x01" });
    await dre.runCommand(UseLidoDevNetKeys, { name: CSM_DEVNET_OPERATOR, wcType: "0x01" });

    logger.log("🚀 Adding NOR operator...");
    await dre.runCommand(LidoAddOperator, { name: NOR_DEVNET_OPERATOR });
    await dre.runCommand(LidoAddKeys, { name: NOR_DEVNET_OPERATOR, id: 0 });
    await dre.runCommand(LidoSetStakingLimit, { operatorId: 0, limit: 30 });
    logger.log("✅ NOR operator ready.");

    logger.log("🚀 Adding CSM operator with keys...");
    await dre.runCommand(LidoAddCSMOperatorWithKeys, { name: CSM_DEVNET_OPERATOR });
    logger.log("✅ CSM operator ready.");

    // ── 8. Core services ────────────────────────────────────────────────
    logger.log("🚀 Starting KAPI...");
    await dre.runCommand(KapiK8sUp, {});

    logger.log("🚀 Starting Oracle...");
    await dre.runCommand(OracleK8sUp, {
      image: "lidofinance/oracle",
      registryHostname: undefined,
      tag: "7.1.0",
      accountingImage: undefined,
      accountingTag: undefined,
      csmImage: undefined,
      csmTag: undefined,
      consensusClientUris: undefined,
      performanceConsensusClientUri: undefined,
      ejectorImage: undefined,
      ejectorTag: undefined,
      build: false,
      releaseSuffix: undefined,
    });

    // ── 9. DSM (always on) ──────────────────────────────────────────────
    logger.log("🚀 Deploying Data-bus...");
    await dre.runCommand(DataBusDeploy, {});
    logger.log("✅ Data-bus deployed.");

    logger.log("🚀 Starting Council...");
    await dre.runCommand(CouncilK8sUp, {});
    logger.log("✅ Council started.");

    logger.log("🚀 Starting DSM-bots...");
    await dre.runCommand(DSMBotsK8sUp, {});
    logger.log("✅ DSM-bots started.");

    // ── 10. Deposits ────────────────────────────────────────────────────
    logger.log("🚀 Making deposit to NOR...");
    await dre.runCommand(LidoDeposit, { id: 1, deposits: 3, dsm: true, amount: 500 });
    logger.log("✅ Deposit to NOR completed.");

    logger.log("🚀 Making deposit to CSM...");
    await dre.runCommand(LidoDeposit, { id: 3, deposits: 3, dsm: true, amount: 500 });
    logger.log("✅ Deposit to CSM completed.");

    logger.log("🚀 Adding keys to the validator...");
    await dre.runCommand(ValidatorAdd, {});
    logger.log("✅ Validator keys added.");

    // ── 11. Monitoring services ────────────────────────────────────────
    if (params.evm) {
      logger.log("🚀 Starting Ethereum Validators Monitoring...");
      await dre.runCommand(EvmUp, {});
      logger.log("✅ EVM started.");
    }

    if (params.ehw) {
      logger.log("🚀 Starting Ethereum Head Watcher...");
      await dre.runCommand(EhwUp, {});
      logger.log("✅ EHW started.");
    }

    // ── 12. Prover services ────────────────────────────────────────────
    logger.log("🚀 Starting CSM Prover Tool...");
    await dre.runCommand(CSMProverToolK8sUp, { clApiUrls: undefined });

    logger.log("🚀 Starting Late Prover Bot...");
    await dre.runCommand(LateProverBotK8sUp, {});

    // ── 13. Widget ─────────────────────────────────────────────────────
    logger.log("🚀 Starting No Widget Backend...");
    await dre.runCommand(NoWidgetBackendUp, {});

    logger.log("🚀 Starting No Widget...");
    await dre.runCommand(NoWidgetUp, {});

    // ── 14. Info ──────────────────────────────────────────────────────
    await dre.runCommand(ChainGetInfo, {});

    logger.log("🎉 ePBS stand is ready!");
  },
});
