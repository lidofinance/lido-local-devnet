import { execa } from "execa";

// This function retrieves the hash of the current Git branch in the specified directory
export const getGitBranchHash = async (directory: string): Promise<string> => {
  try {
    // Execute the Git command to get the hash of the current commit on the active branch
    const { stdout } = await execa("git", ["rev-parse", "HEAD"], {
      cwd: directory,
    });
    return stdout;
  } catch (error) {
    // Log the error if the command fails
    console.error("Error obtaining the branch hash:", error);
    throw error;
  }
};

export const getShortGitBranchHash = async (directory: string) => (await getGitBranchHash(directory)).slice(0, 7);
