import { command } from "@devnet/command";
import { DevNetLogger } from "@devnet/logger";
import { JsonRpcProvider, ethers } from "ethers";

const abi = [
  "event StartVote(uint256 indexed voteId, address indexed creator, string metadata)",
  "function canVote(uint256 _voteId, address _voter) view returns (bool)",
  "function vote(uint256 _voteId, bool _supports, bool _executesIfDecided)",
  "function executeVote(uint256 _voteId)",
  "function canExecute(uint256 _voteId) view returns (bool)",
];

export async function processVotes(
  contractAddress: string,
  providerUrl: string,
  privateKey: string,
  logger: DevNetLogger,
  voted: boolean,
): Promise<boolean[]> {
  const provider = new JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 1000);

  const events = await contract.queryFilter(
    contract.filters.StartVote(),
    fromBlock,
    currentBlock,
  );

  let executed = false;

  for (const event of events) {
    if (!("args" in event && event.args)) {
      continue;
    }

    const { voteId } = event.args;

    try {
      const canVote = await contract.canVote(voteId, wallet.address);
      if (canVote && !voted) {
        logger.log(`Can vote on vote ID: ${voteId.toString()}`);
        const voteTx = await contract.vote(voteId, true, false); // Adjust as needed
        await voteTx.wait();
        logger.log(
          `Voted on vote ID: ${voteId.toString()} with TX: ${voteTx.hash}`,
        );
        voted = true;
      }

      // Check if the vote can be executed
      const canExecute = await contract.canExecute(voteId);
      if (canExecute) {
        logger.log(`Can execute vote ID: ${voteId.toString()}`);
        const executeTx = await contract.executeVote(voteId);
        await executeTx.wait();
        logger.log(
          `Executed vote ID: ${voteId.toString()} with TX: ${executeTx.hash}`,
        );
        executed = true;
      }
    } catch (error: any) {
      logger.error(
        `Error processing vote ID ${voteId.toString()}: ${error!.message}`,
      );
    }
  }

  return [voted, executed];
}

export const VotingAutoVote = command.cli({
  description: "Auto vote",
  params: {},
  async handler({ dre: { state, logger } }) {
    const intervalMs = 3000;
    const { elPublic } = await state.getChain();

    const { voting: votingAddress } = await state.getLido();
    const { deployer } = await state.getNamedWallet();

    let voted = false;
    let executed = false;

    while (!voted || !executed) {
      logger.log("Checking for votes...");
      const result = await processVotes(
        votingAddress,
        elPublic,
        deployer.privateKey,
        logger,
        voted,
      );

      if (!voted) voted = result[0];
      if (!executed) executed = result[1];

      if (!voted || !executed) {
        logger.log(
          `No votes processed or executable. Retrying in ${
            intervalMs / 1000
          } seconds...`,
        );
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    logger.log("Vote successfully processed and executed. Exiting...");
  },
});
