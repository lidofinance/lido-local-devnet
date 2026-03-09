import { Params, command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";

import { ChainExternalUp } from "./external-up.js";
import { ChainKurtosisUp } from "./kurtosis-up.js";
import { ChainSelfHostedUp } from "./self-hosted-up.js";
import { ChainValidatorUp } from "./validator-up.js";

export const ChainUp = command.isomorphic({
  description:
    "Starts the chain. Routes to kurtosis/self-hosted/external based on mode.",
  params: {
    mode: Params.string({ description: "Chain mode: kurtosis | self-hosted | external" }),
    preset: Params.string({ description: "Kurtosis config name (kurtosis mode only)." }),
    elUrl: Params.string({ description: "EL RPC endpoint URL (external mode)." }),
    clUrl: Params.string({ description: "CL HTTP endpoint URL (external mode)." }),
    elWsUrl: Params.string({ description: "EL WebSocket endpoint URL (external mode)." }),
    elClientType: Params.string({ description: "EL client type (external mode)." }),
    elClient: Params.string({ description: "EL client: geth | reth (self-hosted mode)." }),
    clClient: Params.string({ description: "CL client: lighthouse | teku | prysm (self-hosted mode)." }),
    network: Params.string({ description: "Target network name (self-hosted mode)." }),
    elImage: Params.string({ description: "Custom EL Docker image (self-hosted mode)." }),
    clImage: Params.string({ description: "Custom CL Docker image (self-hosted mode)." }),
    genesisSSZUrl: Params.string({ description: "URL to download genesis.ssz (self-hosted mode)." }),
    vcClient: Params.string({ description: "Validator client: lighthouse | teku | prysm (self-hosted mode)." }),
    vcImage: Params.string({ description: "Custom validator Docker image (self-hosted mode)." }),
    ingress: Params.boolean({ description: "Enable ingress for node APIs (self-hosted mode).", default: false }),
  },
  async handler({ dre, dre: { state }, params }) {
    const chainMode = params.mode ?? (await state.getChainMode());

    switch (chainMode) {
      case "kurtosis": {
        await dre.runCommand(ChainKurtosisUp, { preset: params.preset ?? '' });
        break;
      }

      case "self-hosted": {
        await dre.runCommand(ChainSelfHostedUp, {
          elClient: params.elClient ?? "geth",
          clClient: params.clClient ?? "lighthouse",
          network: params.network ?? '',
          checkpointSyncUrl: undefined,
          elImage: params.elImage,
          clImage: params.clImage,
          genesisSSZUrl: params.genesisSSZUrl,
          ingress: params.ingress,
        });

        // Deploy validator client if vcClient is specified
        if (params.vcClient) {
          await dre.runCommand(ChainValidatorUp, {
            vcClient: params.vcClient,
            vcImage: params.vcImage,
            feeRecipient: undefined,
            graffiti: "lido-devnet",
            ingress: params.ingress,
          });
        }

        break;
      }

      case "external": {
        await dre.runCommand(ChainExternalUp, {
          elUrl: params.elUrl ?? '',
          clUrl: params.clUrl ?? '',
          elWsUrl: params.elWsUrl,
          elClientType: params.elClientType,
        });
        break;
      }

      default: {
        throw new DevNetError(`Unknown chain mode: ${chainMode}. Use kurtosis, self-hosted, or external.`);
      }
    }
  },
});
