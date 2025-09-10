import { assertoor } from "./assertoor.js";
import { blockscout } from "./blockscout.js";
import { council } from "./council-daemon.js";
import { csm } from "./csm.js";
import { dataBus } from "./data-bus.js";
import { dockerRegistry } from "./docker-registry.js";
import { dsmBots } from "./dsm-bots.js";
import { helmLidoKapi } from "./helm-lido-kapi.js";
import { helmLidoOracle } from "./helm-lido-oracle.js";
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
  dockerRegistry,
  helmLidoKapi,
  helmLidoOracle,
};

export type EmbeddedServicesConfigs = typeof serviceConfigs;
