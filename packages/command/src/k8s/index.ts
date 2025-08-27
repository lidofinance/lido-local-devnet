import * as k8s from "@kubernetes/client-node";

import { DevNetRuntimeEnvironmentInterface } from "../runtime-env.js";

export async function getK8s() {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  kc.setCurrentContext(process.env.K8S_KUBECTL_DEFAULT_CONTEXT || "default");

  return kc;
}

export async function getServicesByRegExp(dre: DevNetRuntimeEnvironmentInterface, regex: RegExp) {
  const kc = await getK8s();
  const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

  const k8sNamespaceServices = await k8sCoreApi.listNamespacedService({
    namespace: `kt-${dre.network.name}`,
    limit: 1000,
  });

  return k8sNamespaceServices.items.filter((service) =>
    service.metadata?.name?.match(regex),
  );
}
