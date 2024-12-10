import * as bls from "@chainsafe/bls";
import { decrypt, verifyPassword } from "@chainsafe/bls-keystore";
console.log(bls);
// import { bls } from '@noble/bls12-381';

async function initializeBLS() {
  //   await initBLS();
}

const toHex = (array) => {
  const hexString = Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return hexString;
};


async function getCurrentEpoch(nodeUrl) {
  try {
    const response = await fetch(`${nodeUrl}/eth/v1/beacon/genesis`);
    const data = await response.json();
    console.log(data, "???");
    const genesisTime = data.data.genesis_time;
    const currentTime = Math.floor(Date.now() / 1000);
    const currentEpoch = Math.floor((currentTime - genesisTime) / 12 / 32);
    return currentEpoch;
  } catch (error) {
    console.error("Error getting current epoch:", error);
    return null;
  }
}

const decryptMessage = async (input) => {
  console.log(input);

  console.log(
    "isVerified",
    await verifyPassword(input, "_JV17RFdGZP3tTm_ofPJXBLb1aKYjTbhZYn5CsQplJA=")
  );

  const content = await decrypt(
    input,
    "_JV17RFdGZP3tTm_ofPJXBLb1aKYjTbhZYn5CsQplJA="
  );

  //   console.log(toHex(await bls.default.secretKeyToPublicKey(content)), "???");

  //   console.log(stringed);

  return  content;
};

async function getValidatorIndex(nodeUrl, publicKey) {
  try {
    const response = await fetch(
      `${nodeUrl}/eth/v1/beacon/states/head/validators?id=${"0x" + publicKey}`
    );
    const data = await response.json();
    // console.log(data)
    const validatorIndex = data.data[0].index;
    return validatorIndex;
  } catch (error) {
    console.error("Error getting validator index:", error.message);
    return null;
  }
}

async function submitVoluntaryExit(nodeUrl, privateKey, pubkey, cryptoData) {
  await initializeBLS();

  const currentEpoch = await getCurrentEpoch(nodeUrl);
  console.log(currentEpoch, "currentEpoch");
  if (currentEpoch == null) {
    console.error("Failed to get the current epoch");
    return;
  }

  const validatorIndex = await getValidatorIndex(nodeUrl, pubkey);
  console.log(validatorIndex, "validatorIndex");
  if (validatorIndex == null) {
    console.error("Failed to get the validator index");
    return;
  }

  const voluntaryExit = {
    epoch: currentEpoch,
    validator_index: validatorIndex,
  };

  const message = Buffer.from(JSON.stringify(voluntaryExit));
  const pk = await decryptMessage(cryptoData);
  console.log(pk)
  const signature = await generateVoluntaryExitSignature(pk, '0x40000038', validatorIndex)
  console.log(signature)
  const requestBody = {
    voluntary_exit: voluntaryExit,
    signature: '0x'+toHex(signature)
  };
  
  try {
    const response = await fetch(
      `${nodeUrl}/eth/v1/beacon/pool/voluntary_exits`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      }
    );
    if (response.ok) {
      console.log(
        "Voluntary exit was submitted successfully:",
        await response.json()
      );
    } else {
      console.error(
        "Failed to submit voluntary exit:",
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    console.error("Error submitting voluntary exit:", error);
  }
}
async function generateVoluntaryExitSignature(privateKeyHex, epoch, validatorIndex) {
  const message = {
    epoch: epoch,
    validator_index: validatorIndex
  };

  const encodedMessage = Buffer.concat([
    Buffer.from(epoch.toString(16).padStart(16, '0'), 'hex'),
    Buffer.from(validatorIndex.toString(16).padStart(16, '0'), 'hex')
  ]);

  const signature = await bls.default.sign(privateKeyHex, encodedMessage);

  return signature;
}


const nodeUrl = "http://localhost:59174";
const cryptoData = {
  crypto: {
    kdf: {
      function: "pbkdf2",
      params: {
        dklen: 32,
        c: 2,
        prf: "hmac-sha256",
        salt: "d1d70c01b4541cdf4152c55a2655fe0581db54c48e2047a8a6a59addba687220",
      },
      message: "",
    },
    checksum: {
      function: "sha256",
      params: {},
      message:
        "7a8b6e14f2778d0dfc60ccc40f15d0804bf62c9c27e055ab09f9b16b8754a0ba",
    },
    cipher: {
      function: "aes-128-ctr",
      params: { iv: "17940925ccd6b4f0eeb26570b5965973" },
      message:
        "99d945d55798452b304f02168007d5fa533e3f030fda8be48d131e74975bab8e",
    },
  },
  description:
    "0x8a8bb292bcc481070d3afdbbc8789e2ab4b29c9603936e6d85f5ff71e23fc5b6d61009f0fa636b5d5b2dc309d39e3d75",
  pubkey:
    "8a8bb292bcc481070d3afdbbc8789e2ab4b29c9603936e6d85f5ff71e23fc5b6d61009f0fa636b5d5b2dc309d39e3d75",
  path: "",
  uuid: "34dbcdd1-0074-49c6-b428-d4ed5599bd6f",
  version: 4,
};
const SECRET = "_JV17RFdGZP3tTm_ofPJXBLb1aKYjTbhZYn5CsQplJA=";

submitVoluntaryExit(
  nodeUrl,
  cryptoData.crypto.cipher.message,
  cryptoData.pubkey,
  cryptoData
);
