import { Params, assert, command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";

import { ValidatorRestart } from "./restart.js";

export const ValidatorRemove = command.cli({
  description:
    "Removes a specified validator key from the validator and restarts it.",
  params: {
    key: Params.string({ description: "Key to remove", required: true }),
  },
  async handler({
    dre,
    params,
    dre: {
      services: { kurtosis },
    },
  }) {
    const { validatorsApi } = await dre.state.getChain();
    const keystoresResponse = await keyManager.fetchKeystores(
      validatorsApi,
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    const existingPubKey = keystoresResponse.data.find(
      (k) => k.validating_pubkey === params.key,
    );

    assert(existingPubKey !== undefined, "Keystore not found");

    const filePath = `/validator-keys/teku-keys/${existingPubKey.validating_pubkey}.json`;
    const lockFile = `${filePath}.lock`;

    const { vc: validatorsInDockerNetwork } = await kurtosis.getDockerInfo();

    const validVC = validatorsInDockerNetwork.filter((v) =>
      v.name.includes("teku"),
    );

    assert(
      validVC.length > 0,
      "Teku validator was not found in the running configuration. At least one teku client must be running to work correctly.",
    );

    const { id } = validVC[0];

    await kurtosis.sh`docker exec ${id} rm -f ${filePath}`;
    await kurtosis.sh`docker exec ${id} rm -f ${lockFile}`;

    await keyManager.deleteKeystores(
      validatorsApi,
      [existingPubKey.validating_pubkey],
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    await dre.runCommand(ValidatorRestart, {});
  },
});
