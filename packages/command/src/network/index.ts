import { BeaconClient } from "@devnet/cl-client";
import { DevNetLogger } from "@devnet/logger";
import { StateInterface } from "@devnet/state";
import { Network } from "@devnet/types";
import { DevNetError, assert } from "@devnet/utils";
import {
  AbstractSigner,
  JsonRpcProvider,
  Provider,
  TransactionReceipt,
  ethers,
  parseEther,
} from "ethers";

export class DevNetDRENetwork {
  public readonly name: Network;
  private logger: DevNetLogger;
  private state: StateInterface;
  constructor(network: Network, state: StateInterface, logger: DevNetLogger) {
    this.name = network;
    this.state = state;
    this.logger = logger;
  }

  public async getChainId(): Promise<string> {
    const { elPublic } = await this.state.getChain();
    const provider = new JsonRpcProvider(elPublic);
    const { chainId } = await provider.getNetwork();
    return chainId.toString();
  }

  public async getCLClient() {
    const { clPublic } = await this.state.getChain();
    return new BeaconClient(clPublic);
  }

  public async getSigner() {
    const { elPublic } = await this.state.getChain();
    const { deployer } = await this.state.getNamedWallet();

    const provider = new JsonRpcProvider(elPublic);
    const wallet = new ethers.Wallet(deployer.privateKey, provider);

    return wallet as AbstractSigner<Provider>;
  }

  public async waitCL() {
    const { clPublic } = await this.state.getChain();
    this.logger.log(`Ensuring the consensus node at ${clPublic} is ready...`);
    await this.fetchGenesisWithRetry();
    this.logger.log("Consensus node is ready.");
  }

  public async waitCLFinalizedEpoch(epoch: number) {
    const { clPublic } = await this.state.getChain();
    this.logger.log(`Waiting for consensus node at ${clPublic} to reach epoch ${epoch}...`);
    await this.waitForFinalizedEpochWithRetry(epoch);
    this.logger.log(`Consensus node has reached epoch ${epoch}.`);
  }

  public async waitCLSync(timeoutMs = 60_000) {
    const { clPublic } = await this.state.getChain();
    this.logger.log(`Checking CL sync status at ${clPublic} (timeout: ${timeoutMs / 1000}s)...`);

    const deadline = Date.now() + timeoutMs;
    const clClient = await this.getCLClient();

    const check = async (): Promise<void> => {
      if (Date.now() > deadline) {
        throw new DevNetError(
          `CL node at ${clPublic} is still syncing after ${timeoutMs / 1000}s. Aborting.`,
        );
      }

      try {
        const { data } = await clClient.getSyncStatus();
        if (!data.is_syncing && !data.el_offline) {
          this.logger.log(`CL node is synced (head_slot: ${data.head_slot}).`);
          return;
        }

        const remaining = Math.round((deadline - Date.now()) / 1000);
        this.logger.log(
          `CL syncing (head_slot: ${data.head_slot}, sync_distance: ${data.sync_distance}, ` +
          `el_offline: ${data.el_offline})... ${remaining}s left`,
        );
      } catch (error: any) {
        const remaining = Math.round((deadline - Date.now()) / 1000);
        this.logger.log(`CL not reachable: ${error.message}... ${remaining}s left`);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      return check();
    };

    return check();
  }

  public async waitEL() {
    const { elPublic } = await this.state.getChain();
    this.logger.log(`Ensuring the execution node at ${elPublic} is ready...`);
    await this.sendTransactionWithRetry();
    this.logger.log("Execution node is ready.");
  }

  public async waitELSync(timeoutMs = 60_000) {
    const { elPublic } = await this.state.getChain();
    this.logger.log(`Checking EL sync status at ${elPublic} (timeout: ${timeoutMs / 1000}s)...`);

    const deadline = Date.now() + timeoutMs;
    const provider = new JsonRpcProvider(elPublic);

    const check = async (): Promise<void> => {
      if (Date.now() > deadline) {
        throw new DevNetError(
          `EL node at ${elPublic} is still syncing after ${timeoutMs / 1000}s. Aborting.`,
        );
      }

      try {
        const syncing = await provider.send("eth_syncing", []);
        if (syncing === false) {
          this.logger.log("EL node is synced.");
          return;
        }

        const current = syncing.currentBlock ?? "unknown";
        const highest = syncing.highestBlock ?? "unknown";
        const remaining = Math.round((deadline - Date.now()) / 1000);
        this.logger.log(`EL syncing (current: ${current}, highest: ${highest})... ${remaining}s left`);
      } catch (error: any) {
        const remaining = Math.round((deadline - Date.now()) / 1000);
        this.logger.log(`EL not reachable: ${error.message}... ${remaining}s left`);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      return check();
    };

    return check();
  }

  private async fetchGenesisWithRetry(): Promise<void> {
    const clClient = await this.getCLClient();

    const attemptToFetchGenesis = async (): Promise<void> => {
      try {
        await clClient.getGenesis();
      } catch (error) {
        this.logger.log(
          `Consensus node not ready yet... Retrying in 5 seconds ${error}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return attemptToFetchGenesis();
      }
    };

    return attemptToFetchGenesis();
  }

  private async sendTransactionWithRetry(
    amount = "1",
    toAddress = "0xf93Ee4Cf8c6c40b329b0c0626F28333c132CF241",
  ): Promise<TransactionReceipt | undefined> {
    const signer = await this.getSigner();

    const latestBlock = await signer.provider.getBlock("latest");
    if (latestBlock?.number && latestBlock?.number > 20) return;

    const tx = {
      to: toAddress,
      value: parseEther(amount),
    };

    const attemptToSendTransaction = async (): Promise<TransactionReceipt> => {
      try {
        const txResponse = await signer.sendTransaction(tx);
        const receipt = await txResponse.wait();
        assert(receipt !== null, "empty receipt");
        return receipt;
      } catch (error: any) {
        if (error.message.includes("transaction indexing is in progress")) {
          this.logger.log(
            "Waiting for node to finish indexing... Retrying in 5 seconds",
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return attemptToSendTransaction();
        }

        this.logger.error(`Error sending transaction: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return attemptToSendTransaction();
      }
    };

    // const timeoutPromise = new Promise<never>((_, reject) => {
    //   setTimeout(() => reject(new Error("Timeout reached")), timeout);
    // });
    return attemptToSendTransaction();
    // return Promise.race([attemptToSendTransaction(), timeoutPromise]);
  }

  private async waitForFinalizedEpochWithRetry(targetEpoch: number): Promise<void> {
    const clClient = await this.getCLClient();

    const attemptToWaitForEpoch = async (): Promise<void> => {
      try {
        const currentEpoch = await clClient.getFinalizedEpoch();
        if (currentEpoch >= targetEpoch) {
          return;
        }

        this.logger.log(
          `Current epoch is ${currentEpoch}, waiting for epoch ${targetEpoch}... Retrying in 5 seconds`,
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return attemptToWaitForEpoch();
      } catch (error: any) {
        this.logger.log(
          `Error checking epoch: ${error.message}... Retrying in 10 seconds`,
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return attemptToWaitForEpoch();
      }
    };

    return attemptToWaitForEpoch();
  }
}
