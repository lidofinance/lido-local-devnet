import { command } from "@devnet/command";
import {
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
  keccak256,
  toUtf8Bytes,
} from "ethers";

import { lidoCoreExtension } from "../lido-core/extensions/lido-core.extension.js";
import { dualGovernanceExtension } from "./extensions/dual-governance.extension.js";

const SPEC_ID = "0x00000001";

const encodeCallScript = (
  calls: { data: string; to: string }[],
): string => {
  let result = SPEC_ID;
  for (const call of calls) {
    const target = call.to.replace(/^0x/, "").toLowerCase().padStart(40, "0");
    const dataHex = call.data.replace(/^0x/, "");
    const dataLen = (dataHex.length / 2).toString(16).padStart(8, "0");
    result += target + dataLen + dataHex;
  }

  return result;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const aclIface = new Interface([
  "function grantPermission(address _entity, address _app, bytes32 _role)",
  "function getPermissionManager(address _app, bytes32 _role) view returns (address)",
  "function hasPermission(address _who, address _where, bytes32 _what) view returns (bool)",
]);

const tmIface = new Interface([
  "function forward(bytes _evmScript)",
]);

const votingIface = new Interface([
  "function newVote(bytes _executionScript, string _metadata, bool _castVote, bool _executesIfDecided) returns (uint256 voteId)",
  "function vote(uint256 _voteId, bool _supports, bool _executesIfDecided)",
  "function canExecute(uint256 _voteId) view returns (bool)",
  "function executeVote(uint256 _voteId)",
  "function voteTime() view returns (uint64)",
  "function getVote(uint256 _voteId) view returns (bool open, bool executed, uint64 startDate, uint64 snapshotBlock, uint64 supportRequired, uint64 minAcceptQuorum, uint256 yea, uint256 nay, uint256 votingPower, bytes script, uint8 phase)",
  "event StartVote(uint256 indexed voteId, address indexed creator, string metadata)",
]);

export const DGHandover = command.cli({
  description:
    "Grants Agent.RUN_SCRIPT_ROLE to DG AdminExecutor via Aragon Voting — minimal DG handover for devnet (allows DG to forward proposals through Agent).",
  params: {},
  extensions: [dualGovernanceExtension, lidoCoreExtension],
  async handler({ dre, dre: { logger } }) {
    const { state, network } = dre;

    if (!(await state.isDualGovernanceDeployed())) {
      throw new Error(
        "Dual Governance is not deployed yet. Run `dg deploy` first.",
      );
    }

    if (!(await state.isLidoActivated())) {
      throw new Error(
        "Lido is not activated yet. Run `lido-core activate` first.",
      );
    }

    const dgState = await state.getDualGovernance();
    const { voting, agent, acl, tokenManager } = await state.getLido();
    const { elPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();

    await network.waitEL();

    const provider = new JsonRpcProvider(elPublic);
    const wallet = new Wallet(deployer.privateKey, provider);

    const aclContract = new Contract(acl, aclIface, wallet);
    const tmContract = new Contract(tokenManager, tmIface, wallet);
    const votingContract = new Contract(voting, votingIface, wallet);

    const RUN_SCRIPT_ROLE = keccak256(toUtf8Bytes("RUN_SCRIPT_ROLE"));

    // Idempotency: skip if already granted.
    const already: boolean = await aclContract.hasPermission(
      dgState.adminExecutor,
      agent,
      RUN_SCRIPT_ROLE,
    );
    if (already) {
      logger.log(
        `AdminExecutor ${dgState.adminExecutor} already has RUN_SCRIPT_ROLE on Agent ${agent}. Handover already done.`,
      );
      return;
    }

    const permissionManager: string = await aclContract.getPermissionManager(
      agent,
      RUN_SCRIPT_ROLE,
    );
    logger.log(
      `RUN_SCRIPT_ROLE manager on Agent: ${permissionManager} (expecting Voting ${voting})`,
    );

    if (permissionManager.toLowerCase() !== voting.toLowerCase()) {
      throw new Error(
        `RUN_SCRIPT_ROLE manager on Agent is ${permissionManager}, expected Voting ${voting}. Handover path via Voting won't work; manual intervention needed.`,
      );
    }

    // Build the inner script that the vote will execute on success.
    const grantData = aclIface.encodeFunctionData("grantPermission", [
      dgState.adminExecutor,
      agent,
      RUN_SCRIPT_ROLE,
    ]);
    const innerScript = encodeCallScript([{ to: acl, data: grantData }]);
    const description =
      "DG handover: grant RUN_SCRIPT_ROLE on Aragon Agent to DG AdminExecutor";

    // Outer script: TokenManager.forward -> Voting.newVote(innerScript, description, castVote=false, ...).
    const newVoteData = votingIface.encodeFunctionData("newVote", [
      innerScript,
      description,
      false,
      false,
    ]);
    const outerScript = encodeCallScript([{ to: voting, data: newVoteData }]);

    logger.log("Submitting handover vote via TokenManager.forward...");
    const submitTx = await tmContract.forward(outerScript);
    const submitReceipt = await submitTx.wait();
    logger.log(`Submit tx mined: ${submitReceipt!.hash}`);

    let voteId: bigint | undefined;
    for (const log of submitReceipt!.logs) {
      try {
        const parsed = votingContract.interface.parseLog({
          data: log.data,
          topics: log.topics as string[],
        });
        if (parsed?.name === "StartVote") {
          voteId = parsed.args[0] as bigint;
          break;
        }
      } catch {
        // ignore non-StartVote logs
      }
    }

    if (voteId === undefined) {
      throw new Error("StartVote event not found in tx receipt");
    }

    logger.log(`Vote created: voteId=${voteId}`);

    logger.log("Casting yes vote...");
    const voteTx = await votingContract.vote(voteId, true, false);
    await voteTx.wait();
    logger.log(`Vote cast: ${voteTx.hash}`);

    const voteTimeSec = Number(await votingContract.voteTime());
    const vote = await votingContract.getVote(voteId);
    const voteEnd = Number(vote.startDate) + voteTimeSec + 1;

    logger.log(
      `Waiting for vote period to elapse (voteTime=${voteTimeSec}s)...`,
    );

    let waiting = true;
    while (waiting) {
      const latest = await provider.getBlock("latest");
      const ts = Number(latest!.timestamp);
      if (ts >= voteEnd) {
        waiting = false;
        break;
      }

      const remain = voteEnd - ts;
      logger.log(`  ${remain}s remaining`);
      await sleep(Math.min(remain, 10) * 1000);
    }

    const canExecute: boolean = await votingContract.canExecute(voteId);
    if (!canExecute) {
      throw new Error(
        `Vote ${voteId} cannot be executed (quorum/support not met). Check Voting contract state.`,
      );
    }

    logger.log("Executing vote...");
    const execTx = await votingContract.executeVote(voteId);
    await execTx.wait();
    logger.log(`Vote executed: ${execTx.hash}`);

    const finalCheck: boolean = await aclContract.hasPermission(
      dgState.adminExecutor,
      agent,
      RUN_SCRIPT_ROLE,
    );
    if (!finalCheck) {
      throw new Error(
        "Post-execute check failed: AdminExecutor still doesn't have RUN_SCRIPT_ROLE on Agent",
      );
    }

    logger.log(
      `✅ DG handover complete: AdminExecutor ${dgState.adminExecutor} now has RUN_SCRIPT_ROLE on Agent ${agent}.`,
    );
  },
});
