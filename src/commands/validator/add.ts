import { command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";
import { assert, sleep } from "@devnet/utils";
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
    const keystoresResponse = await keyManager.fetchKeystores(
      validatorsApiPublic,
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    logger.log(`Total keystores: ${keystoresResponse.data.length}`);

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
            keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
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
