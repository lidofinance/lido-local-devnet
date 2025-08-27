import { Params, assert, command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";

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
      logger,
    },
  }) {
    const { validatorsApiPublic } = await dre.state.getChain();
    const keystoresResponse = await keyManager.fetchKeystores(
      validatorsApiPublic,
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

    logger.log("Removing keystores from the VC container");
    await kurtosis.sh`docker exec ${id} rm -f ${filePath}`;
    await kurtosis.sh`docker exec ${id} rm -f ${lockFile}`;

    logger.log("Removing key from Key Manager")
    await keyManager.deleteKeystores(
      validatorsApiPublic,
      [existingPubKey.validating_pubkey],
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    logger.warn("Consider restarting VC manually via 'validator restart'");
  },
});
