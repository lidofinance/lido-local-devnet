import fs from "fs/promises";
import { Validator } from "./interfaces.js";
import path from "path";

export async function generateDockerCompose(
  outDir: string,
  {
    validatorsInfo,
    keysDir,
    clPrivateUrl,
    dockerNetwork,
    dockerImage,
    validatorFeeRecipient,
  }: {
    validatorsInfo: Validator[];
    keysDir: string;
    clPrivateUrl: string;
    dockerNetwork: string;
    dockerImage: string;
    validatorFeeRecipient: string;
  }
) {
  let dockerComposeContent = `version: '3.9'\nservices:\n`;
  const baseName = "validator";

  for (const val of validatorsInfo) {
    // sss.
    //   const [validatorName, keystorePath, passwordPath] = line.split(',');
    const serviceName = `${baseName}_${val.index}`;
    dockerComposeContent += `
  ${serviceName}:
    image: ${dockerImage}
    volumes:
      - ${keysDir}:/validator_keys
    networks:
      - devnet
    command: >
      validator-client --network=auto
      --validator-keys=/validator_keys/${`${val.validator.pubkey.replace(
        "0x",
        ""
      )}.json`}:/validator_keys/password.txt
      --beacon-node-api-endpoint=${clPrivateUrl}
      --validators-proposer-default-fee-recipient=${validatorFeeRecipient}
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
    "utf-8"
  );
}
