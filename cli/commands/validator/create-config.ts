import { Command, Flags } from "@oclif/core";
import { baseConfig, jsonDb, validatorsState } from "../../config/index.js";
import {
  fetchActiveValidators,
  groupByWithdrawalCredentials,
} from "../../lib/validator/index.js";
import { generateDockerComposeOneService } from "../../lib/validator/val-teku-one.js";
import { assert } from "console";
import { DepositData } from "../../lib/validator/interfaces.js";
// import {
//   fetchKeystores,
//   fetchValidatorGraffiti,
// } from "../../lib/keymanager-api/index.js";



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
      baseConfig.kurtosis.config.participants[0]?.cl_image;
    assert(
      VC_IMAGE !== undefined,
      "CL_IMAGE is not declared, check the path in the Kurtosis config (config.participants[0]?.cl_image)"
    );

    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData as DepositData[];
    if (!depositData) {
      this.error("Deposit data not found in validator/state.json file");
    }
    // const state = await jsonDb.read();
    const reader = await jsonDb.getReader()
    const clPrivateUrl = reader.getOrError('network.binding.clNodesPrivate.0')
    const name = reader.getOrError('network.name')
    // const cl = state.network?.binding?.clNodes?.[0] ?? network.cl.url;

    // const name = state.network?.binding?.name ?? network.name;
    console.log(depositData, targetWCs)
    // const validators = await fetchActiveValidators(cl);
    const targetValidators = await depositData.filter((v) =>
      targetWCs.includes(`0x${v.withdrawal_credentials}`)
    );

    if (!targetValidators.length) {
      this.error("No validators found, make sure the deposit has been made ");
    }
    // const validatorsApi = state.network?.binding?.validatorsApi?.[0];

    // const keystores = await fetchKeystores(validatorsApi);

    // const graffiti = await fetchValidatorGraffiti(
    //   validatorsApi,
    //   keystores.data[0].validating_pubkey
    // );

    const configDir = baseConfig.validator.paths.docker;

    // validators by group

    const valGroups = groupByWithdrawalCredentials(targetValidators);

    await generateDockerComposeOneService(configDir, {
      keysDir: baseConfig.artifacts.paths.validatorDocker,
      configDir: baseConfig.artifacts.paths.validator,
      clPrivateUrl,
      dockerImage: VC_IMAGE,
      dockerNetwork: `kt-${name}`,
      // TODO: enable use_separate_vs in kurtosis and test setup
      // graffiti: graffiti.data.graffiti,
      graffiti: "1-geth-teku",
      valGroups,
    });
  }
}
