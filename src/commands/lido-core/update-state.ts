import { command } from "@devnet/command";
import fs from "node:fs/promises";
import path from "node:path";

type DevnetState = {
  deployedAt?: string;
};

type UpdatableState = {
  artifactsRoot: string;
  updateProperties: (key: string, value: Record<string, unknown>) => Promise<void>;
};

const readDevnetState = async (artifactsRoot: string): Promise<DevnetState> => {
  try {
    const statePath = path.join(artifactsRoot, "state.json");
    const raw = await fs.readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as { devnet?: DevnetState };
    return parsed.devnet ?? {};
  } catch {
    return {};
  }
};

export const LidoCoreUpdateState = command.cli({
  description:
    "Reads the network state file for lido-core and updates the JSON database accordingly.",
  params: {},
  async handler({ dre }) {
    const { state, services, network } = dre;
    const { lidoCore } = services;
    const existingDevnetState = await readDevnetState(state.artifactsRoot);

    const { deployer } = await state.getNamedWallet();
    const { elPublic, clPublic } = await state.getChain();

    const networkStateFile = lidoCore.config.constants.NETWORK_STATE_FILE;
    const jsonData = await lidoCore.readJson(networkStateFile);
    const burnerProxy =
      jsonData?.burner?.proxy?.address ??
      jsonData?.burner?.proxyAddress ??
      jsonData?.burner?.address;

    await state.updateLido(jsonData);

    const deployedAt = existingDevnetState.deployedAt ?? new Date().toISOString();

    if (deployedAt) {
      await (state as unknown as UpdatableState).updateProperties("devnet", {
        ...existingDevnetState,
        deployedAt,
      });
    }

    const { lidoCLI } = services;

    const {
      config: { constants: lidoCLIConstants },
    } = lidoCLI;

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_PATH,
      jsonData,
    );

    const chainId = await network.getChainId();

    const lidoCliEnv = {
      PRIVATE_KEY: deployer.privateKey,
      DEPLOYED: lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_NAME,
      EL_CHAIN_ID: chainId,
      EL_NETWORK_NAME: "local-devnet",
      EL_API_PROVIDER: elPublic,
      CL_API_PROVIDER: clPublic,
      KEYS_API_PROVIDER: "https://keys-api.testnet.fi",
    };

    await lidoCLI.writeENV(lidoCLIConstants.ENV_CONFIG_PATH, lidoCliEnv);

    const lidoCliExtraDevnetConfig = burnerProxy
      ? { burner: burnerProxy }
      : {};

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH,
      lidoCliExtraDevnetConfig,
    );
  },
});
