import { execa } from "execa";

type DevNetSetupParams = {
  oraclesMembers: string[];
  oraclesQuorum: number;
  oraclesInitialEpoch: number;
  dsmGuardians: string[];
  dsmQuorum: number;
  rolesBeneficiary: string;
};

type DevNetEnv = {
  DEPLOYED: string;
  EL_CHAIN_ID: string;
  EL_NETWORK_NAME: string;
  EL_API_PROVIDER: string;
  PRIVATE_KEY: string;
};

export async function setupDevNet(
  params: DevNetSetupParams,
  cwd: string,
  env: DevNetEnv
) {
  const command = "npx";
  const args = [
    "ts-node",
    "index",
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

  try {
    console.log(env)
    await execa(command, args, {
      stdio: "inherit",
      cwd,
      env,
    });
  } catch (error) {
    console.error("Failed to execute script:", error);
  }
}
