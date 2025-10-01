import { assertoor } from "./assertoor.js";
import { blockscout } from "./blockscout.js";
import { council } from "./council-daemon.js";
import { csm } from "./csm.js";
import { dataBus } from "./data-bus.js";
import { dockerRegistry } from "./docker-registry.js";
import { dsmBots } from "./dsm-bots.js";
import { kapi } from "./kapi.js";
import { kubo } from "./kubo.js";
import { kurtosis } from "./kurtosis.js"
import { lateProverBot } from "./late-prover-bot.js";
import { lidoCLI } from "./lido-cli.js";
import { lidoCore } from "./lido-core.js";
import { noWidget } from "./no-widget.js";
import { noWidgetBackend } from "./no-widget-backend.js";
import { oracle } from "./oracle.js";
import { voting } from "./voting.js";

export const serviceConfigs = {
  blockscout,
  lateProverBot,
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
  kubo,
  noWidgetBackend,
  noWidget,
};

export type EmbeddedServicesConfigs = typeof serviceConfigs;
