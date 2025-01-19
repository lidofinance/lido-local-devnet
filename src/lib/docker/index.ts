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
  try {
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
          // eslint-disable-next-line max-depth
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
  } catch (error: any) {
    console.error(`Error fetching network information: ${error.message}`);
    throw error;
  }
}

interface PublicPortInfo {
  publicPort: null | number;
  serviceName: null | string;
}
/**
 * Finds the public port and service name for a given private port and network.
 * 
 * @param privatePort - The private port of the service inside the container.
 * @param networkName - The name of the Docker network.
 * @returns An object containing the public port and service name, or null if not found.
 */
export async function getPublicPortAndService(privatePort: number, networkName: string): Promise<PublicPortInfo> {
  try {
    // Get the list of containers
    const containers = await docker.listContainers();

    for (const container of containers) {
      const containerInstance = docker.getContainer(container.Id);
      const containerDetails = await containerInstance.inspect();

      // Check if the container is connected to the specified network
      if (containerDetails.NetworkSettings.Networks[networkName]) {
        // Find the port mapping for the specified private port
        const mappedPort = container.Ports.find(
          (port) => port.PrivatePort === privatePort && port.PublicPort
        );

        if (mappedPort) {
          return {
            publicPort: mappedPort.PublicPort, // Return the public port if found
            serviceName: container.Names[0].replace("/", ""), // Get the service name
          };
        }
      }
    }

    // Return nulls if no matching port or service is found
    return { publicPort: null, serviceName: null };
  } catch (error:any) {
    console.error(`Error fetching public port and service: ${error.message}`);
    throw error;
  }
}
