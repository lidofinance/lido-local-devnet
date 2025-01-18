import { baseConfig } from "../../config/index.js";
import { sendTransactionWithRetry } from "../index.js";

export const waitEL = async (rpc: string) => {
  await sendTransactionWithRetry({
    amount: "1",
    privateKey: baseConfig.sharedWallet[0].privateKey,
    providerUrl: rpc,
    toAddress: "0xf93Ee4Cf8c6c40b329b0c0626F28333c132CF241",
  });
};
