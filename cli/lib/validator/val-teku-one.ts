import fs from "fs/promises";
import { Validator } from "./interfaces.js";
import path from "path";

export async function generateDockerComposeOneService(
  outDir: string,
  {
    validatorsInfo,
    keysDir,
    clPrivateUrl,
    dockerNetwork,
    dockerImage,
    validatorFeeRecipient,
    graffiti
  }: {
    validatorsInfo: Validator[];
    keysDir: string;
    clPrivateUrl: string;
    dockerNetwork: string;
    dockerImage: string;
    validatorFeeRecipient: string;
    graffiti: string
  }
) {
  let dockerComposeContent = `version: '3.9'\nservices:\n`;
  const serviceName = "teku_validators";
  
  let keysCommand = validatorsInfo.map(val =>
    `--validator-keys=/validator_keys/${val.validator.pubkey.replace("0x", "")}.json:/validator_keys/password.txt`
  ).join(' ');

  dockerComposeContent += `
  ${serviceName}:
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
      --validators-proposer-default-fee-recipient=${validatorFeeRecipient}
      --validators-graffiti=${graffiti}
    restart: unless-stopped\n`;

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
