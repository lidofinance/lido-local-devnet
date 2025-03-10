import { assert, command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";

import { ValidatorRestart } from "./restart.js";

export const ValidatorAdd = command.cli({
  description:
    "Finds available keys in the state, adds them to the validator, and restarts it.",
  params: {},
  async handler({
    dre,
    dre: {
      logger,
      state,
    },
  }) {
    const { validatorsApi } = await dre.state.getChain();
    const keystoresResponse = await keyManager.fetchKeystores(
      validatorsApi,
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    const existingPubKeys = new Set(
      keystoresResponse.data.map((p) => p.validating_pubkey.replace("0x", "")),
    );

    const keystore = await state.getKeystores();
    assert(keystore !== undefined, "Keystore data not found");

    const actualKeystores = keystore.filter(
      (k) => !existingPubKeys.has(k.pubkey),
    );

    if (actualKeystores.length === 0) {
      logger.log("No new keystores detected.");
      return;
    }

    logger.log(`Detected new keystores: ${actualKeystores.length}`);

    const keystoresStrings = actualKeystores.map((v) => JSON.stringify(v));
    const keystoresPasswords = actualKeystores.map((_) => "12345678");
    const res = await keyManager.importKeystores(
      validatorsApi,
      keystoresStrings,
      keystoresPasswords,
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    logger.logJson(res);

    await dre.runCommand(ValidatorRestart, {});
  },
});
