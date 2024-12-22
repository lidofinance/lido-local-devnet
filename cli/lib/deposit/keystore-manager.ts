import { promises as fs } from "fs";
import * as path from "path";
import { validatorsState } from "../../config/index.js";

// Function to create a directory if it does not exist
async function createDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

// Function to process all files in a directory
async function processFiles(
  directoryPath: string,
  targetDirectory: string
): Promise<void> {
  const files = await fs.readdir(directoryPath);
  const keystores: Record<string, any> = {};
  let depositData = [];
  for (const file of files) {
    if (file.startsWith("keystore")) {
      const [pubkey, data] = await processKeystore(
        file,
        directoryPath,
        targetDirectory
      );
      keystores[pubkey] = data;
    }
    if (file.startsWith("deposit_data")) {
      depositData = await processDepositData(
        file,
        directoryPath,
        targetDirectory
      );
    }
  }

  const currentState = await validatorsState.read();

  const updated = {
    keystores: { ...(currentState?.keystores ?? {}), ...keystores },
    depositData: [...(currentState?.depositData ?? []), ...depositData],
  };

  await validatorsState.write(updated);
}

// Function to process a single file
async function processKeystore(
  file: string,
  directoryPath: string,
  targetDirectory: string
) {
  const filePath = path.join(directoryPath, file);
  const data = await fs.readFile(filePath, "utf8");
  const jsonData = JSON.parse(data);
  const filename = await renameAndMoveFile(
    jsonData,
    file,
    directoryPath,
    targetDirectory
  );
  return [filename, jsonData];
}

async function processDepositData(
  file: string,
  directoryPath: string,
  targetDirectory: string
) {
  const filePath = path.join(directoryPath, file);
  const data = await fs.readFile(filePath, "utf8");
  const jsonData = JSON.parse(data);
  await mv(filePath, path.join(targetDirectory, "deposit_data.json"));
  return jsonData;
}

// Function to rename and move a file
async function renameAndMoveFile(
  jsonData: any,
  originalFilename: string,
  directoryPath: string,
  targetDirectory: string
) {
  if (!jsonData.pubkey) {
    throw new Error(`Keystore file is not valid`, jsonData);
  }

  const newFilename = `${jsonData.pubkey}.json`;
  const newFilePath = path.join(targetDirectory, newFilename);
  await mv(path.join(directoryPath, originalFilename), newFilePath);
  return jsonData.pubkey;
}

// Function to move a file from one location to another
async function mv(sourcePath: string, destinationPath: string): Promise<void> {
  await fs.rename(sourcePath, destinationPath);
}

// Exported function for external use
export async function manageKeystores(
  sourceDirectory: string,
  destinationDirectory: string
): Promise<void> {
  await createDirectory(destinationDirectory);
  await processFiles(sourceDirectory, destinationDirectory);
  await fs.writeFile(path.join(destinationDirectory, "password.txt"), "12345678", "utf-8");
}

export async function deleteLockFiles(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await deleteLockFiles(entryPath);
        } else if (entry.isFile() && path.extname(entry.name) === '.lock') {
            await fs.unlink(entryPath);
            console.log(`Deleted: ${entryPath}`);
        }
    }
}
