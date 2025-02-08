import path from "node:path";
import { ZodSchema, z } from "zod";

import { JsonDb } from "./json-db/index.js";
import { Config, ConfigValidator } from "./schemas.js";

export abstract class BaseState {
  protected appState: JsonDb;
  protected config: Config;
  protected parsedConsensusGenesisState: JsonDb;
  protected validators: JsonDb;

  constructor(rawConfig: unknown, artifactsRoot: string, chainRoot: string) {
    this.config = ConfigValidator.validate(rawConfig);
    this.appState = new JsonDb(path.join(artifactsRoot, "state.json"));
    this.parsedConsensusGenesisState = new JsonDb(
      path.join(chainRoot, "parsed_consensus_genesis.json"),
    );
    this.validators = new JsonDb(path.join(chainRoot, "validators.json"));
  }

  protected async getProperties<T, M extends boolean>(
    keys: { [K in keyof T]: string },
    group: keyof Config,
    schema: ZodSchema<T>,
    must: M,
  ): Promise<M extends true ? T : Partial<T>> {
    const reader = await this.appState.getReader();
    const result: Partial<T> = {};
    const groupConfig = this.config[group] || {};

    for (const key in keys) {
      if (Object.hasOwn(keys, key)) {
        const dbPath = keys[key];
        result[key] = (groupConfig as any)[key] ?? reader.get(dbPath);
      }
    }

    const parsed = schema.safeParse(result);
    if (!parsed.success) {
      if (must) {
        throw parsed.error;
      }

      if (schema instanceof z.ZodObject) {
        const partialParsed = schema.partial().safeParse(result);
        return (
          partialParsed.success ? partialParsed.data : {}
        ) as M extends true ? T : Partial<T>;
      }

      return {} as M extends true ? T : Partial<T>;
    }

    return parsed.data;
  }

  protected async updateProperties(group: string, jsonData: unknown) {
    await this.appState.update({ [group]: jsonData });
  }
}
