import {
  JsonRpcProvider,
  TransactionReceipt,
  ethers,
  parseEther,
} from "ethers";

import { assert } from "../assert.js";

interface TransactionDetails {
  amount: string;
  privateKey: string;
  providerUrl: string;
  timeout?: number;
  toAddress: string;
}

export const calcEpoch = async (providerUrl: string, genesis: number) => {
  const provider = new JsonRpcProvider(providerUrl);
  const SECONDS_PER_SLOT = 12;
  const { timestamp } = (await provider.getBlock("latest"))!;
  console.log(
    "(timestamp - genesis) / SECONDS_PER_SLOT",
    genesis,
    timestamp,
    (timestamp - genesis) / SECONDS_PER_SLOT,
    (await provider.getBlock("latest"))?.number,
  );

  return (timestamp - genesis) / SECONDS_PER_SLOT;
};

export const sendTransactionWithRetry = async ({
  amount,
  privateKey,
  providerUrl,
  toAddress,
}: // timeout = 180000,
TransactionDetails): Promise<TransactionReceipt | undefined> => {
  const provider = new JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const latestBlock = await provider.getBlock("latest");
  if (latestBlock?.number && latestBlock?.number > 20) return;

  const tx = {
    to: toAddress,
    value: parseEther(amount),
  };

  const attemptToSendTransaction = async (): Promise<TransactionReceipt> => {
    try {
      const txResponse = await wallet.sendTransaction(tx);
      const receipt = await txResponse.wait();
      assert(receipt !== null, "empty receipt");
      return receipt;
    } catch (error: any) {
      if (error.message.includes("transaction indexing is in progress")) {
        console.log(
          "Waiting for node to finish indexing... Retrying in 5 seconds",
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return attemptToSendTransaction();
      }

      console.error("Error sending transaction:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return attemptToSendTransaction();
    }
  };

  // const timeoutPromise = new Promise<never>((_, reject) => {
  //   setTimeout(() => reject(new Error("Timeout reached")), timeout);
  // });
  return attemptToSendTransaction();
  // return Promise.race([attemptToSendTransaction(), timeoutPromise]);
};
