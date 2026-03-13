import {
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  addPrefixToIngressHostname,
  createNamespaceIfNotExists,
  getNamespacedDeployedHelmReleases,
} from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import { execa } from "execa";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { KuboK8sBuild } from "./build.js";
import { NAMESPACE } from "./constants/kubo-k8s.constants.js";
import { kuboK8sExtension } from "./extensions/kubo-k8s.extension.js";

const DEFAULT_KUBO_SWARM_NODE_PORT = 32355;
const K8S_NODE_PORT_MIN = 30000;
const K8S_NODE_PORT_MAX = 32767;

type K8sServicePort = {
  name?: string;
  nodePort?: number;
};

type K8sService = {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: {
    ports?: K8sServicePort[];
  };
};

const getAllK8sServices = async (): Promise<K8sService[]> => {
  const { stdout } = await execa("kubectl", ["get", "svc", "-A", "-o", "json"]);
  return JSON.parse(stdout).items || [];
};

const getReleaseSwarmPorts = (
  services: K8sService[],
  namespace: string,
  release: string,
) => {
  const swarmService = services.find((service) =>
    service.metadata?.namespace === namespace &&
    service.metadata?.name === `${release}-swarm`
  );

  const tcpPort = swarmService?.spec?.ports?.find((port) => port.name === "swarm-tcp")?.nodePort;
  const udpPort = swarmService?.spec?.ports?.find((port) => port.name === "swarm-udp")?.nodePort;

  return {
    tcpPort: tcpPort ? String(tcpPort) : undefined,
    udpPort: udpPort ? String(udpPort) : undefined,
  };
};

const getUsedNodePorts = (services: K8sService[]) => {
  return new Set(
    services
      .flatMap((service) => service.spec?.ports || [])
      .map((port) => port.nodePort)
      .filter((port): port is number => Boolean(port)),
  );
};

const isPortOccupiedByAnotherRelease = (
  services: K8sService[],
  namespace: string,
  release: string,
  port: string | undefined,
) => {
  if (!port) {
    return false;
  }

  return services.some((service) =>
    !(service.metadata?.namespace === namespace && service.metadata?.name === `${release}-swarm`) &&
    service.spec?.ports?.some((servicePort) => String(servicePort.nodePort) === port)
  );
};

const pickFreeNodePort = (usedPorts: Set<number>, preferredPort: number) => {
  for (let candidate = preferredPort; candidate <= K8S_NODE_PORT_MAX; candidate++) {
    if (!usedPorts.has(candidate)) {
      return String(candidate);
    }
  }

  for (let candidate = K8S_NODE_PORT_MIN; candidate < preferredPort; candidate++) {
    if (!usedPorts.has(candidate)) {
      return String(candidate);
    }
  }

  throw new DevNetError("No free NodePort available for Kubo swarm service");
};

export const KuboK8sUp = command.cli({
  description: "Start Kubo on K8s with Helm",
  params: {},
  extensions: [kuboK8sExtension],
  async handler({ dre, dre: { state, services: { kubo }, logger } }) {
    await kubo.applyWorkspace();

    const isRunning = await state.isKuboK8sRunning();
    if (isRunning) {
      logger.log("Kubo already running, applying upgrade");
    }

    await dre.runCommand(KuboK8sBuild, {});

    if (!(await state.isKuboK8sImageReady())) {
      throw new DevNetError("KUBO image is not ready");
    }

    const { image, tag, registryHostname } = await state.getKuboK8sImage();

    const env: Record<string, string> = {
      ...kubo.config.constants,

      CHAIN: "artifact",
    };

    const kuboHostname = process.env.KUBO_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!kuboHostname) {
      throw new DevNetError(`KUBO_INGRESS_HOSTNAME env variable is not set`);
    }

    const KUBO_INGRESS_HOSTNAME = addPrefixToIngressHostname(kuboHostname);
    const HELM_RELEASE = 'lido-kubo-1';
    const namespace = NAMESPACE(dre);
    let KUBO_SWARM_EXTERNAL_TCP_PORT = process.env.KUBO_SWARM_EXTERNAL_TCP_PORT;
    let KUBO_SWARM_EXTERNAL_UDP_PORT = process.env.KUBO_SWARM_EXTERNAL_UDP_PORT;

    try {
      const services = await getAllK8sServices();
      const existingPorts = getReleaseSwarmPorts(services, namespace, HELM_RELEASE);

      if (isPortOccupiedByAnotherRelease(services, namespace, HELM_RELEASE, KUBO_SWARM_EXTERNAL_TCP_PORT)) {
        logger.log(`Requested Kubo TCP nodePort ${KUBO_SWARM_EXTERNAL_TCP_PORT} is already occupied, selecting a free port`);
        KUBO_SWARM_EXTERNAL_TCP_PORT = undefined;
      }

      if (isPortOccupiedByAnotherRelease(services, namespace, HELM_RELEASE, KUBO_SWARM_EXTERNAL_UDP_PORT)) {
        logger.log(`Requested Kubo UDP nodePort ${KUBO_SWARM_EXTERNAL_UDP_PORT} is already occupied, selecting a free port`);
        KUBO_SWARM_EXTERNAL_UDP_PORT = undefined;
      }

      KUBO_SWARM_EXTERNAL_TCP_PORT ||= existingPorts.tcpPort;
      KUBO_SWARM_EXTERNAL_UDP_PORT ||= existingPorts.udpPort;

      if (!KUBO_SWARM_EXTERNAL_TCP_PORT || !KUBO_SWARM_EXTERNAL_UDP_PORT) {
        const nextFreePort = pickFreeNodePort(
          getUsedNodePorts(services),
          DEFAULT_KUBO_SWARM_NODE_PORT,
        );

        KUBO_SWARM_EXTERNAL_TCP_PORT ||= nextFreePort;
        KUBO_SWARM_EXTERNAL_UDP_PORT ||= nextFreePort;

        logger.log(`Selected free Kubo swarm nodePort: ${nextFreePort}`);
      }
    } catch {
      KUBO_SWARM_EXTERNAL_TCP_PORT ||= String(DEFAULT_KUBO_SWARM_NODE_PORT);
      KUBO_SWARM_EXTERNAL_UDP_PORT ||= KUBO_SWARM_EXTERNAL_TCP_PORT;
    }

    KUBO_SWARM_EXTERNAL_TCP_PORT ||= String(DEFAULT_KUBO_SWARM_NODE_PORT);
    KUBO_SWARM_EXTERNAL_UDP_PORT ||= KUBO_SWARM_EXTERNAL_TCP_PORT;

    let KUBO_SWARM_EXTERNAL_HOST = process.env.KUBO_SWARM_EXTERNAL_HOST || "";
    if (!KUBO_SWARM_EXTERNAL_HOST) {
      try {
        const { stdout } = await execa("kubectl", ["get", "nodes", "-o", "json"]);
        const nodes = JSON.parse(stdout).items || [];
        const addresses = nodes[0]?.status?.addresses || [];
        type K8sNodeAddress = { address?: string; type?: string };
        KUBO_SWARM_EXTERNAL_HOST =
          addresses.find((address: K8sNodeAddress) => address.type === "ExternalIP")?.address ||
          addresses.find((address: K8sNodeAddress) => address.type === "InternalIP")?.address ||
          "";
      } catch {
        // Keep empty host if k8s API is unavailable, chart will skip announce setup.
      }
    }

    if (!KUBO_SWARM_EXTERNAL_HOST) {
      logger.log("KUBO_SWARM_EXTERNAL_HOST is empty, Kubo will not advertise public swarm addresses");
    }

    const swarmTcpMultiaddr = KUBO_SWARM_EXTERNAL_HOST
      ? `/ip4/${KUBO_SWARM_EXTERNAL_HOST}/tcp/${KUBO_SWARM_EXTERNAL_TCP_PORT}`
      : "";
    const swarmUdpMultiaddr = KUBO_SWARM_EXTERNAL_HOST
      ? `/ip4/${KUBO_SWARM_EXTERNAL_HOST}/udp/${KUBO_SWARM_EXTERNAL_UDP_PORT}/quic-v1`
      : "";

    const helmLidoKuboSh = kubo.sh({
      env: {
        ...env,
        NAMESPACE: namespace,
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        KUBO_INGRESS_HOSTNAME,
        KUBO_SWARM_EXTERNAL_HOST,
        KUBO_SWARM_EXTERNAL_TCP_PORT,
        KUBO_SWARM_EXTERNAL_UDP_PORT,
      },
    });

    await createNamespaceIfNotExists(namespace);

    const deployedHelmReleases = await getNamespacedDeployedHelmReleases(namespace);
    const isReleaseInstalled = deployedHelmReleases.includes(HELM_RELEASE);
    const shouldUpgrade = isRunning || isReleaseInstalled;

    if (isReleaseInstalled && !isRunning) {
      logger.log(`Helm release ${HELM_RELEASE} already exists, using upgrade mode`);
    }

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace });

    await helmLidoKuboSh`make debug`;
    await helmLidoKuboSh`make lint`;
    await (shouldUpgrade ? helmLidoKuboSh`make upgrade` : helmLidoKuboSh`make install`);

    await state.updateKuboK8sRunning({
      helmRelease: HELM_RELEASE,
      publicUrl: `http://${KUBO_INGRESS_HOSTNAME}`,
      privateUrl: `http://${HELM_RELEASE}.${namespace}.svc.cluster.local:5001`,
      swarmExternalHost: KUBO_SWARM_EXTERNAL_HOST || undefined,
      swarmTcpPort: KUBO_SWARM_EXTERNAL_TCP_PORT,
      swarmUdpPort: KUBO_SWARM_EXTERNAL_UDP_PORT,
      swarmTcpMultiaddr: swarmTcpMultiaddr || undefined,
      swarmUdpMultiaddr: swarmUdpMultiaddr || undefined,
    });

    if (swarmTcpMultiaddr || swarmUdpMultiaddr) {
      logger.log(`Kubo swarm advertised addresses: ${swarmTcpMultiaddr} ${swarmUdpMultiaddr}`.trim());
    }
  },
});
