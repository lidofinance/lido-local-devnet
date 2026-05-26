import { Params, command } from "@devnet/command";
import { createNamespaceIfNotExists, getK8s } from "@devnet/k8s";
import { generateDepositData } from "@devnet/keygen";
import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import { Wallet } from "ethers";
import fs from "node:fs/promises";
import path from "node:path";

export const ChainGenerateValidatorKeys = command.cli({
  description:
    "Generates BLS validator keys (mnemonic, keystores, deposit data) and uploads them to K8s.",
  params: {
    count: Params.integer({ description: "Number of validator keys to generate.", default: 1 }),
    mnemonic: Params.string({ description: "BLS mnemonic phrase. Generates random if not provided." }),
    password: Params.string({ description: "Keystore encryption password.", default: "12345678" }),
    wcAddress: Params.string({ description: "Withdrawal credentials address (defaults to deployer wallet)." }),
    wcType: Params.string({ description: "Withdrawal credentials type: 0x01 or 0x02.", default: "0x01" }),
    startIndex: Params.integer({ description: "Key derivation start index.", default: 0 }),
  },
  async handler({ params, dre: { logger, state, network: dreNetwork } }) {
    const count = params.count ?? 1;
    const password = params.password ?? "12345678";
    const wcType = params.wcType ?? "0x01";
    const startIndex = params.startIndex ?? 0;

    // 1. Generate or reuse mnemonic
    const mnemonic = params.mnemonic ?? Wallet.createRandom().mnemonic?.phrase;
    if (!mnemonic) {
      throw new DevNetError("Failed to generate mnemonic.");
    }

    logger.log(`Mnemonic: ${mnemonic}`);
    logger.log(`Generating ${count} validator key(s) starting at index ${startIndex}...`);

    // 2. Resolve fork version
    const forkVersion = await resolveForkVersion(state, logger);

    // 3. Resolve withdrawal credentials address
    let { wcAddress } = params;
    if (!wcAddress) {
      try {
        const { deployer } = await state.getNamedWallet();
        wcAddress = deployer.publicKey;
        logger.log(`Using deployer address as withdrawal credentials: ${wcAddress}`);
      } catch {
        throw new DevNetError(
          "No --wcAddress provided and deployer wallet not found. " +
          "Please provide --wcAddress explicitly.",
        );
      }
    }

    // 4. Generate deposit data and keystores
    const results = await generateDepositData(
      { mnemonic, password },
      {
        amount: 32 * 10 ** 9,
        forkVersionString: forkVersion,
        generateFrom: startIndex,
        numValidators: count,
        wcAddress,
        wcType,
      },
    );

    logger.log(`Generated ${results.length} validator key(s).`);

    // 5. Save to artifacts
    const keysDir = path.join(state.artifactsRoot, "validator-keys");
    const keystoresDir = path.join(keysDir, "keystores");
    await fs.mkdir(keystoresDir, { recursive: true });

    await fs.writeFile(path.join(keysDir, "mnemonic.txt"), mnemonic, "utf-8");
    await fs.writeFile(path.join(keysDir, "password.txt"), password, "utf-8");

    const depositDataArray = [];
    for (const [i, result] of results.entries()) {
      await fs.writeFile(
        path.join(keystoresDir, `keystore-${startIndex + i}.json`),
        JSON.stringify(result.keystore, null, 2),
        "utf-8",
      );
      depositDataArray.push(result.depositData);
    }

    await fs.writeFile(
      path.join(keysDir, "deposit_data.json"),
      JSON.stringify(depositDataArray, null, 2),
      "utf-8",
    );

    logger.log(`Saved keys to ${keysDir}`);

    // 6. Upload keystores and password as K8s Secrets
    const namespace = `kt-${dreNetwork.name}`;
    await createNamespaceIfNotExists(namespace);
    await uploadKeystoresSecret(namespace, dreNetwork.name, results, password, logger);

    // 7. Update state
    await state.updateValidatorsData(results);
    logger.log("State updated with validator data.");

    logger.log("Validator keys generated successfully.");
    logger.log(`  Keystores: ${keystoresDir}`);
    logger.log(`  Deposit data: ${path.join(keysDir, "deposit_data.json")}`);
    logger.log(`  Mnemonic saved: ${path.join(keysDir, "mnemonic.txt")}`);
  },
});

/**
 * Resolves genesis fork version from CL beacon API or local config.yaml.
 */
async function resolveForkVersion(
  state: { artifactsRoot: string; getChain: (must?: boolean) => Promise<any> },
  logger: { log: (msg: string) => void },
): Promise<string> {
  // Try CL beacon API first
  try {
    const chain = await state.getChain(false);
    if (chain?.clPublic) {
      logger.log(`Fetching fork version from CL beacon API: ${chain.clPublic}`);
      const resp = await fetch(`${chain.clPublic}/eth/v1/beacon/genesis`);
      if (resp.ok) {
        const json = await resp.json() as { data: { genesis_fork_version: string } };
        const version = json.data.genesis_fork_version;
        logger.log(`Fork version from beacon API: ${version}`);
        return version;
      }
    }
  } catch {
    // CL not available, fall through to local config
  }

  // Fall back to local network-config/config.yaml
  try {
    const configPath = path.join(state.artifactsRoot, "network-config", "config.yaml");
    const configContent = await fs.readFile(configPath, "utf-8");
    const match = configContent.match(/GENESIS_FORK_VERSION:\s*['"]?(0x[\dA-Fa-f]+)['"]?/);
    if (match?.[1]) {
      logger.log(`Fork version from local config.yaml: ${match[1]}`);
      return match[1];
    }
  } catch {
    // Local config not available
  }

  throw new DevNetError(
    "Cannot determine genesis fork version. " +
    "Either deploy CL node first or place config.yaml in artifacts/<stand>/network-config/.",
  );
}

/**
 * Uploads keystores and password as K8s Secrets.
 */
async function uploadKeystoresSecret(
  namespace: string,
  networkName: string,
  results: Awaited<ReturnType<typeof generateDepositData>>,
  password: string,
  logger: { log: (msg: string) => void },
): Promise<void> {
  const kc = await getK8s();
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  // Keystores secret
  const keystoresSecretName = `${networkName}-validator-keystores`;
  const keystoresData: Record<string, string> = {};
  for (let i = 0; i < results.length; i++) {
    const key = `keystore-${i}.json`;
    keystoresData[key] = Buffer.from(JSON.stringify(results[i]!.keystore)).toString("base64");
  }

  const keystoresBody: k8s.V1Secret = {
    metadata: { name: keystoresSecretName, namespace },
    type: "Opaque",
    data: keystoresData,
  };

  try {
    await coreApi.readNamespacedSecret({ name: keystoresSecretName, namespace });
    await coreApi.replaceNamespacedSecret({ name: keystoresSecretName, namespace, body: keystoresBody });
    logger.log(`Updated K8s Secret '${keystoresSecretName}'.`);
  } catch {
    await coreApi.createNamespacedSecret({ namespace, body: keystoresBody });
    logger.log(`Created K8s Secret '${keystoresSecretName}'.`);
  }

  // Password secret
  const passwordSecretName = `${networkName}-validator-password`;
  const passwordBody: k8s.V1Secret = {
    metadata: { name: passwordSecretName, namespace },
    type: "Opaque",
    data: {
      "password.txt": Buffer.from(password).toString("base64"),
    },
  };

  try {
    await coreApi.readNamespacedSecret({ name: passwordSecretName, namespace });
    await coreApi.replaceNamespacedSecret({ name: passwordSecretName, namespace, body: passwordBody });
    logger.log(`Updated K8s Secret '${passwordSecretName}'.`);
  } catch {
    await coreApi.createNamespacedSecret({ namespace, body: passwordBody });
    logger.log(`Created K8s Secret '${passwordSecretName}'.`);
  }
}
