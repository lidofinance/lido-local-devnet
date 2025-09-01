import type { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import * as dotenv from "dotenv";

dotenv.config({ path: '.env' });

const DEFAULT_LIMIT = 1000;

export async function getK8s() {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  kc.setCurrentContext(process.env.K8S_KUBECTL_DEFAULT_CONTEXT || "default");

  return kc;
}

export async function pingCluster(): Promise<void> {
  const kc = await getK8s();
  const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
  try {
    await k8sCoreApi.listNamespace();
  } catch (error: unknown) {
    throw new DevNetError(`Unable to connect to the cluster.
      Ensure 'K8S_KUBECTL_DEFAULT_CONTEXT' env variable in '.env' is set.
      Original error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getK8sService = async (
  dre: DevNetRuntimeEnvironmentInterface,
  filter?: { label?: string, name?: RegExp | string },
  namespace: string = `kt-${dre.network.name}`,
) => {
  const kc = await getK8s();
  const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

  const labelSelector = filter?.label;
  const k8sNamespaceServices = await k8sCoreApi.listNamespacedService(
    {
      namespace,
      ...(labelSelector? { labelSelector } : {})
    },
  );

  return k8sNamespaceServices.items.filter((service) =>
    typeof filter?.name === "string"
      ? service.metadata?.name === filter?.name
      : filter?.name instanceof RegExp
        ? service.metadata?.name?.match(filter?.name)
        : true,
  );
}

export const getK8sIngress = async (
  dre: DevNetRuntimeEnvironmentInterface,
  filter?: { label?: string, name?: RegExp | string },
  namespace: string = `kt-${dre.network.name}`,
) => {
  const kc = await getK8s();
  const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);

  const labelSelector = filter?.label;
  const k8sNamespaceIngresses = await k8sNetworkApi.listNamespacedIngress(
    {
      namespace,
      ...(labelSelector? { labelSelector } : {})
    },
  );

  return k8sNamespaceIngresses.items.filter((ingress) =>
    typeof filter?.name === "string"
      ? ingress.metadata?.name === filter?.name
      : filter?.name instanceof RegExp
        ? ingress.metadata?.name?.match(filter?.name)
        : true,
  );
}

export const checkK8sIngressExists = async (
  dre: DevNetRuntimeEnvironmentInterface,
  filter?: { label?: string, name?: RegExp | string },
  namespace: string = `kt-${dre.network.name}`,
)=> {
  const k8sIngresses = await getK8sIngress(dre, filter, namespace);
  return k8sIngresses.length > 0;
}


export const checkK8sServiceExists = async (
  dre: DevNetRuntimeEnvironmentInterface,
  filter?: { label?: string, name?: RegExp | string },
  namespace: string = `kt-${dre.network.name}`,
)=> {
  const k8sServices = await getK8sService(dre, filter, namespace);
  return k8sServices.length > 0;
}

export const addPrefixToIngressHostname = (
  hostname: string,
) => {
  const GLOBAL_INGRESS_HOST_PREFIX = process.env.GLOBAL_INGRESS_HOST_PREFIX ?? 'prefix';

  return `${GLOBAL_INGRESS_HOST_PREFIX}-${hostname}`;
}
