import { Command } from "@oclif/core";

import { jsonDb } from "../../config/index.js";
import {
  fetchKeystores,
  fetchValidatorGraffiti,
} from "../../lib/keymanager-api/index.js";

export class FetchCommittees extends Command {
  static description =
    "Fetch committees for all slots up to the latest and list unique validator IDs";

  async run() {
    const state = await jsonDb.read();
    const validatorsApi = state.network?.binding?.validatorsApi?.[0];

    const keystores = await fetchKeystores(validatorsApi);

    const graffiti = await fetchValidatorGraffiti(
      validatorsApi,
      keystores.data[0].validating_pubkey
    );
    console.log(keystores);
    console.log(graffiti);
  }
}
