import { BeaconClient } from "@devnet/cl-client";
import { State, StateInterface } from "@devnet/state";
import {
  AbstractSigner,
  JsonRpcProvider,
  Provider,
  TransactionReceipt,
  ethers,
  parseEther,
} from "ethers";

import { assert } from "../assert.js";
import { DevNetLogger } from "@devnet/logger";
export class DevNetDRENetwork {
  name: string;
  private logger: DevNetLogger;
  private state: StateInterface;
  constructor(network: string, state: StateInterface, logger: DevNetLogger) {
    this.name = network;
    this.state = state;
    this.logger = logger;
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

  public async waitEL() {
    const { elPublic } = await this.state.getChain();
    this.logger.log(`Ensuring the execution node at ${elPublic} is ready...`);
    await this.sendTransactionWithRetry();
    this.logger.log("Execution node is ready.");
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
}
