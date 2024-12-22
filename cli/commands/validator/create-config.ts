import { Command } from "@oclif/core";
import { baseConfig, jsonDb, validatorsState } from "../../config/index.js";
import { fetchActiveValidators } from "../../lib/validator/index.js";
import { generateDockerComposeOneService } from "../../lib/validator/val-teku-one.js";
import { assert } from "console";
import {
  fetchKeystores,
  fetchValidatorGraffiti,
} from "../../lib/keymanager-api/index.js";

export default class VerifyCore extends Command {
  static description = "Verify deployed lido-core contracts";

  async run() {
    console.log(baseConfig.kurtosis.config.participants_matrix.cl[0].cl_image);
    const VC_IMAGE =
      baseConfig.kurtosis.config.participants_matrix?.cl?.[0]?.cl_image;
    assert(
      VC_IMAGE !== undefined,
      "CL_IMAGE is not declared, check the path in the Kurtosis config (participants_matrix?.cl?.[0]?.cl_image)"
    );

    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData;
    if (!depositData) {
      this.error("Deposit data not found in validator/state.json file");
    }
    const state = await jsonDb.read();
    const { network } = baseConfig;

    const cl = state.network?.binding?.clNodes?.[0] ?? network.cl.url;
    const clPrivateUrl =
      state.network?.binding?.clNodesPrivate?.[0] ?? network.cl.url;
    const name = state.network?.binding?.name ?? network.name;

    const validators = await fetchActiveValidators(cl);
    const targetValidators = await validators.data.filter(
      (v) =>
        v.validator.withdrawal_credentials ===
        "0x010000000000000000000000f93ee4cf8c6c40b329b0c0626f28333c132cf241"
    );

    if (!targetValidators.length) {
      this.error("No validators found");
    }
    const validatorsApi = state.network?.binding?.validatorsApi?.[0];

    const keystores = await fetchKeystores(validatorsApi);

    const graffiti = await fetchValidatorGraffiti(
      validatorsApi,
      keystores.data[0].validating_pubkey
    );
    const configDir = baseConfig.validator.paths.docker;

    await generateDockerComposeOneService(configDir, {
      validatorsInfo: targetValidators,
      keysDir: baseConfig.artifacts.paths.validator,
      clPrivateUrl,
      dockerImage: VC_IMAGE,
      dockerNetwork: `kt-${name}`,
      validatorFeeRecipient: baseConfig.sharedWallet[0].publicKey,
      graffiti: graffiti.data.graffiti,
    });
  }
}
