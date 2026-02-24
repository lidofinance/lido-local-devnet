import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-onchain-mon`;

export const SERVICE_NAME = "Onchain Feeder/Forwarder";

export const SOURCE_ROOT = () =>
  process.env.ONCHAIN_MON_SOURCE_PATH?.trim() || "../onchain-mon";

export const getForwarderSource = (networkName: string) =>
  process.env.ONCHAIN_MON_FORWARDER_SOURCE?.trim() || `vroom-devnet-${networkName}`;

export const getForwarderConsumerType = () =>
  process.env.ONCHAIN_MON_FORWARDER_CONSUMER_TYPE?.trim() || "Discord";

export const getForwarderChannelId = () =>
  process.env.ONCHAIN_MON_FORWARDER_CHANNEL_ID?.trim() || "DevChannel";
