import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

export const doraIngressTmpl =  async (
  dre: DevNetRuntimeEnvironmentInterface
) => ({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: "dora-devnet-ingress",
      namespace: `kt-${dre.network.name}`,
      annotations: {
        "traefik.ingress.kubernetes.io/router.entrypoints": "web",
      },
      labels: {
        "com.lido.devnet": "true",
        "kurtosis_enclave_uuid": "dd228369dff74436b4d34de541ee5105",
        "kurtosistech.com/app-id": "kurtosis",
        "kurtosistech.com/enclave-id": "dd228369dff74436b4d34de541ee5105",
        "kurtosistech.com/guid": "769d6d4a4cd44bc39c649ba7774b2ec1",
        "kurtosistech.com/id": "dora",
        "kurtosistech.com/resource-type": "user-service",
      },
    },
    spec: {
      ingressClassName: "public",
      rules: [
        {
          host: "hr6vb81d1ndsx-dora.fusaka-devnet.valset-02.testnet.fi",
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: "dora",
                    port: {
                      number: 8080,
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
