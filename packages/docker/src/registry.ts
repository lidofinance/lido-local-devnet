import { DevNetError } from "@devnet/utils";
import { execa } from "execa";

export interface DockerPushOptions {
  imageName: string;
  password: string;
  registryHostname: string;
  tag: string;
  username: string;
}

/**
 * Pushes a Docker image with a specific tag to a custom registry using username/password authentication.
 *
 * @param options - Configuration options for pushing the Docker image
 * @returns Promise that resolves when the image is successfully pushed
 * @throws DevNetError if login or push operations fail
 */
export async function pushDockerImage(options: DockerPushOptions): Promise<void> {
  const { imageName, tag, registryHostname, username, password } = options;

  try {
    // Build the full image name with registry URL and tag
    const fullImageName = `${registryHostname}/${imageName}:${tag}`;

    // First, login to the registry
    console.log(`Logging in to Docker registry: ${registryHostname}`);
    await execa("docker", ["login", registryHostname, "--username", username, "--password-stdin"], {
      input: password,
      stdio: ["pipe", "inherit", "inherit"]
    });

    console.log(`Successfully logged in to registry: ${registryHostname}`);

    // Tag the local image with the registry URL if it's not already tagged
    console.log(`Tagging image: ${imageName}:${tag} as ${fullImageName}`);
    await execa("docker", ["tag", `${imageName}:${tag}`, fullImageName], {
      stdio: "inherit"
    });

    // Push the image to the registry
    console.log(`Pushing image: ${fullImageName}`);
    await execa("docker", ["push", fullImageName], {
      stdio: "inherit"
    });

    console.log(`Successfully pushed image: ${fullImageName}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new DevNetError(
      `Failed to push Docker image ${imageName}:${tag} to registry ${registryHostname}: ${errorMessage}`
    );
  }
}

/**
 * Builds and pushes a Docker image with a specific tag to a custom registry.
 *
 * @param options - Configuration options including build context path
 * @returns Promise that resolves when the image is successfully built and pushed
 * @throws DevNetError if build, login or push operations fail
 */
export async function buildAndPushDockerImage(
  options: { buildContext: string, cwd: string; dockerfile?: string } & DockerPushOptions
): Promise<void> {
  const { imageName, tag, registryHostname, username, password, buildContext, dockerfile } = options;

  try {
    // Build the Docker image
    const buildArgs = ["build", "-t", `${imageName}:${tag}`];

    if (dockerfile) {
      buildArgs.push("-f", dockerfile);
    }

    buildArgs.push(buildContext);

    console.log(`Building Docker image: ${imageName}:${tag}`);
    await execa("docker", buildArgs, {
      cwd: options.cwd,
      stdio: "inherit"
    });

    console.log(`Successfully built image: ${imageName}:${tag}`);

    // Push the built image
    await pushDockerImage({ imageName, tag, registryHostname, username, password });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new DevNetError(
      `Failed to build and push Docker image ${imageName}:${tag}: ${errorMessage}`
    );
  }
}
