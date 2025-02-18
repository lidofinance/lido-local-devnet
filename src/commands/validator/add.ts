import { assert, command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";

import { KurtosisUpdate } from "../chain/update.js";

export const ValidatorAdd = command.cli({
  description:
    "Finds available keys in the state, adds them to the validator, and restarts it.",
  params: {},
  async handler({
    dre,
    dre: {
      logger,
      state,
      services: { kurtosis },
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

    const {
      vc: validatorsInDockerNetwork,
    } = await kurtosis.getDockerInfo();

    const validVC = validatorsInDockerNetwork.filter(v => v.name.includes('teku'))
    // in kurtosis api configuration the keys are stored differently, some validators use the default key, some use a generated key, but they are stored in different places.
    // TODO: In the future, we need to either improve etherium-package or write a parser.
    // https://github.com/search?q=repo%3Aethpandaops%2Fethereum-package+keymanager&type=code&p=2
    // lighthouse "/validator-keys/keys/api-token.txt",
    assert(validVC.length > 0, "Teku validator was not found in the running configuration. At least one teku client must be running to work correctly.")

    const { id: validatorServiceDockerId } = validVC[0];

    await kurtosis.sh`docker restart ${validatorServiceDockerId}`;

    // Update the state after restarting the container
    await dre.runCommand(KurtosisUpdate, {});
  },
});
