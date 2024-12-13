import { existsSync, readFileSync } from "fs";

export const getGenesisTime = (genesisPath: string) => {
  if (!existsSync(genesisPath)) {
    throw new Error(`JSON file does not exist at ${genesisPath}`);
  }

  const jsonContent = readFileSync(genesisPath, "utf-8");
  const jsonObject = JSON.parse(jsonContent);

  const timestampHex = jsonObject.timestamp;
  if (!timestampHex || typeof timestampHex !== "string") {
    throw new Error("The 'timestamp' property was not found or is empty.");
  }

  const timestampHexClean = timestampHex.replace(/^0x/, "");
  const timestampDec = parseInt(timestampHexClean, 16);

  return timestampDec.toString();
};
