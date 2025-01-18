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
  privateKey: string
): Promise<boolean[]> {
  const provider = new JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 1000);

  const events = await contract.queryFilter(
    contract.filters.StartVote(),
    fromBlock,
    currentBlock
  );
  let voted = false;
  let executed = false;

  for (const event of events) {
    if (!("args" in event && event.args)) {
      continue;
    }

    const { voteId } = event.args;

    try {
      const canVote = await contract.canVote(voteId, wallet.address);
      if (canVote) {
        console.log(`Can vote on vote ID: ${voteId.toString()}`);
        const voteTx = await contract.vote(voteId, true, false); // Adjust as needed
        await voteTx.wait();
        console.log(
          `Voted on vote ID: ${voteId.toString()} with TX: ${voteTx.hash}`
        );
        voted = true;
      }

      // Check if the vote can be executed
      const canExecute = await contract.canExecute(voteId);
      if (canExecute) {
        console.log(`Can execute vote ID: ${voteId.toString()}`);
        const executeTx = await contract.executeVote(voteId);
        await executeTx.wait();
        console.log(
          `Executed vote ID: ${voteId.toString()} with TX: ${executeTx.hash}`
        );
        executed = true;
      }
    } catch (error) {
      console.error(`Error processing vote ID ${voteId.toString()}:`, error);
    }
  }

  return [voted, executed];
}

export async function mustVote(
  contractAddress: string,
  providerUrl: string,
  privateKey: string,
  intervalMs: number = 3000
) {
  let voted = false;
  let executed = false;

  while (!voted || !executed) {
    console.log("Checking for votes...");
    const result = await processVotes(contractAddress, providerUrl, privateKey);

    if (!voted) voted = result[0];
    if (!executed) executed = result[1];

    if (!voted || !executed) {
      console.log(
        `No votes processed or executable. Retrying in ${
          intervalMs / 1000
        } seconds...`
      );
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  console.log("Vote successfully processed and executed. Exiting...");
}
