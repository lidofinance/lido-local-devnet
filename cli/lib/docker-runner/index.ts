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
  //   platform: string = 'linux/amd64'
) {
  // Check for the existence of the Docker image
  try {
    await execa("docker", ["inspect", imageName]);
    console.log("Image already exists, skipping build...");
  } catch (error) {
    // If the image is not found, build it
    console.log("Image not found, building...");
    await execa(
      "docker",
      [
        "build",
        // '--platform', platform,
        "-f",
        dockerfilePath,
        "-t",
        imageName,
        ".", // Indicates the build context as the current directory
      ],
      {
        cwd: opts?.cwd,
        stdio: "inherit",
      }
    );
  }

  const uid = process.getuid?.()
  const gid = process.getgid?.()
  // These functions are only available on POSIX platforms (i.e. not on Windows or Android).
  assert(typeof uid === 'number', "uid is not defined make sure you are running the software on a Linux/OSx system")
  assert(typeof gid === 'number', "gid is not defined make sure you are running the software on a Linux/OSx system")

  // Run the command inside the Docker container
  const result = execa(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      volume,
      ...formatDockerEnvVars(opts?.env),
      "--user",
      `${uid}:${gid}`,
      imageName, // Use the existing or newly built image
      command,
      ...args,
    ],
    {
      cwd: opts?.cwd,
      stdio: "inherit", // Inherit stdio to display output directly in the terminal
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
