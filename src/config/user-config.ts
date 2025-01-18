import { readFile } from "node:fs/promises";
import * as YAML from "yaml";

import { USER_CONFIG_PATH } from "./constants.js";

export const loadUserConfig = async () => YAML.parse(await readFile(USER_CONFIG_PATH, "utf-8"));
