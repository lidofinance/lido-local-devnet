import { Command } from "@oclif/core";

import { jsonDb } from "../../config/index.js";

export class FetchCommittees extends Command {
  static description =
    "Fetch committees for all slots up to the latest and list unique validator IDs";

  async run() {
    const state = await jsonDb.read();
    const beaconNodeUrl =
      state.network?.binding?.clNodes?.[0] ?? state.network.cl.url;

    const latestSlotResponse = await fetch(
      `${beaconNodeUrl}/eth/v1/beacon/headers/head`
    );
    if (!latestSlotResponse.ok) {
      throw new Error(
        `HTTP error fetching latest slot: status = ${latestSlotResponse.status}`
      );
    }
    const latestSlotData = await latestSlotResponse.json();
    const latestSlot = latestSlotData.data.header.message.slot;

    let validatorIds = new Set<string>();
    for (let slot = 0; slot <= latestSlot; slot++) {
      const endpoint = `${beaconNodeUrl}/eth/v1/beacon/states/${slot}/committees`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        for (const item of data.data) {
          item.validators.forEach((validatorId: string) => {
            validatorIds.add(validatorId);
          });
        }
      } else {
        console.error(
          `Failed to fetch data for slot ${slot}: HTTP status ${response.status}`
        );
      }
    }

    // Convert Set to Array and print unique validator IDs
    const uniqueValidatorIds = Array.from(validatorIds).map((a) =>
      parseInt(a, 10)
    );
    uniqueValidatorIds.sort((a, b) => a - b);

    this.log("Unique Validator IDs:", uniqueValidatorIds);

    

    const minId = uniqueValidatorIds[0];
    const maxId = uniqueValidatorIds[uniqueValidatorIds.length - 1];
    const completeRange = Array.from(
      { length: maxId - minId + 1 },
      (_, i) => i + minId
    );
    const missingIds = completeRange.filter(
      (id) => !uniqueValidatorIds.includes(id)
    );

    this.log("Missing validator IDs:", missingIds);
  }
}
