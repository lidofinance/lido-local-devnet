import Docker from "dockerode";

import { DevNetError } from "@devnet/utils";

const docker = new Docker();

export interface ContainerInfo {
  id: string;
  ip: string;
  name: string;
  client: string;
  ports: {
    privatePort?: number;
    privateUrl?: string;
    publicPort?: number;
    publicUrl?: string;
  }[];
}

const CLIENT_LABEL: string = "com.kurtosistech.custom.ethereum-package.client"

export async function getContainersByServiceLabels<
  T extends Record<string, string>,
>(labels: T, networkName: string): Promise<Record<keyof T, ContainerInfo[]>> {
  const containers = await docker.listContainers({all: true});

  const result = {} as Record<keyof T, ContainerInfo[]>;

  for (const serviceName of Object.keys(labels) as (keyof T)[]) {
    const label = labels[serviceName];
    const [labelKey, labelValue] = label.split("=");

    const matchingContainers: ContainerInfo[] = [];

    for (const container of containers) {
      const containerInstance = docker.getContainer(container.Id);
      const containerDetails = await containerInstance.inspect();

      if (!containerDetails.NetworkSettings.Networks[networkName]) {
        continue;
      }

      if (
        containerDetails.Config.Labels &&
        containerDetails.Config.Labels[labelKey] === labelValue
      ) {
        const ip =
          containerDetails.NetworkSettings.Networks[networkName].IPAddress;

        const ports = container.Ports.map((port) => ({
          publicPort: port.PublicPort,
          privatePort: port.PrivatePort,
          publicUrl: port.PublicPort
            ? `http://localhost:${port.PublicPort}`
            : undefined,
          privateUrl: port.PrivatePort
            ? `http://${ip}:${port.PrivatePort}`
            : undefined,
        }));

        matchingContainers.push({
          id: containerDetails.Id,
          name: container.Names[0].replace("/", ""),
          client: container.Labels[CLIENT_LABEL],
          ip,
          ports,
        });
      }
    }

    if (matchingContainers.length === 0) {
      throw new DevNetError(
        `No container found for label '${label}' in network '${networkName}'`,
      );
    }

    result[serviceName] = matchingContainers;
  }

  return result;
}

export async function getContainersByServiceLabelsOrNull<
  T extends Record<string, string>,
>(
  labels: T,
  networkName: string,
): Promise<Record<keyof T, ContainerInfo[]> | null> {
  try {
    return await getContainersByServiceLabels(labels, networkName);
  } catch (error: unknown) {

    if (
      error instanceof DevNetError &&
      error.message.startsWith("No container found for label")
    ) {
      return null;
    }

    throw error;
  }
}

export interface PublicPortInfo {
  id: string;
  privatePort: number;
  publicPort: number;
  serviceName: string;
}

/**
 * Finds the public port and service name for a given private port and network.
 *
 * @param privatePort - The private port of the service inside the container.
 * @param networkName - The name of the Docker network.
 * @returns An object containing the public port and service name, or null if not found.
 */
export async function getServiceInfo(
  privatePort: number,
  networkName: string,
): Promise<PublicPortInfo | null> {
  // Get the list of containers
  const containers = await docker.listContainers();

  for (const container of containers) {
    const containerInstance = docker.getContainer(container.Id);
    const containerDetails = await containerInstance.inspect();

    // Check if the container is connected to the specified network
    if (containerDetails.NetworkSettings.Networks[networkName]) {
      // Find the port mapping for the specified private port
      const mappedPort = container.Ports.find(
        (port) => port.PrivatePort === privatePort && port.PublicPort,
      );

      if (mappedPort) {
        return {
          publicPort: mappedPort.PublicPort, // Return the public port if found
          serviceName: container.Names[0].replace("/", ""), // Get the service name
          privatePort: mappedPort.PrivatePort,
          id: containerDetails.Id,
        };
      }
    }
  }

  return null;
}

export async function getServiceInfoByLabel(labelKey: string, label: string) {
  // Get the list of containers
  const containers = await docker.listContainers();
  const result = containers.find((c) => c.Labels[labelKey] === label);
  // containers.forEach(ss => console.log(ss.Labels))

  if (!result) return null;

  return {
    serviceName: result.Names[0].replace("/", ""), // Get the service name
    id: result.Id,
  };
}
