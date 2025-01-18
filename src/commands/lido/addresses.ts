import { Command } from "@oclif/core";

import {
  getCSMModuleAddress,
  getCuratedModuleAddress,
  getLidoLocatorAddress,
  // getLidoWC,
  getStakingRouterAddress,
} from "../../lib/lido/index.js";


export default class GetAddresses extends Command {
  static description = "Get Lido contracts addresses";

  async run() {
    this.log("Getting contracts addresses...");

    const locator = await getLidoLocatorAddress();
    const stakingRouter = await getStakingRouterAddress();
    const curatedModule = await getCuratedModuleAddress();
    const csmModule = await getCSMModuleAddress();
    // const lidoWC = await getLidoWC();

    console.table({
      csmModule,
      curatedModule,
      locator,
      stakingRouter
    });
  }
}
