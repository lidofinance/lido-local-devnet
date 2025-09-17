import type { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import * as dotenv from "dotenv";

dotenv.config({ path: '.env' });

const DEFAULT_LIMIT = 1000;

export async function getK8s() {
  if (!process.env.K8S_KUBECTL_DEFAULT_CONTEXT) {
    throw new DevNetError(`Unable to connect to the k8s cluster.
      Ensure 'K8S_KUBECTL_DEFAULT_CONTEXT' env variable in '.env' is set.`);
  }

  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  kc.setCurrentContext(process.env.K8S_KUBECTL_DEFAULT_CONTEXT);

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
  filter?: { label?: Record<string, string> | string, name?: RegExp | string },
  namespace: string = `kt-${dre.network.name}`,
) => {
  const kc = await getK8s();
  const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);

  const labelSelector = filter?.label;

  const formattedLabelSelector = typeof labelSelector === 'string'
    ? labelSelector
    : typeof labelSelector === 'object'
      ? toLabelSelector(labelSelector) : undefined;

  const k8sNamespaceIngresses = await k8sNetworkApi.listNamespacedIngress(
    {
      namespace,
      ...(formattedLabelSelector ? { labelSelector: formattedLabelSelector } : {})
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

export const toLabelSelector = (label: Record<string, string>) =>
  Object.entries(label).map(([k, v]) => `${k}=${v}`).join(',');

export const deleteNamespace = async (name: string) => {
  const kc = await getK8s();
  const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

  const namespaces = await k8sCoreApi.listNamespace({ limit: DEFAULT_LIMIT });

  if (namespaces.items.map(n => n.metadata?.name).includes(name)) {
    await k8sCoreApi.deleteNamespace({ name, propagationPolicy: "Background" });
  }
}

export const deleteNamespacedPersistentVolumeClaimIfExists = async (
  namespace: string,
  name: string
) => {
  const kc = await getK8s();
  const k8sStorageApi = kc.makeApiClient(k8s.CoreV1Api);

  const pvcs = await k8sStorageApi.listNamespacedPersistentVolumeClaim({
    namespace,
    limit: DEFAULT_LIMIT,
  });

  if (pvcs.items.map((pvc) => pvc.metadata?.name).includes(name)) {
    await k8sStorageApi.deleteNamespacedPersistentVolumeClaim({
      namespace,
      name,
    });
  }
}

export const getNamespacedDeployedHelmReleases = async (namespace: string) => {
  const kc = await getK8s();
  const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);

  const deployments = await k8sAppsApi.listNamespacedDeployment({ namespace, limit: DEFAULT_LIMIT });

  const helmReleases = (
      deployments.items?.map(
        (deployment) =>
          deployment.metadata?.annotations?.["meta.helm.sh/release-name"],
      ) ?? []
    ).filter((x) => typeof x === "string");

  return helmReleases;
}

export const createNamespaceIfNotExists = async (name: string) => {
  // TODO more better way to check if namespace exists
  try {
    const kc = await getK8s();
    const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    await k8sCoreApi.createNamespace({ body: { metadata: { name } } });
  } catch {}
}
