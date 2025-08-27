// import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { Config, StateInterface } from "@devnet/state";
// import { z } from "zod";
//
// // augmenting DevNetRuntimeEnvironmentInterface
// declare module "@devnet/command" {
//   export interface DevNetRuntimeEnvironmentInterface {
//
//   }
// }
//
// // augmenting the StateInterface
// declare module "@devnet/state" {
//   export interface StateInterface {
//     getChain<M extends boolean = true>(must?: M,): Promise<M extends true ? ChainState : Partial<ChainState>>;
//     updateChain(options: ChainState): Promise<void>;
//   }
//
//   export interface Config {
//     chain: ChainState;
//   }
// }
//
// export const ChainState = z.object({
//   el: z.object({
//     service: z.string(),
//     rpcPort: z.number(),
//     wsPort: z.number(),
//   }),
//   cl: z.object({
//     service: z.string(),
//     httpPort: z.number(),
//   }),
//   vc: z.object({
//     service: z.string(),
//     httpValidatorPort: z.number(),
//   }),
// });
//
// export type ChainState = z.infer<typeof ChainState>;
//
// export const chainExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
//   dre.state.updateNodes = (async function (state: ChainState) {
//     await dre.state.updateProperties("chain", state);
//   });
//
//   dre.state.getChain = (async function <M extends boolean = true>(must: M = true as M) {
//     return dre.state.getProperties(
//       "chain",
//       "chain",
//       ChainState,
//       must,
//     );
//   });
// };
