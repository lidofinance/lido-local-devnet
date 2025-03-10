import { Params, assert, command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";

import { ValidatorRestart } from "./restart.js";

export const ValidatorRemove = command.cli({
  description: "Removes a specified validator key from the validator and restarts it.",
  params: {
    key: Params.string({ description: "Key to remove", required: true }),
  },
  async handler({ dre, params }) {
    const { validatorsApi } = await dre.state.getChain();
    const keystoresResponse = await keyManager.fetchKeystores(
      validatorsApi,
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    const existingPubKey = keystoresResponse.data.find(
      (k) => k.validating_pubkey === params.key,
    );

    assert(existingPubKey !== undefined, "Keystore not found");

    const res = await keyManager.deleteKeystores(
      validatorsApi,
      [existingPubKey.validating_pubkey],
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    assert(
      res.data[0].status === "deleted",
      res.data[0].message ?? "Failed to delete keystore",
    );

    await dre.runCommand(ValidatorRestart, {});
  },
});
