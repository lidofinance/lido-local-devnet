# Adding NOR keys in a mature devnet (after `lido-core activate`)

## Symptom

`./bin/run.js lido-core add-keys --id N --name X` fails after the devnet has
been activated and DSM/EasyTrack rolled out. The lido-cli output shows three
fallbacks all reverting:

```
Direct call failed             → require(false)
Call from voting failed        → APP_AUTH_FAILED
Call from agent failed         → EVMCALLS_CALL_REVERTED
```

The wrapper still logs `✅ NOR keys added` because `./run.sh` exits 0 even
when all paths revert. KAPI confirms the keys are not on-chain
(`totalSigningKeys: 0` for the operator).

## Root cause

`lido-cli`'s `nor add-keys-from-file` always calls

```
NodeOperatorsRegistry.addSigningKeys(uint256,uint256,bytes,bytes)   // 0x096b7b35
```

which is the **admin** path. Its `auth(MANAGE_SIGNING_KEYS)` modifier resolves
to `aclCheck(msg.sender, role, [])` — the `how[]` array is empty, so
**parametric ACL grants do not help**. A grant of the form
`grantPermissionP(deployer, NOR, MANAGE_SIGNING_KEYS, [arg[0] EQ N])` looks
right but never applies, because NOR never passes `_nodeOperatorId` into the
ACL check.

After `lido-core activate` + `replace-dsm`, deployer has lost the
unconditional `MANAGE_SIGNING_KEYS_ROLE`, so the direct path fails. The voting
fallback fails because deployer lacks `CREATE_VOTES_ROLE` directly. The
TokenManager fallback fails inside the nested EVMScript for the same reason.

## Fix

Use the alternative method intended for the operator's reward address:

```
NodeOperatorsRegistry.addSigningKeysOperatorBH(uint256,uint256,bytes,bytes)   // 0x805911ae
```

This method's only check is `require(msg.sender == operator.rewardAddress)`,
no ACL involved. As long as the deployer (or whoever signs the tx) is the
operator's reward address, the call succeeds.

`lido-cli` does not expose this path — call it directly. The keys file at
`artifacts/<network>/lidoCLI/generated-keys/<name>.json` is an array of
deposit-data entries; concat the `pubkey` fields (48 B each) and `signature`
fields (96 B each) and send.

### Reference snippet

```sh
NOR=0x2AA77A8837ee41a2635307590Ee540248FBFE236   # NodeOperatorsRegistry
KEYSFILE=artifacts/<network>/lidoCLI/generated-keys/devnet_nor_<id>.json
PRIVKEY=<deployer-key>
EL_RPC=<execution-rpc>

# 100 keys per tx fits within 16M block gas limit (~12M actual).
# For 300 keys, run three batches: [0..100), [100..200), [200..300).
node -e '
  const arr = JSON.parse(require("fs").readFileSync("'$KEYSFILE'"));
  const slice = arr.slice(START, END);
  console.log("PUBKEYS=0x" + slice.map(k => k.pubkey).join(""));
  console.log("SIGS=0x"    + slice.map(k => k.signature).join(""));
'

cast send $NOR \
  'addSigningKeysOperatorBH(uint256,uint256,bytes,bytes)' \
  <opId> <count> "$PUBKEYS" "$SIGS" \
  --rpc-url $EL_RPC --private-key $PRIVKEY --gas-limit 15000000

# After all batches:
cast send $NOR 'setNodeOperatorStakingLimit(uint256,uint64)' <opId> <total> ...
```

## Verifying

- On-chain: `cast call $NOR 'getTotalSigningKeyCount(uint256)(uint256)' <opId>`
- KAPI: `GET <kapi>/v1/modules/1/operators/<opId>` — `totalSigningKeys` updates
  on the next sync (~30 s)

## When this comes up

- Adding a new NOR operator after `lido-core activate` in any mature stand
  (e.g. `srv3-cmv2-easytrack`).
- Pre-activate stands run `add-new-operator` while deployer still holds the
  unconditional role; that path stays the canonical one.
