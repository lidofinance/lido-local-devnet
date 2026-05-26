import { command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";
import { assert, DevNetError, sleep } from "@devnet/utils";
import { pipe, A, RA, TE, NEA, E } from "@devnet/fp";
import { $ } from "execa";

import { nodesExtension } from "../chain/extensions/nodes.extension.js";
import { ValidatorRestart } from "./restart.js";

// Prysm validator refuses to import keystores into the unified wallet file
// (`all-accounts.keystore.json`) unless it has 0600 permissions. Kurtosis
// `ethereum-package` initialises the wallet with 0644, so the first
// `validator add` against a fresh prysm VC fails with HTTP 500
// "could not write accounts: file already exists without proper 0600 permissions".
// We chmod the wallet tree before importing.
const ensurePrysmWalletPermissions = async (
  networkName: string,
  k8sService: string,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
) => {
  const namespace = `kt-${networkName}`;
  const cmd =
    "chmod 600 /validator-keys/prysm/direct/accounts/all-accounts.keystore.json && " +
    "chmod 700 /validator-keys/prysm/direct/accounts /validator-keys/prysm/direct /validator-keys/prysm";
  try {
    await $`kubectl -n ${namespace} exec ${k8sService} -- sh -c ${cmd}`;
    logger.log(`Prysm wallet permissions normalized in ${namespace}/${k8sService}.`);
  } catch (error) {
    logger.warn(
      `Failed to chmod prysm wallet (${namespace}/${k8sService}): ${(error as Error).message}`,
    );
  }
};

export const ValidatorAdd = command.cli({
  description:
    "Finds available keys in the state, adds them to the validator, and restarts it.",
  params: {},
  extensions: [nodesExtension],
  async handler({
    dre,
    dre: {
      logger,
      state,
      network,
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

    const nodes = await state.getNodes(false);
    const vc0 = nodes?.vc?.[0];
    if (vc0?.clientType === "prysm") {
      await ensurePrysmWalletPermissions(network.name, vc0.k8sService, logger);
    }

    await sleep(25_000);

    const keystoresStrings = actualKeystores.map((v) => JSON.stringify(v));

    await pipe(
      keystoresStrings,
      A.chunksOf(10),
      A.mapWithIndex((index, keystoresChunk) => {
        logger.log(`Chunk ${index} of keystores`);

        const keystoresChunkPasswords = keystoresChunk.map((_) => "12345678");

        return TE.tryCatch(async () => {
          const response = await keyManager.importKeystores(
            validatorsApiPublic,
            keystoresChunk,
            keystoresChunkPasswords,
            token,
          );
          logger.log(`Chunk ${index} keymanager response: ${JSON.stringify(response)}`);
        }, E.toError);
      }),
      A.sequence(TE.ApplicativeSeq), // sequential execution
      TE.execute
    );


    // TODO
    // await dre.runCommand(ValidatorRestart, {});
  },
});
