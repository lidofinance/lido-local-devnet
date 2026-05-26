import { Params, command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";

export const ChainExternalUp = command.isomorphic({
  description:
    "Attaches to existing external EL/CL nodes without launching anything.",
  params: {
    elUrl: Params.string({ description: "EL RPC endpoint URL (required)." }),
    clUrl: Params.string({ description: "CL HTTP endpoint URL (required)." }),
    elWsUrl: Params.string({ description: "EL WebSocket endpoint URL (optional)." }),
    elClientType: Params.string({ description: "EL client type, e.g. geth, reth (optional)." }),
  },
  async handler({ dre: { logger, state }, params: { elUrl, clUrl, elWsUrl, elClientType } }) {
    if (!elUrl) {
      throw new DevNetError("elUrl is required for external mode. Provide --el-url.");
    }
    if (!clUrl) {
      throw new DevNetError("clUrl is required for external mode. Provide --cl-url.");
    }

    logger.log(`Health-checking EL at ${elUrl}...`);
    await healthCheckEL(elUrl);
    logger.log("EL is reachable.");

    logger.log(`Health-checking CL at ${clUrl}...`);
    await healthCheckCL(clUrl);
    logger.log("CL is reachable.");

    await state.updateChain({
      elPrivate: elUrl,
      elPublic: elUrl,
      clPrivate: clUrl,
      clPublic: clUrl,
      elWsPrivate: elWsUrl ?? elUrl,
      elWsPublic: elWsUrl ?? elUrl,
      elClientType: elClientType ?? "unknown",
    });

    await state.updateChainMode("external");

    logger.log("Chain configured in external mode.");
    logger.log(`  EL: ${elUrl}`);
    logger.log(`  CL: ${clUrl}`);
    if (elWsUrl) logger.log(`  EL WS: ${elWsUrl}`);
  },
});

async function healthCheckEL(url: string): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new DevNetError(`EL health check failed: HTTP ${response.status} at ${url}`);
  }

  const json = await response.json() as { result?: string; error?: unknown };
  if (json.error) {
    throw new DevNetError(`EL health check failed: ${JSON.stringify(json.error)}`);
  }
}

async function healthCheckCL(url: string): Promise<void> {
  const response = await fetch(`${url}/eth/v1/beacon/genesis`);

  if (!response.ok) {
    throw new DevNetError(`CL health check failed: HTTP ${response.status} at ${url}`);
  }
}
