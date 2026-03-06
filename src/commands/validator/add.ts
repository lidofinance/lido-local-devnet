import { command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";
import { assert, DevNetError, sleep } from "@devnet/utils";
import { pipe, A, RA, TE, NEA, E } from "@devnet/fp";

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
    const { validatorsApiPublic } = await dre.state.getChain();

    if (!validatorsApiPublic) {
      throw new DevNetError(
        "Validators API endpoint is not configured. " +
        "This is expected for external/self-hosted chains without a validator client. " +
        "Use 'chain kurtosis up' to run a full devnet with validators.",
      );
    }
    const token =
      process.env.VALIDATOR_KEYMANAGER_TOKEN ??
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN;
    logger.log(`Validator keymanager URL: ${validatorsApiPublic}`);
    const keystoresResponse = await keyManager.fetchKeystores(
      validatorsApiPublic,
      token,
    );

    const existingKeystores = Array.isArray(keystoresResponse?.data)
      ? keystoresResponse.data
      : undefined;

    if (!existingKeystores) {
      logger.log("Validator keymanager returned no keystores; skipping import.");
      logger.log(
        `Validator keymanager response: ${JSON.stringify(keystoresResponse)}`,
      );
      return;
    }

    logger.log(`Total keystores: ${existingKeystores.length}`);

    const existingPubKeys = new Set(
      existingKeystores.map((p) => p.validating_pubkey.replace("0x", "")),
    );

    const keystore = await state.getKeystores();
    if (!keystore) {
      logger.log("Keystore data not found in state; skipping import.");
      return;
    }

    const actualKeystores = keystore.filter(
      (k) => !existingPubKeys.has(k.pubkey),
    );

    if (actualKeystores.length === 0) {
      logger.log("No new keystores detected.");
      return;
    }

    logger.log(`Detected new keystores: ${actualKeystores.length}`);

    await sleep(25_000);

    const keystoresStrings = actualKeystores.map((v) => JSON.stringify(v));

    await pipe(
      keystoresStrings,
      A.chunksOf(10),
      A.mapWithIndex((index, keystoresChunk) => {
        logger.log(`Chunk ${index} of keystores`);

        const keystoresChunkPasswords = keystoresChunk.map((_) => "12345678");

        return TE.tryCatch(async () => {
          await keyManager.importKeystores(
            validatorsApiPublic,
            keystoresChunk,
            keystoresChunkPasswords,
            token,
          );
        }, E.toError);
      }),
      A.sequence(TE.ApplicativeSeq), // sequential execution
      TE.execute
    );


    // TODO
    // await dre.runCommand(ValidatorRestart, {});
  },
});
