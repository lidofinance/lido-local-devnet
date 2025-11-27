import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getNodesIngress<M extends boolean = true>(must?: M,): Promise<M extends true ? NodesIngressState : Partial<NodesIngressState>>;
    updateNodesIngress(options: NodesIngressState): Promise<void>;
  }

  export interface Config {
    nodesIngress: NodesIngressState;
  }
}

export const NodesIngressState = z.object({
  el: z.array(z.object({
    publicIngressUrl: z.string().url(),
  })).nonempty(),
  cl: z.array(z.object({
    publicIngressUrl: z.string().url(),
  })).nonempty(),
  vc: z.array(z.object({
    publicIngressUrl: z.string().url(),
  })).nonempty(),
});

export type NodesIngressState = z.infer<typeof NodesIngressState>;

export const nodesIngressExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateNodesIngress = (async function (jsonData: NodesIngressState) {
    await dre.state.updateProperties("nodesIngress", jsonData);
  });

  dre.state.getNodesIngress = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "nodesIngress",
      "nodesIngress",
      NodesIngressState,
      must,
    );
  });
};
