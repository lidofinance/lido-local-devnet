import { DevNetRuntimeEnvironmentInterface } from "./runtime-env.js";

export type CustomDevNetExtension = (dre: DevNetRuntimeEnvironmentInterface) => Promise<void> | void;
