import fs from "fs/promises";
import { Validator } from "./interfaces.js";
import path from "path";
import { getAddress } from "ethers";

export async function generateDockerComposeOneService(
  outDir: string,
  {
    keysDir,
    clPrivateUrl,
    dockerNetwork,
    dockerImage,
    graffiti,
    valGroups,
  }: {
    keysDir: string;
    clPrivateUrl: string;
    dockerNetwork: string;
    dockerImage: string;
    graffiti: string;
    valGroups: Record<string, Validator[]>;
  }
) {
  let dockerComposeContent = `version: '3.9'\nservices:\n`;

  Object.entries(valGroups).forEach(([groupName, validators]) => {
    let keysCommand = validators
      .map(
        (val) =>
          `--validator-keys=/validator_keys/${val.validator.pubkey.replace(
            "0x",
            ""
          )}.json:/validator_keys/password.txt`
      )
      .join(" ");

    dockerComposeContent += `
  teku_validator_${groupName.slice(-5)}:
    image: ${dockerImage}
    volumes:
      - ${keysDir}:/validator_keys
    networks:
      - devnet
    command: >
      validator-client
      --network=/validator_keys/config.yaml
      ${keysCommand}
      --beacon-node-api-endpoint=${clPrivateUrl}
      --validators-proposer-default-fee-recipient=${getAddress(
        groupName.replace("0x010000000000000000000000", "0x")
      )}
      --validators-graffiti=${graffiti}
    restart: unless-stopped\n`;
  });

  dockerComposeContent += `
networks:
  devnet:
    name: ${dockerNetwork}
    external: true
    `;

  await fs.writeFile(
    path.join(outDir, `docker-compose.yaml`),
    dockerComposeContent,
    "utf-8"
  );
}
