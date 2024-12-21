import { promises as fs } from 'fs';
import * as path from 'path';

// Function to create a directory if it does not exist
async function createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
}

// Function to process all files in a directory
async function processFiles(directoryPath: string, targetDirectory: string): Promise<void> {
    const files = await fs.readdir(directoryPath);
    files.forEach(async file => {
        if (file.startsWith('keystore')) {
            return await processKeystore(file, directoryPath, targetDirectory);
        }
        if (file.startsWith('deposit_data')) {
            const filePath = path.join(directoryPath, file);
            await mv(filePath, path.join(targetDirectory, 'deposit_data.json'))
        }
    });
}

// Function to process a single file
async function processKeystore(file: string, directoryPath: string, targetDirectory: string): Promise<void> {
    const filePath = path.join(directoryPath, file);
    const data = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    await renameAndMoveFile(jsonData, file, directoryPath, targetDirectory);
}

// Function to rename and move a file
async function renameAndMoveFile(jsonData: any, originalFilename: string, directoryPath: string, targetDirectory: string): Promise<void> {
    if (jsonData.pubkey) {
        const newFilename = `${jsonData.pubkey}.json`;
        const newFilePath = path.join(targetDirectory, newFilename);
        await mv(path.join(directoryPath, originalFilename), newFilePath);
        console.log(`Moved ${originalFilename} to ${newFilename}`);
    }
}

// Function to move a file from one location to another
async function mv(sourcePath: string, destinationPath: string): Promise<void> {
    await fs.rename(sourcePath, destinationPath);
}

// Exported function for external use
export async function manageKeystores(sourceDirectory: string, destinationDirectory: string): Promise<void> {
    await createDirectory(destinationDirectory);
    await processFiles(sourceDirectory, destinationDirectory);
}
