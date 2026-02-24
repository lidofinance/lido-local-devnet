import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import { DevNetError } from "@devnet/utils";
import fs from "node:fs/promises";
import path from "node:path";

import { SOURCE_ROOT } from "./constants/onchain-mon-k8s.constants.js";

const resolveSourceRoot = () => {
  const sourceRoot = SOURCE_ROOT();
  return path.isAbsolute(sourceRoot)
    ? sourceRoot
    : path.resolve(process.cwd(), sourceRoot);
};

export const prepareOnchainMonSource = async (dre: DevNetRuntimeEnvironmentInterface) => {
  const sourceRoot = resolveSourceRoot();

  try {
    await fs.access(sourceRoot);
  } catch {
    throw new DevNetError(`onchain-mon source path not found: ${sourceRoot}`);
  }

  const { onchainMon } = dre.services;
  const targetSourceRoot = path.join(onchainMon.artifact.root, "source");

  await fs.rm(targetSourceRoot, { force: true, recursive: true });
  await fs.mkdir(targetSourceRoot, { recursive: true });
  await fs.cp(sourceRoot, targetSourceRoot, { recursive: true, force: true });

  return {
    sourceRoot: targetSourceRoot,
  };
};
