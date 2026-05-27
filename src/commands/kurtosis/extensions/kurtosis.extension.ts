import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { DevNetError, isEmptyObject } from "@devnet/utils";
import { execa, ResultPromise } from "execa";
import { z } from "zod";

export const KURTOSIS_DEFAULT_PRESET = "pectra-devnet4";

// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getKurtosis<M extends boolean = true>(must?: M): Promise<M extends true
      ? KurtosisState
      : Partial<KurtosisState>>;
    isKurtosisDeployed(): Promise<boolean>;
    removeKurtosis(): Promise<void>;
    updateKurtosis(state: KurtosisState): Promise<void>;
  }

  export interface Config {
    kurtosis: KurtosisState;
  }
}

export const KurtosisState = z.object({
  preset: z.string()
});

export type KurtosisState = z.infer<typeof KurtosisState>;

export const kurtosisExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateKurtosis = (async function (state: KurtosisState) {
    await dre.state.updateProperties("kurtosis", state);
  });

  dre.state.removeKurtosis = (async function () {
    await dre.state.updateProperties("kurtosis", {});
  });

  dre.state.isKurtosisDeployed = (async function () {
    const state = await dre.state.getKurtosis(false);
    return state && !isEmptyObject(state);
  });

  dre.state.getKurtosis = (async function <M extends boolean = true>(must: M = true as M) {
    const kurtosis = await dre.state.getProperties(
      "kurtosis",
      "kurtosis",
      KurtosisState,
      must,
    );

    return kurtosis;
  });
};

let kurtosisGatewayProcess: ResultPromise<{
  detached: true
  stdio: "ignore"
}> | undefined = undefined;

export const startKurtosisGateway = async (dre: DevNetRuntimeEnvironmentInterface) => {
  if (kurtosisGatewayProcess) {
    dre.logger.log(`Kurtosis gateway already started`);
    return true;
  }

  const kurtosisClusterType = await getKurtosisClusterType(dre);

  if (!isSupportedClusterType(kurtosisClusterType)) {
    return;
  }

  // kurtosis CLI always dials localhost:9710 (see kurtosis-tech/kurtosis
  // cli/cli/helpers/engine_manager/engine_manager.go: hostMachineIpAndPort
  // defaults to localhost). Without `kurtosis gateway` running, the CLI gets
  // CONTAINER_RUNNING_BUT_SERVER_NOT_RESPONDING even when the engine is
  // healthy on its ClusterIP. This is true both inside and outside the
  // cluster. See docs/troubleshooting/kurtosis-engine-server-not-responding.md.
  dre.logger.log(`Starting kurtosis gateway in the background`);
  kurtosisGatewayProcess = execa('kurtosis', ['gateway'], { detached: true, stdio: 'ignore' });
  // Swallow rejection so a dead gateway doesn't crash the whole process
  // via unhandledRejection (Node 15+ behaviour).
  kurtosisGatewayProcess.catch((error) => {
    dre.logger.error(`Kurtosis gateway exited: ${error.message}`);
  });
  dre.logger.log(`Started kurtosis gateway`);

  // unref so it doesn’t keep the parent alive
  //kurtosisGatewayProcess.unref();

  // Make sure to kill it when this script ends
  const cleanup = () => {
    kurtosisGatewayProcess?.kill();
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); });
  process.on('SIGTERM', () => { cleanup(); });
};

// Detect whether the CLI is running inside a Kubernetes pod.
// Pods always have a projected ServiceAccount token at this path.
const isInCluster = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
    const fs = require("node:fs");
    return fs.existsSync("/var/run/secrets/kubernetes.io/serviceaccount/token");
  } catch {
    return false;
  }
};

export const stopKurtosisGateway = async (dre: DevNetRuntimeEnvironmentInterface) => {
  if (!kurtosisGatewayProcess) {
    return;
  }

  dre.logger.log(`Kurtosis gateway will be killed`);
  kurtosisGatewayProcess?.kill();
  kurtosisGatewayProcess = undefined;
}

export const getKurtosisClusterType = async (dre: DevNetRuntimeEnvironmentInterface) => {
  const result = await dre.services.kurtosis.sh({
    stdout: ["pipe"],
    stderr: ["pipe"],
    verbose() {},
  })`kurtosis cluster get`
    .catch((error) => dre.logger.error(error.message));

  const kurtosisClusterType = result?.stdout.trim();

  if (!kurtosisClusterType) {
    throw new DevNetError('Unable to detect kurtosis cluster type');
  }

  return kurtosisClusterType;
}

export const isSupportedClusterType = (clusterType: string) => ['cloud', 'valset-sandbox3'].includes(clusterType);
