import { assertoor } from "./assertoor.js";
import { blockscout } from "./blockscout.js";
import { dashboard } from "./dashboard.js";
import { cmv2 } from "./cmv2.js";
import { council } from "./council-daemon.js";
import { csm } from "./csm.js";
import { csmProverTool } from "./csm-prover-tool.js";
import { dataBus } from "./data-bus.js";
import { dockerRegistry } from "./docker-registry.js";
import { dsmBots } from "./dsm-bots.js";
import { ehw } from "./ethereum-head-watcher.js";
import { evm } from "./evm.js";
import { grafana } from "./grafana.js";
import { kapi } from "./kapi.js";
import { kubo } from "./kubo.js";
import { kurtosis } from "./kurtosis.js"
import { lateProverBot } from "./late-prover-bot.js";
import { lidoCLI } from "./lido-cli.js";
import { lidoCore } from "./lido-core.js";
import { noWidget } from "./no-widget.js";
import { noWidgetBackend } from "./no-widget-backend.js";
import { onchainMon } from "./onchain-mon.js";
import { oracle } from "./oracle.js";
import { voting } from "./voting.js";
import { vroomOnchainMon } from "./vroom-onchain-mon.js";

export const serviceConfigs = {
  blockscout,
  dashboard,
  lateProverBot,
  lidoCore,
  lidoCLI,
  kurtosis,
  cmv2,
  csm,
  csmProverTool,
  ehw,
  evm,
  grafana,
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
  onchainMon,
  vroomOnchainMon,
};

export type EmbeddedServicesConfigs = typeof serviceConfigs;
