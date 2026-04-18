import { execa } from "execa";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// cli-pod workspace directory at workspaces/cli-pod
// Compiled file lives at dist/shared/cli-pod.helpers.js, so repo root is ../..
const __dirname = dirname(fileURLToPath(import.meta.url));
export const CLI_POD_DIR = resolve(__dirname, "../../workspaces/cli-pod");

export const runMake = async (
  target: string,
  env: Record<string, string> = {},
): Promise<void> => {
  await execa("make", [target], {
    cwd: CLI_POD_DIR,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
};
