import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";

// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getLogging<M extends boolean = true>(must?: M,): Promise<M extends true ? LoggingState : Partial<LoggingState>>;
    isLoggingRunning(): Promise<boolean>;
    removeLogging(): Promise<void>;
    updateLogging(state: LoggingState): Promise<void>;
  }

  export interface Config {
    logging: LoggingState;
  }
}

export const LoggingState = z.object({
  lokiPrivateUrl: z.string(),
});

export type LoggingState = z.infer<typeof LoggingState>;

export const loggingExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateLogging = (async function (state: LoggingState) {
    await dre.state.updateProperties("logging", state);
  });

  dre.state.removeLogging = (async function () {
    await dre.state.updateProperties("logging", {});
  });

  dre.state.isLoggingRunning = (async function () {
    const state = await dre.state.getLogging(false);
    return state && !isEmptyObject(state) && (state.lokiPrivateUrl !== undefined);
  });

  dre.state.getLogging = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "logging",
      "logging",
      LoggingState,
      must,
    );
  });
};
