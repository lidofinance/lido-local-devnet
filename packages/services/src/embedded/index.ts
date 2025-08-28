import { assertoor } from "./assertoor.js";
import { blockscout } from "./blockscout.js";
import { council } from "./council-daemon.js";
import { csm } from "./csm.js";
import { dataBus } from "./data-bus.js";
import { dsmBots } from "./dsm-bots.js";
import { kapi } from "./kapi.js";
import { kurtosis } from "./kurtosis.js";
import { lidoCLI } from "./lido-cli.js";
import { lidoCore } from "./lido-core.js";
import { oracle } from "./oracle.js";
import { voting } from "./voting.js";

export const serviceConfigs = {
  blockscout,
  lidoCore,
  lidoCLI,
  kurtosis,
  csm,
  kapi,
  oracle,
  voting,
  assertoor,
  council,
  dataBus,
  dsmBots,
};

export type EmbeddedServicesConfigs = typeof serviceConfigs;
