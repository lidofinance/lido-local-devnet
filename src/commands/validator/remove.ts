import { Params, command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";
import { DevNetError, assert } from "@devnet/utils";

export const ValidatorRemove = command.cli({
  description:
    "Removes a specified validator key from the validator via the keymanager API.",
  params: {
    key: Params.string({ description: "Key to remove", required: true }),
  },
  async handler({
    dre,
    params,
    dre: { logger },
  }) {
    const { validatorsApiPublic } = await dre.state.getChain();
    if (!validatorsApiPublic) throw new DevNetError("Validators API not configured");
    const token =
      process.env.VALIDATOR_KEYMANAGER_TOKEN ?? keyManager.KEY_MANAGER_DEFAULT_API_TOKEN;

    const keystoresResponse = await keyManager.fetchKeystores(validatorsApiPublic, token);
    const existingPubKey = keystoresResponse.data.find(
      (k) => k.validating_pubkey === params.key,
    );
    assert(existingPubKey !== undefined, "Keystore not found");

    logger.log(`Removing key ${existingPubKey.validating_pubkey} via keymanager DELETE...`);
    const response = await keyManager.deleteKeystores(
      validatorsApiPublic,
      [existingPubKey.validating_pubkey],
      token,
    );
    logger.log(`Keymanager response: ${JSON.stringify(response)}`);
  },
});
