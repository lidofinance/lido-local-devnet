#!/usr/bin/env node
/*
 * PoC wrapper (Approach B): replay a forge dry-run broadcast plan, sending each
 * tx ourselves with a FIXED/floored gas_limit so every CREATE clears the
 * EIP-7825 16M execution cap and gets a non-zero EIP-8037 state_reservoir for
 * code deposit.
 *
 * forge script can only scale per-tx gas by a single --gas-estimate-multiplier,
 * which cannot satisfy both small libs (need >16M) and CSModule (must stay
 * <150M block). This wrapper sets gas per-tx instead: gasLimit = clamp(planGas, FLOOR, CAP).
 *
 * Usage:  RPC_URL=... DEPLOYER_PRIVATE_KEY=0x... \
 *           node replay-fixedgas.js <forge-run-latest.json> [floorGas] [capGas] [startIdx]
 *
 * Requires ethers (run from a dir whose node_modules has ethers v6, e.g. /app).
 * The plan's CREATE addresses are addr(deployer, nonce); we replay the exact
 * sequence from the deployer's current nonce, so every baked address matches.
 * Do NOT let any other tx use the deployer between the dry-run and this replay.
 */
const fs = require("fs");
const { ethers } = require("ethers");

const planPath = process.argv[2];
const FLOOR = BigInt(process.argv[3] || "50000000");
const CAP = BigInt(process.argv[4] || "145000000");
const START = parseInt(process.argv[5] || "0", 10);

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
      `floor=${FLOOR} cap=${CAP} startIdx=${START} gasPrice=${fee.gasPrice}`,
  );

  for (let i = START; i < txs.length; i++) {
    const entry = txs[i];
    const t = entry.transaction || {};
    const name = entry.contractName || entry.transactionType || "?";
    const planGas = toBig(t.gas ?? t.gasLimit);
    const gasLimit = clamp(planGas);
    const to = t.to && t.to !== ZERO ? t.to : null; // null => CREATE
    const data = t.input ?? t.data ?? "0x";
    const value = toBig(t.value);

    const req = {
      to: to ?? undefined,
      data,
      value,
      gasLimit,
      nonce,
      type: 0, // legacy (chain deploy used --legacy); gasPrice from node
      gasPrice: fee.gasPrice,
    };

    try {
      const sent = await wallet.sendTransaction(req);
      const rec = await sent.wait();
      const addr = rec.contractAddress || to || "(call)";
      console.log(
        `[${i + 1}/${txs.length}] ${entry.transactionType} ${name} -> ${addr} ` +
          `status=${rec.status} gasUsed=${rec.gasUsed}/${gasLimit} tx=${sent.hash}`,
      );
      if (rec.status !== 1) {
        console.error(`\n❌ FAILED at idx ${i} (${name}): status 0. Stop.`);
        process.exit(1);
      }
      nonce++;
    } catch (e) {
      console.error(`\n❌ ERROR at idx ${i} (${name}): ${e.shortMessage || e.message}`);
      process.exit(1);
    }
  }
  console.log("\n✅ ALL TXS REPLAYED SUCCESSFULLY");
})();
