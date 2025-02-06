import Docker from "dockerode";

const docker = new Docker();

interface PortMapping {
  privatePort: number;
  publicPort: number;
  type: string;
}

interface ServiceInfo {
  name: string;
  ports: PortMapping[];
}

export async function getPublicPortsAndServices(
  networkName: string,
): Promise<ServiceInfo[]> {
  // Get the list of containers
  const containers = await docker.listContainers();

  const networkContainers: ServiceInfo[] = [];

  for (const container of containers) {
    const containerInstance = docker.getContainer(container.Id);
    const containerDetails = await containerInstance.inspect();

    // Check if the container is connected to the specified network
    if (containerDetails.NetworkSettings.Networks[networkName]) {
      const containerInfo: ServiceInfo = {
        name: container.Names[0].replace("/", ""), // Container name
        ports: [], // Public ports
      };

      // Add public ports
      for (const port of container.Ports) {
        if (port.PublicPort) {
          containerInfo.ports.push({
            privatePort: port.PrivatePort,
            publicPort: port.PublicPort,
            type: port.Type,
          });
        }
      }

      networkContainers.push(containerInfo);
    }
  }

  // Output the information
  console.log(`Services in network "${networkName}":`);
  for (const service of networkContainers) {
    console.log(`- Service: ${service.name}`);
    if (service.ports.length > 0) {
      console.log("  Ports:");
      for (const port of service.ports) {
        console.log(
          `    - ${port.type.toUpperCase()}: ${port.publicPort} -> ${port.privatePort}`,
        );
      }
    } else {
      console.log("  No public ports exposed.");
    }
  }

  return networkContainers;
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
