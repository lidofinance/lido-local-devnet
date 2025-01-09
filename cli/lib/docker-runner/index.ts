import { execa } from "execa";
import { baseConfig } from "../../config/index.js";
import { getShortGitBranchHash } from "../git/index.js";
import assert from "node:assert";

const { dockerRunner } = baseConfig;

type ExecOpts = {
  env?: Record<string, string | number>;
  cwd?: string;
};

function formatDockerEnvVars(env?: Record<string, string | number>): string[] {
  return Object.entries(env ?? {})
    .filter(([_, value]) => value !== undefined)
    .flatMap(([key, value]) => ["-e", `${key}=${String(value)}`]);
}

export async function buildAndRunCommandInDocker(
  dockerfilePath: string,
  imageName: string,
  command: string,
  args: string[],
  volume: string,
  opts?: ExecOpts
) {
  try {
    await execa("docker", ["inspect", imageName]);
    console.log("Image already exists, skipping build...");
  } catch {
    console.log("Image not found, building...");
    await execa(
      "docker",
      ["build", "-f", dockerfilePath, "-t", imageName, "."],
      {
        cwd: opts?.cwd,
        stdio: "inherit",
      }
    );
  }

  const uid = process.getuid?.();
  const gid = process.getgid?.();

  assert(
    typeof uid === "number",
    "UID is not defined. Ensure you are running this on a Linux/OSX system."
  );
  assert(
    typeof gid === "number",
    "GID is not defined. Ensure you are running this on a Linux/OSX system."
  );

  const result = await execa(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      volume,
      ...formatDockerEnvVars(opts?.env),
      "-e",
      `UID=${uid}`,
      "-e",
      `GID=${gid}`,
      imageName,
      command,
      ...args,
    ],
    {
      cwd: opts?.cwd,
      stdio: "inherit",
    }
  );

  return result;
}

export const runDepositCli = async (
  [command, ...args]: string[],
  opts?: ExecOpts
) => {
  const gitHash = await getShortGitBranchHash(
    dockerRunner.depositCli.paths.root
  );
  console.log(gitHash, command, args, `deposit-cli:${gitHash}`);
  return buildAndRunCommandInDocker(
    dockerRunner.depositCli.paths.dockerfile,
    `deposit-cli:${gitHash}`,
    command,
    args,
    `${baseConfig.artifacts.paths.validatorGenerated}:/app/validator_keys`,
    { ...opts, cwd: dockerRunner.depositCli.paths.root }
  );
};
