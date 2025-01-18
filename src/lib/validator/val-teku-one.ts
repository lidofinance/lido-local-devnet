import { getAddress } from "ethers";
import fs from "node:fs/promises";
import path from "node:path";

import { DepositData } from "./interfaces.js";

export async function generateDockerComposeOneService(
  outDir: string,
  {
    clPrivateUrl,
    configDir,
    dockerImage,
    dockerNetwork,
    graffiti,
    // keysDir,
    valGroups
  }: {
    clPrivateUrl: string;
    configDir: string;
    dockerImage: string;
    dockerNetwork: string;
    graffiti: string;
    keysDir: string;
    valGroups: Record<string, DepositData[]>;
  }
) {
  let dockerComposeContent = `version: '3.9'\nservices:\n`;

  for (const [groupName, validators] of Object.entries(valGroups)) {
    const keysCommand = validators
      .map(
        (val) =>
          `--validator-keys=/validator_keys/${val.pubkey.replace(
            "0x",
            ""
          )}.json:/validator_keys/password.txt`
      )
      .join(" ");

    dockerComposeContent += `
  teku_validator_${groupName.slice(-5)}:
    image: ${dockerImage}
    volumes:
      - ${configDir}:/validator_keys
    networks:
      - devnet
    command: >
      validator-client
      --network=/validator_keys/config.yaml
      ${keysCommand}
      --beacon-node-api-endpoint=${clPrivateUrl}
      --validators-proposer-default-fee-recipient=${getAddress(
        groupName.replace("010000000000000000000000", "0x")
      )}
      --validators-graffiti=${graffiti}
    restart: unless-stopped\n`;
  }

  dockerComposeContent += `
networks:
  devnet:
    name: ${dockerNetwork}
    external: true
    `;

  await fs.writeFile(
    path.join(outDir, `docker-compose.yaml`),
    dockerComposeContent,
    "utf8"
  );
}
