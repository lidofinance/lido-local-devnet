import {baseConfig, jsonDb} from "../../config/index.js";
import {getLidoLocatorAddress} from "../../lib/lido/index.js";
import fs from "node:fs";

export async function getEnv() {
  const state = await jsonDb.read();
  const {network} = baseConfig;

  const el = state.network?.binding?.elNodesPrivate?.[0] ?? network.el.url;
  const cl = state.network?.binding?.clNodesPrivate?.[0] ?? network.cl.url;
  const name = state.network?.binding?.name ?? network.name;
  const locator = await getLidoLocatorAddress();

  if (!fs.existsSync(baseConfig.headwatcher.alertsOutputPath)) {
    fs.mkdirSync(baseConfig.headwatcher.alertsOutputPath, {recursive: true});
  }

  return {
    DOCKER_FILE_PATH: baseConfig.headwatcher.root,
    ALERTS_OUTPUT_DIR: baseConfig.headwatcher.alertsOutputPath,
    CONSENSUS_CLIENT_URI: cl,
    EXECUTION_CLIENT_URI: el,
    LIDO_LOCATOR_ADDRESS: locator,
    DOCKER_NETWORK_NAME: 'kt-' + name,
    KEYS_API_URI: 'http://localhost:9030',
  }
}
