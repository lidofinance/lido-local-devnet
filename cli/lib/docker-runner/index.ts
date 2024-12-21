import { execa } from "execa";
import { baseConfig } from "../../config/index.js";
import { getShortGitBranchHash } from "../git/index.js";

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

  // Run the command inside the Docker container
  const result = execa(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      `${baseConfig.artifacts.paths.validator}:/app/validator_keys`, // Mount the current directory to /workspace in the container
      ...formatDockerEnvVars(opts?.env),
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
  const gitHash = await getShortGitBranchHash(dockerRunner.depositCli.paths.root);
  console.log(gitHash, command,
    args, `deposit-cli:${gitHash}`)
  return buildAndRunCommandInDocker(
    dockerRunner.depositCli.paths.dockerfile,
    `deposit-cli:${gitHash}-1`,
    command,
    args,
    {...opts, cwd: dockerRunner.depositCli.paths.root}
  );
};
