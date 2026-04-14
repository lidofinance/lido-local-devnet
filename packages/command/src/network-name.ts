import { DEFAULT_NETWORK_NAME } from "@devnet/types";
import { randomInt } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEPLOY_COMMANDS = new Set(["up", "up-full", "chain up"]);
const ENV_CONFIG_PATH = path.join(process.cwd(), ".env");
const ARTIFACTS_ROOT = path.join(process.cwd(), "artifacts");

const ADJECTIVES = [
  "agile",
  "bold",
  "brisk",
  "calm",
  "clear",
  "clever",
  "curious",
  "eager",
  "fierce",
  "focused",
  "gentle",
  "jolly",
  "keen",
  "lively",
  "lucid",
  "mellow",
  "noble",
  "rapid",
  "serene",
  "sharp",
  "solid",
  "steady",
  "swift",
  "vivid",
  "wise",
  "zesty",
] as const;

const SCIENTISTS = [
  "archimedes",
  "bohr",
  "curie",
  "darwin",
  "edison",
  "euclid",
  "faraday",
  "fermat",
  "feynman",
  "franklin",
  "galileo",
  "gauss",
  "hopper",
  "hypatia",
  "kepler",
  "lagrange",
  "lovelace",
  "maxwell",
  "meitner",
  "newton",
  "noether",
  "pasteur",
  "planck",
  "riemann",
  "shannon",
  "tesla",
  "turing",
  "volta",
] as const;

type ResolveCliNetworkNameOptions = {
  commandName: string;
  rawArgv: string[];
  rawNetworkName?: string;
};

export type ResolvedCliNetworkName = {
  name: string;
  generated: boolean;
  persisted: boolean;
};

const normalizeNetworkName = (value?: string) => value?.trim() || undefined;

const hasExplicitNetworkFlag = (argv: string[]) =>
  argv.some((arg) => arg === "--network" || arg.startsWith("--network="));

const isRootDeployCommand = (commandName: string) =>
  commandName.startsWith("stands ") || DEPLOY_COMMANDS.has(commandName);

const artifactExists = async (networkName: string) =>
  access(path.join(ARTIFACTS_ROOT, networkName))
    .then(() => true)
    .catch(() => false);

const generateReadableDevnetName = async () => {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
    const scientist = SCIENTISTS[randomInt(SCIENTISTS.length)];
    const suffix = attempt >= 12 ? `-${randomInt(10, 100)}` : "";
    const candidate = `${adjective}-${scientist}${suffix}`;

    if (!(await artifactExists(candidate))) {
      return candidate;
    }
  }

  return `devnet-${randomInt(1000, 10_000)}`;
};

const persistDevnetName = async (networkName: string) => {
  const nextLine = `DEVNET_NAME=${networkName}`;

  try {
    const envContent = await readFile(ENV_CONFIG_PATH, "utf8");

    if (/^DEVNET_NAME=.*$/m.test(envContent)) {
      const updatedContent = envContent.replace(/^DEVNET_NAME=.*$/m, nextLine);
      if (updatedContent !== envContent) {
        await writeFile(ENV_CONFIG_PATH, updatedContent, "utf8");
      }
      return;
    }

    const separator = envContent.length > 0 ? "\n" : "";
    await writeFile(ENV_CONFIG_PATH, `${nextLine}${separator}${envContent}`, "utf8");
    return;
  } catch {
    await writeFile(ENV_CONFIG_PATH, `${nextLine}\n`, "utf8");
  }
};

export const resolveCliNetworkName = async ({
  commandName,
  rawArgv,
  rawNetworkName,
}: ResolveCliNetworkNameOptions): Promise<ResolvedCliNetworkName> => {
  const explicitNetworkFlag = hasExplicitNetworkFlag(rawArgv);
  const requestedNetworkName = normalizeNetworkName(rawNetworkName);
  const envNetworkName = normalizeNetworkName(process.env.DEVNET_NAME);
  const rootDeployCommand = isRootDeployCommand(commandName);

  if (explicitNetworkFlag && requestedNetworkName) {
    const shouldPersist = rootDeployCommand && !envNetworkName;

    if (shouldPersist) {
      await persistDevnetName(requestedNetworkName);
      process.env.DEVNET_NAME = requestedNetworkName;
    }

    return {
      name: requestedNetworkName,
      generated: false,
      persisted: shouldPersist,
    };
  }

  if (envNetworkName) {
    return {
      name: envNetworkName,
      generated: false,
      persisted: false,
    };
  }

  if (!rootDeployCommand) {
    return {
      name: requestedNetworkName ?? DEFAULT_NETWORK_NAME,
      generated: false,
      persisted: false,
    };
  }

  const generatedNetworkName = await generateReadableDevnetName();
  await persistDevnetName(generatedNetworkName);
  process.env.DEVNET_NAME = generatedNetworkName;

  return {
    name: generatedNetworkName,
    generated: true,
    persisted: true,
  };
};
