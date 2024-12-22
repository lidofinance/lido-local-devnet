import { Command, Flags } from "@oclif/core";
import { baseConfig, jsonDb, validatorsState } from "../../config/index.js";
import {
  fetchActiveValidators,
  groupByWithdrawalCredentials,
} from "../../lib/validator/index.js";
import { generateDockerComposeOneService } from "../../lib/validator/val-teku-one.js";
import { assert } from "console";
import {
  fetchKeystores,
  fetchValidatorGraffiti,
} from "../../lib/keymanager-api/index.js";

export default class CreateValidatorConfig extends Command {
  static description = "Generation of configuration to run validators";
  static flags = {
    wc: Flags.string({
      char: "w",
      description: "Custom withdrawal credentials (optional)",
    }),
  };
  async run() {
    const { flags } = await this.parse(CreateValidatorConfig);
    // define WC array (lido and local, for tests)
    const targetWCs = [
      "0x010000000000000000000000f93ee4cf8c6c40b329b0c0626f28333c132cf241",
    ];

    if (flags.wc) {
      targetWCs.push(flags.wc);
    }

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
    const targetValidators = await validators.data.filter((v) =>
      targetWCs.includes(v.validator.withdrawal_credentials)
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

    // validators by group

    const valGroups = groupByWithdrawalCredentials(targetValidators);

    await generateDockerComposeOneService(configDir, {
      keysDir: baseConfig.artifacts.paths.validator,
      clPrivateUrl,
      dockerImage: VC_IMAGE,
      dockerNetwork: `kt-${name}`,
      graffiti: graffiti.data.graffiti,
      valGroups,
    });
  }
}
