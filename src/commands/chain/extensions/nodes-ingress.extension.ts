import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getNodesIngress<M extends boolean = true>(must?: M,): Promise<M extends true ? NodesIngressOptions : Partial<NodesIngressOptions>>;
    updateNodesIngress(options: NodesIngressOptions): Promise<void>;
  }

  export interface Config {
    nodesIngress: NodesIngressOptions;
  }
}

export const NodesIngressOptions = z.object({
  el: z.object({
    publicIngressUrl: z.string().url(),
  }),
  cl: z.object({
    publicIngressUrl: z.string().url(),
  }),
  vc: z.object({
    publicIngressUrl: z.string().url(),
  }),
});

export type NodesIngressOptions = z.infer<typeof NodesIngressOptions>;

export const nodesIngressExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateNodesIngress = (async function (jsonData: NodesIngressOptions) {
    await dre.state.updateProperties("nodesIngress", jsonData);
  });

  dre.state.getNodesIngress = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "nodesIngress",
      "nodesIngress",
      NodesIngressOptions,
      must,
    );
  });
};
