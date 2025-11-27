import { Params, command } from "@devnet/command";

import { ChainGetInfo } from "../chain/info.js";
import { ChainUp } from "../chain/up.js";
import { CouncilK8sUp } from "../council-k8s/up.js";
import { ActivateCSM } from "../csm/activate.js";
import { LidoAddCSMOperatorWithKeys } from "../csm/add-operator.js";
import { DeployCSVerifier } from "../csm/add-verifier.js";
import { DeployCSMContracts } from "../csm/deploy.js";
import { DataBusDeploy } from "../data-bus/deploy.js";
import { DSMBotsK8sUp } from "../dsm-bots-k8s/up.js";
import { GitCheckout } from "../git/checkout.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";
import { ActivateLidoProtocol } from "../lido-core/activate.js";
import { LidoAddKeys } from "../lido-core/add-keys.js";
import { LidoAddOperator } from "../lido-core/add-operator.js";
import { DeployLidoContracts } from "../lido-core/deploy.js";
import { LidoDeposit } from "../lido-core/deposit.js";
import { GenerateLidoDevNetKeys } from "../lido-core/keys/generate.js";
import { UseLidoDevNetKeys } from "../lido-core/keys/use.js";
import { ReplaceDSM } from "../lido-core/replace-dsm.js";
import { LidoSetStakingLimit } from "../lido-core/set-staking-limit.js";
import { NoWidgetUp } from "../no-widget/up.js";
import { NoWidgetBackendUp } from "../no-widget-backend/up.js";
import { OracleK8sUp } from "../oracles-k8s/up.js";
import { ValidatorAdd } from "../validator/add.js";

export const FusakaZkTestDevNetUp = command.cli({
  description: "Fusaka  ZK Test test stand.",
  params: {},
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "fix/scratch-deploy-tw",
    });

    await dre.runCommand(GitCheckout, {
      service: "csm",
      ref: "main",
    });

    await dre.runCommand(ChainUp, { preset: 'fusaka-zk-test' });
    logger.log("✅ Network initialized.");
  },
});
