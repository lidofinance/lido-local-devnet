import { Params, command } from "@devnet/command";

import { CSMInstall } from "./install.js";

export const DeployCSVerifier = command.cli({
  description:
    "Deploys the CSVerifier smart contract using configured deployment scripts.",
  params: {
    verify: Params.boolean({
      description: "Verify the smart contract after deployment",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { state, services, network } = dre;
    const { csm } = services;
    const {
      config: { constants },
    } = csm;

    await dre.network.waitEL();

    const { withdrawalVault } = await state.getLido();
    const { module: CSMModule } = await state.getCSM();
    const { elPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();

    const clClient = await network.getCLClient();

    const {
      data: { ELECTRA_FORK_EPOCH, SLOTS_PER_EPOCH },
    } = await clClient.getConfig();

    const blockscoutConfig = await state.getBlockscout();

    const env = {
      ARTIFACTS_DIR: constants.ARTIFACTS_DIR,
      CSM_MODULE: CSMModule,
      CSM_WITHDRAWAL_VAULT: withdrawalVault,
      DEPLOY_CONFIG: constants.DEPLOY_CONFIG,
      DEPLOYER_PRIVATE_KEY: deployer.privateKey,
      DEVNET_CHAIN_ID: "32382",
      DEVNET_ELECTRA_EPOCH: ELECTRA_FORK_EPOCH,
      DEVNET_SLOTS_PER_EPOCH: SLOTS_PER_EPOCH,

      // Infrastructure
      RPC_URL: elPublic,
      UPGRADE_CONFIG: constants.UPGRADE_CONFIG,
      VERIFIER_API_KEY: constants.VERIFIER_API_KEY,
      VERIFIER_URL: blockscoutConfig.api,
    };

    logger.logJson(env);

    await csm.sh({ env })`just clean`;

    await dre.runCommand(CSMInstall, {});

    const args = [
      "script",
      "./script/DeployCSVerifierElectra.s.sol:DeployCSVerifierDevNet",
      "--broadcast",
      "--rpc-url",
      elPublic,
    ];
    if (params.verify) {
      args.push(
        "--verify",
        "--verifier",
        "blockscout",
        "--chain",
        "32382",
        "--verifier-url",
        blockscoutConfig.api,
        // "--verifier-api-key",
        // constants.VERIFIER_API_KEY,
      );
    }

    await csm.sh({ env })`forge ${args}`;

    const fileContent = await csm.readJson(constants.DEPLOYED_VERIFIER);

    await state.updateElectraVerifier(fileContent);
  },
});
