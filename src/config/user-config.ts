import { readFile } from "fs/promises";
import YAML from "yaml";

import { USER_CONFIG_PATH } from "./constants.js";

export const loadUserConfig = async () => {
  return YAML.parse(await readFile(USER_CONFIG_PATH, "utf-8"));
};
