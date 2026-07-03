// chain goal: finalizing, not optimistic, healthy peer count. Beacon REST only.

import type { ChainResult, StateJson } from "../types.js";

import { getJSON } from "../io.js";

export async function checkChain(s: StateJson): Promise<ChainResult> {
  const cl = s.chain?.clPublic;
  if (!cl) return { finalizing: null, missing: "chain.clPublic", pass: false };

  const [fin, syncing, peers, header] = await Promise.all([
    getJSON(`${cl}/eth/v1/beacon/states/head/finality_checkpoints`),
    getJSON(`${cl}/eth/v1/node/syncing`),
    getJSON(`${cl}/eth/v1/node/peer_count`),
    getJSON(`${cl}/eth/v1/beacon/headers/head`),
  ]);

  const finData = (fin.body as { data?: { finalized?: { epoch?: string } } } | null)?.data;
  const syncData = (syncing.body as { data?: { is_optimistic?: boolean } } | null)?.data;
  const peerData = (peers.body as { data?: { connected?: string } } | null)?.data;
  const headData = (header.body as { data?: { header?: { message?: { slot?: string } } } } | null)?.data;

  return {
    finalizedEpoch: Number(finData?.finalized?.epoch ?? -1),
    finalizing: null, // set by the entry via snapshot diff
    headSlot: Number(headData?.header?.message?.slot ?? -1),
    isOptimistic: Boolean(syncData?.is_optimistic),
    pass: null,
    peers: Number(peerData?.connected ?? 0),
  };
}
