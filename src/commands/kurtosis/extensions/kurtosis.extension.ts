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

  dre.logger.log(`Starting kurtosis gateway in the background`);
  kurtosisGatewayProcess = execa('kurtosis', ['gateway'], { detached: true, stdio: 'ignore' });
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
