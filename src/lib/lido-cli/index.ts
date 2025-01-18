import { execa } from "execa";

export const runLidoCLI = async (args: string[], cwd: string, env: any) => {
  const command = "npx";
  const baseArgs = ["ts-node", "index", "--non-interactive"];

  return await execa(command, [...baseArgs, ...args], {
    stdio: "inherit",
    cwd,
    env,
  });
};

type DevNetSetupParams = {
  oraclesMembers: string[];
  oraclesQuorum: number;
  oraclesInitialEpoch: number;
  dsmGuardians: string[];
  dsmQuorum: number;
  rolesBeneficiary: string;
};

export type DevNetLidoCliBaseEnv = {
  DEPLOYED: string;
  EL_CHAIN_ID: string;
  EL_NETWORK_NAME: string;
  EL_API_PROVIDER: string;
  PRIVATE_KEY: string;
};

export async function setupDevNet(
  params: DevNetSetupParams,
  cwd: string,
  env: DevNetLidoCliBaseEnv
) {
  const args = [
    "devnet",
    "setup",
    "--oracles-members",
    params.oraclesMembers.join(","),
    "--oracles-quorum",
    params.oraclesQuorum.toString(),
    "--oracles-initial-epoch",
    params.oraclesInitialEpoch.toString(),
    "--dsm-guardians",
    params.dsmGuardians.join(","),
    "--dsm-quorum",
    params.dsmQuorum.toString(),
    "--roles-beneficiary",
    params.rolesBeneficiary,
  ];

  return runLidoCLI(args, cwd, env);
}
