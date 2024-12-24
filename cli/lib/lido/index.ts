import { getAddress } from "ethers";
import { SRContract, LocatorContract } from "./contracts.js";

const WC_PREFIX_0X = "0x010000000000000000000000";

export const getLidoWC = async () => {
  await SRContract.initContract();

  const withdrawalCredentials: string =
    await SRContract.instance.getWithdrawalCredentials();

  return withdrawalCredentials;
};

export const getStakingRouterAddress = async () => {
  await SRContract.initContract();
  return await SRContract.instance.getAddress();
};

export const getCuratedModuleAddress = async () => {
  await SRContract.initContract();
  return (await SRContract.instance.getStakingModule(1))[1];
};

export const getCSMModuleAddress = async () => {
  await SRContract.initContract();
  return (await SRContract.instance.getStakingModule(3))[1];
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
