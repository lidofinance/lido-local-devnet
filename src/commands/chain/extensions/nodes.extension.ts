import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getNodes<M extends boolean = true>(must?: M,): Promise<M extends true ? NodesState : Partial<NodesState>>;
    updateNodes(options: NodesState): Promise<void>;
  }

  export interface Config {
    nodes: NodesState;
  }
}

export const NodesState = z.object({
  el: z.array(
    z.object({
      clientType: z.string(),
      k8sService: z.string(),
      rpcPort: z.number(),
      wsPort: z.number(),
    })
  ).nonempty(),
  cl: z.array(
    z.object({
      clientType: z.string(),
      k8sService: z.string(),
      httpPort: z.number(),
    }),
  ).nonempty(),
  vc: z.array(
    z.object({
      clientType: z.string(),
      k8sService: z.string(),
      httpValidatorPort: z.number(),
    }),
  ).nonempty(),
});

export type NodesState = z.infer<typeof NodesState>;

export const nodesExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateNodes = (async function (state: NodesState) {
    await dre.state.updateProperties("nodes", state);
  });

  dre.state.getNodes = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "nodes",
      "nodes",
      NodesState,
      must,
    );
  });
};
