#!/usr/bin/env node
/*
 * Wrapper (Approach B): replay a forge dry-run broadcast plan, sending each tx
 * ourselves with a FIXED/floored gas_limit so every CREATE clears the EIP-7825
 * 16M execution cap and gets a non-zero EIP-8037 state_reservoir for code deposit.
 *
 * forge script can only scale per-tx gas by a single --gas-estimate-multiplier,
 * which cannot satisfy both small libs (need >16M) and big contracts (must stay
 * <150M block). This wrapper sets gas per-tx: gasLimit = clamp(planGas, FLOOR, CAP).
 *
 * Generate the plan first (NO --broadcast, WITH --sender <deployer> so CREATE
 * addresses are addr(deployer, realNonce), matching the replay):
 *   forge script <script>:<Contract> --sig="run(string)" --force \
 *     --rpc-url $RPC_URL --sender $DEPLOYER_ADDR -- $(git rev-parse HEAD)
 *   # → broadcast/<script>/<chainid>/dry-run/run-latest.json
 *
 * Then replay:
 *   RPC_URL=... DEPLOYER_PRIVATE_KEY=0x... [WINDOW=8] \
 *     node replay-forge-plan-fixedgas.cjs <run-latest.json> [floorGas] [capGas] [startIdx]
 *
 * WINDOW (env, default 1): how many txs to keep in flight at once. 1 = strictly
 * sequential (one tx per block). Higher pipelines submission so several mine per
 * block — bounded by the node txpool per-account limit and the block gas limit
 * (~floor(blockGas / gasLimit) txs/block). Each tx's status is still verified.
 *
 * Requires ethers v6 (run from a dir whose node_modules has it, e.g. cli-pod /app).
 * Tx execution order == nonce order, so dependencies + CREATE addresses are
 * preserved regardless of WINDOW. Do NOT let any other tx use the deployer
 * between the dry-run and this replay (would shift addr(deployer, nonce)).
 */
const fs = require("fs");
const { ethers } = require("ethers");

const planPath = process.argv[2];
const FLOOR = BigInt(process.argv[3] || "50000000");
const CAP = BigInt(process.argv[4] || "145000000");
const START = parseInt(process.argv[5] || "0", 10);
const WINDOW = Math.max(1, parseInt(process.env.WINDOW || "1", 10));

const RPC = process.env.RPC_URL;
const PK = process.env.DEPLOYER_PRIVATE_KEY;
if (!planPath || !RPC || !PK) {
  console.error("need <planPath> + env RPC_URL + DEPLOYER_PRIVATE_KEY");
  process.exit(2);
}

const ZERO = "0x0000000000000000000000000000000000000000";
const toBig = (v) => BigInt(v == null ? 0 : v);
const clamp = (g) => (g < FLOOR ? FLOOR : g > CAP ? CAP : g);

(async () => {
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const txs = plan.transactions || [];
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  let nonce = await provider.getTransactionCount(wallet.address, "latest");
  const fee = await provider.getFeeData();
  console.log(
    `plan=${planPath} txs=${txs.length} deployer=${wallet.address} startNonce=${nonce} ` +
      `floor=${FLOOR} cap=${CAP} startIdx=${START} window=${WINDOW} gasPrice=${fee.gasPrice}`,
  );

  const build = (entry, n) => {
    const t = entry.transaction || {};
    const to = t.to && t.to !== ZERO ? t.to : null; // null => CREATE
    const planGas = toBig(t.gas ?? t.gasLimit);
    // Floor EVERY tx (CREATE and CALL) to FLOOR. Not just CREATEs: some CALLs
    // (e.g. proxy__upgradeToAndCall initializers) internally deploy contracts,
    // so they ALSO need gas_limit > 16M for the EIP-8037 code-deposit reservoir.
    // forge's eth_estimateGas under-reports these on EIP-7825 chains, so trusting
    // its CALL estimate makes the internal CREATE OOG → the CALL reverts.
    const gasLimit = clamp(planGas);
    return {
      to: to ?? undefined,
      data: t.input ?? t.data ?? "0x",
      value: toBig(t.value),
      gasLimit,
      nonce: n,
      type: 0, // legacy (chain deploy used --legacy); gasPrice from node
      gasPrice: fee.gasPrice,
    };
  };

  for (let i = START; i < txs.length; i += WINDOW) {
    const chunk = txs.slice(i, i + WINDOW);
    // 1) enqueue the whole window (sequential nonces) without waiting for mining
    const inflight = [];
    for (let j = 0; j < chunk.length; j++) {
      const idx = i + j;
      const entry = chunk[j];
      const name = entry.contractName || entry.transactionType || "?";
      try {
        const resp = await wallet.sendTransaction(build(entry, nonce + j));
        inflight.push({ idx, entry, name, resp });
      } catch (e) {
        console.error(`\n❌ SEND ERROR at idx ${idx} (${name}): ${e.shortMessage || e.message}`);
        process.exit(1);
      }
    }
    // 2) await receipts in order, verify status
    for (const f of inflight) {
      let rec;
      try {
        rec = await f.resp.wait();
      } catch (e) {
        console.error(`\n❌ WAIT ERROR at idx ${f.idx} (${f.name}): ${e.shortMessage || e.message}`);
        process.exit(1);
      }
      const addr = rec.contractAddress || f.resp.to || "(call)";
      console.log(
        `[${f.idx + 1}/${txs.length}] ${f.entry.transactionType} ${f.name} -> ${addr} ` +
          `status=${rec.status} gasUsed=${rec.gasUsed}/${f.resp.gasLimit} tx=${f.resp.hash}`,
      );
      if (rec.status !== 1) {
        console.error(`\n❌ FAILED at idx ${f.idx} (${f.name}): status 0. Stop.`);
        process.exit(1);
      }
    }
    nonce += chunk.length;
  }
  console.log("\n✅ ALL TXS REPLAYED SUCCESSFULLY");
})();
