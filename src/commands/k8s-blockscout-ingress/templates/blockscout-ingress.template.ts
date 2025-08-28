import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

export const blockscoutIngressTmpl =  async (
  dre: DevNetRuntimeEnvironmentInterface
) => ({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: "blockscout-devnet-ingress",
      namespace: `kt-${dre.network.name}`,
      annotations: {
        "traefik.ingress.kubernetes.io/router.entrypoints": "web",
      },
      labels: {
        "com.lido.devnet": "true",
      },
    },
    spec: {
      ingressClassName: "public",
      rules: [
        {
          host: `${process.env.SECRET_INGRESS_HOST_PREFIX}-blockscout.fusaka-devnet.valset-02.testnet.fi`,
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: "blockscout-frontend",
                    port: {
                      number: 3000,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  } satisfies k8s.V1Ingress);
