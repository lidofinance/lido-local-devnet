import { getAddress } from "ethers";
import { SRContract, LocatorContract } from "./contracts.js";

const WC_PREFIX_0X = "0x010000000000000000000000";

export const getLidoWC = async () => {
  await SRContract.initContract();

  const withdrawalCredentials: string =
    await SRContract.instance.getWithdrawalCredentials();

  return withdrawalCredentials;
};

export const getLidoLocatorAddress = async () => {
  await LocatorContract.initContract();

  return LocatorContract.instance.getAddress();
};
// with 0x and in checkSumForm
export const getLidoWCShort = async () => {
  const wc = await getLidoWC();

  return getAddress(wc.replace(WC_PREFIX_0X, "0x"));
};
// without 0x
export const getLidoWCDepositForm = async () => {
  const wc = await getLidoWC();
  return wc.replace("0x", "");
};
