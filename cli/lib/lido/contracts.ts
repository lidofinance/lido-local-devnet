import { ethers, JsonRpcProvider } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jsonDb } from "../../config/index.js";

// Define the directory path of the current file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reading ABI files
const SR_ABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./abi/sr.json"), "utf8")
);
const LOCATOR_ABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./abi/locator.json"), "utf8")
);

// Class definition for contract instance
class ContractInstance {
  private abi: any;
  private addressSelector?: string;
  private contract: ethers.Contract | null = null;

  constructor(abi: any, addressSelector?: string) {
    this.abi = abi;
    this.addressSelector = addressSelector;
  }

  // Initialize the contract with an address and a provider
  public async initContract() {
    const state = await jsonDb.getReader();

    const rpcUrl = state.getOrError("network.binding.elNodes.0");
    const provider = new JsonRpcProvider(rpcUrl);

    const locator = state.getOrError("lidoCore.lidoLocator.proxy.address");
    const locatorContract = new ethers.Contract(locator, LOCATOR_ABI, provider);
    if (!this.addressSelector) {
      this.contract = locatorContract;
    } else {
      const destAddress = await locatorContract[this.addressSelector]();
      this.contract = new ethers.Contract(destAddress, this.abi, provider);
    }
  }

  // Retrieve the contract instance
  get instance(): ethers.Contract {
    if (!this.contract) {
        throw new Error("Contract not initialized. Call initContract first.");
      }
      return this.contract;
  }
}

// Export instances of the class for each ABI
export const SRContract = new ContractInstance(SR_ABI, "stakingRouter");
export const LocatorContract = new ContractInstance(LOCATOR_ABI);
