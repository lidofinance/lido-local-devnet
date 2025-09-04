import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getLido<M extends boolean = true>(must?: M,): Promise<M extends true ? LidoCoreState : Partial<LidoCoreState>>;
    isLidoDeployed(): Promise<boolean>;
    removeLido(): Promise<void>;
    updateLido(state: LidoCoreState): Promise<void>;
  }

  export interface Config {
    lidoCore: LidoCoreState;
  }
}


export const LidoCoreState = z.object({
  accountingOracle: z.string(),
  agent: z.string(),
  locator: z.string(),
  sanityChecker: z.string(),
  tokenManager: z.string(),
  validatorExitBus: z.string(),
  voting: z.string(),
  treasury: z.string(),
  withdrawalVault: z.string(),
  stakingRouter: z.string(),
  curatedModule: z.string(),
  acl: z.string(),
  oracleDaemonConfig: z.string(),
  withdrawalQueue: z.string(),
  finance: z.string(),

  withdrawalVaultImpl: z.string(),
  withdrawalQueueImpl: z.string(),
  validatorExitBusImpl: z.string(),
});

export type LidoCoreState = z.infer<typeof LidoCoreState>;

export const lidoCoreExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateLido = (async function (state: LidoCoreState) {
    await this.updateProperties("lidoCore", state);
  });

  dre.state.removeLido = (async function () {
    await dre.state.updateProperties("lidoCore", {});
  });

  dre.state.isLidoDeployed = (async function () {
    const state = await dre.state.getLido(false);
    return state && !isEmptyObject(state);
  });

  dre.state.getLido = (async function<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        accountingOracle: "lidoCore.accountingOracle.proxy.address",
        agent: "lidoCore.app:aragon-agent.proxy.address",
        locator: "lidoCore.lidoLocator.proxy.address",
        sanityChecker: "lidoCore.oracleReportSanityChecker.address",
        tokenManager: "lidoCore.app:aragon-token-manager.proxy.address",
        validatorExitBus: "lidoCore.validatorsExitBusOracle.proxy.address",
        voting: "lidoCore.app:aragon-voting.proxy.address",
        treasury:
          "lidoCore.withdrawalVault.implementation.constructorArgs.1",

        stakingRouter: "lidoCore.stakingRouter.proxy.address",
        curatedModule: "lidoCore.app:node-operators-registry.proxy.address",
        acl: "lidoCore.aragon-acl.proxy.address",
        oracleDaemonConfig: "lidoCore.oracleDaemonConfig.address",
        withdrawalVault: "lidoCore.withdrawalVault.proxy.address",
        withdrawalQueue: "lidoCore.withdrawalQueueERC721.proxy.address",
        withdrawalVaultImpl: "lidoCore.withdrawalVault.implementation.address",
        validatorExitBusImpl: "lidoCore.validatorsExitBusOracle.implementation.address",
        withdrawalQueueImpl: "lidoCore.withdrawalQueueERC721.implementation.address",
        finance: "lidoCore.app:aragon-finance.proxy.address"
      },
      "lidoCore",
      LidoCoreState,
      must,
    );
  })
};
