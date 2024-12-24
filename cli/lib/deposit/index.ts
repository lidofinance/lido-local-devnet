import { ethers, JsonRpcProvider, parseEther } from "ethers";
import { baseConfig, jsonDb } from "../../config/index.js";

const validatorWallet = baseConfig.sharedWallet[3];

const getConfig = async () => {
  const state = await jsonDb.getReader();
  const rpc = state.getOrError("network.binding.elNodes.0");
  const provider = new JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(validatorWallet.privateKey, provider);
  const depositContract = new ethers.Contract(
    depositContractAddress,
    depositContractABI,
    wallet
  );

  return { wallet, depositContract };
};

const depositContractAddress = "0x4242424242424242424242424242424242424242";

const depositContractABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "bytes", name: "pubkey", type: "bytes" },
      {
        indexed: false,
        internalType: "bytes",
        name: "withdrawal_credentials",
        type: "bytes",
      },
      { indexed: false, internalType: "bytes", name: "amount", type: "bytes" },
      {
        indexed: false,
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      { indexed: false, internalType: "bytes", name: "index", type: "bytes" },
    ],
    name: "DepositEvent",
    type: "event",
  },
  {
    inputs: [
      { internalType: "bytes", name: "pubkey", type: "bytes" },
      { internalType: "bytes", name: "withdrawal_credentials", type: "bytes" },
      { internalType: "bytes", name: "signature", type: "bytes" },
      { internalType: "bytes32", name: "deposit_data_root", type: "bytes32" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "get_deposit_count",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "get_deposit_root",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "pure",
    type: "function",
  },
];

export async function makeDeposit(
  pubkey: string,
  withdrawalCredentials: string,
  signature: string,
  depositDataRoot: string,
  depositAmount = 32
) {
  const { depositContract } = await getConfig();

  const formattedAmount = {
    value: parseEther(depositAmount.toString()),
  };

  const tx = await depositContract.deposit(
    toBytesLike(pubkey),
    toBytesLike(withdrawalCredentials),
    toBytesLike(signature),
    toBytesLike(depositDataRoot),
    formattedAmount
  );
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction was confirmed in block:", receipt.blockNumber);
}

const toBytesLike = (str: string) => {
  return `0x${str}`;
};
