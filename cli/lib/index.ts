import { existsSync, readFileSync } from "fs";
import {
  ethers,
  JsonRpcProvider,
  TransactionReceipt,
  parseEther,
} from "ethers";
import assert from "assert";

export const getGenesisTime = (genesisPath: string) => {
  if (!existsSync(genesisPath)) {
    throw new Error(`JSON file does not exist at ${genesisPath}`);
  }

  const jsonContent = readFileSync(genesisPath, "utf-8");
  const jsonObject = JSON.parse(jsonContent);
  const timestamp = jsonObject.timestamp;
  if (!timestamp) {
    throw new Error("The 'timestamp' property was not found or is empty.");
  }
  return timestamp.toString();
};

interface TransactionDetails {
  providerUrl: string;
  privateKey: string;
  toAddress: string;
  amount: string;
  timeout?: number;
}

export const calcEpoch = async (providerUrl: string, genesis: number) => {
  const provider = new JsonRpcProvider(providerUrl);
  const SECONDS_PER_SLOT = 12;
  const timestamp = (await provider.getBlock("latest"))!.timestamp;
  console.log(
    "(timestamp - genesis) / SECONDS_PER_SLOT",
    genesis,
    timestamp,
    (timestamp - genesis) / SECONDS_PER_SLOT,
    (await provider.getBlock("latest"))?.number
  );

  return (timestamp - genesis) / SECONDS_PER_SLOT;
};

export const sendTransactionWithRetry = ({
  providerUrl,
  privateKey,
  toAddress,
  amount,
  // timeout = 180000,
}: TransactionDetails): Promise<TransactionReceipt> => {
  const provider = new JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

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
          "Waiting for node to finish indexing... Retrying in 5 seconds"
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return attemptToSendTransaction();
      } else {
        console.error("Error sending transaction:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return attemptToSendTransaction();
      }
    }
  };

  // const timeoutPromise = new Promise<never>((_, reject) => {
  //   setTimeout(() => reject(new Error("Timeout reached")), timeout);
  // });
  return attemptToSendTransaction()
  // return Promise.race([attemptToSendTransaction(), timeoutPromise]);
};
