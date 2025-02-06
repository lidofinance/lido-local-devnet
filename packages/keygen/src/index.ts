/* eslint-disable camelcase */
import {
  deriveEth2ValidatorKeys,
  deriveKeyFromMnemonic,
} from "@chainsafe/bls-keygen";
import { IKeystore, create } from "@chainsafe/bls-keystore";
import { SecretKey } from "@chainsafe/blst";
import {
  ByteVectorType,
  ContainerType,
  Type,
  UintNumberType,
} from "@chainsafe/ssz";

const Bytes4 = new ByteVectorType(4);
const Bytes48 = new ByteVectorType(48);
const Bytes32 = new ByteVectorType(32);
const Bytes96 = new ByteVectorType(96);

const UintNum64 = new UintNumberType(8);

const Root = Bytes32;
const BLSPubkey = Bytes48;
const BLSSignature = Bytes96;
const Version = Bytes4;
const Domain = Bytes32;

const DOMAIN_DEPOSIT = Uint8Array.from([3, 0, 0, 0]);
const ZERO_HASH = Buffer.alloc(32, 0);

const DepositMessage = new ContainerType(
  { pubkey: BLSPubkey, withdrawalCredentials: Bytes32, amount: UintNum64 },
  { typeName: "DepositMessage", jsonCase: "eth2" },
);

const DepositData = new ContainerType(
  {
    pubkey: BLSPubkey,
    withdrawalCredentials: Bytes32,
    amount: UintNum64,
    signature: BLSSignature,
  },
  { typeName: "DepositData", jsonCase: "eth2" },
);

const ForkData = new ContainerType(
  { currentVersion: Version, genesisValidatorsRoot: Root },
  { typeName: "ForkData", jsonCase: "eth2" },
);

const SigningData = new ContainerType(
  { objectRoot: Root, domain: Domain },
  { typeName: "SigningData", jsonCase: "eth2" },
);

const computeForkDataRoot = (
  currentVersion: Uint8Array,
  genesisValidatorsRoot: Uint8Array,
): Uint8Array =>
  ForkData.hashTreeRoot({ currentVersion, genesisValidatorsRoot });

const computeDomain = (
  domainType: Uint8Array,
  forkVersion: Uint8Array,
  genesisValidatorRoot: Uint8Array,
): Uint8Array => {
  const forkDataRoot = computeForkDataRoot(forkVersion, genesisValidatorRoot);

  const domain = new Uint8Array(32);
  domain.set(domainType, 0);
  domain.set(forkDataRoot.slice(0, 28), 4);
  return domain;
};

const computeSigningRoot = <T>(
  type: Type<T>,
  sszObject: T,
  domain: Uint8Array,
): Uint8Array => {
  const objectRoot = type.hashTreeRoot(sszObject);
  return SigningData.hashTreeRoot({ objectRoot, domain });
};

const computeRoot = async (
  depositMessage: {
    amount: number;
    pubkey: Uint8Array;
    withdrawalCredentials: Uint8Array;
  },
  forkVersion: Uint8Array,
) => {
  // An empty ZERO_HASH is used for deposits
  // https://github.com/ethereum/staking-deposit-cli/blob/948d3fc358fdae54ff47dd8045206276b0b6b914/staking_deposit/utils/ssz.py#L70
  const domain = computeDomain(DOMAIN_DEPOSIT, forkVersion, ZERO_HASH);

  const signingRoot = computeSigningRoot(
    DepositMessage,
    depositMessage,
    domain,
  );

  return signingRoot;
};

export type DepositDataResult = {
  depositData: {
    amount: number;
    deposit_data_root: string;
    deposit_message_root: string;
    fork_version: string;
    pubkey: string;
    signature: string;
    withdrawal_credentials: string;
  };
  keystore: IKeystore;
}[];

export async function generateDepositData(
  mnemonic: string,
  password: string,
  numValidators: number,
  amount: number,
  forkVersionString: string,
  wcAddress: string,
) {
  const forkVersion = Version.fromJson(forkVersionString);
  const masterSK = await deriveKeyFromMnemonic(mnemonic);
  const results: DepositDataResult = [];

  for (let index = 0; index < numValidators; index++) {
    const { signing } = deriveEth2ValidatorKeys(masterSK, index);

    const secretKey = SecretKey.fromBytes(signing);
    const publicKey = secretKey.toPublicKey();

    const withdrawalCredentials = Uint8Array.from([
      0x01,
      ...new Uint8Array(11),
      ...Uint8Array.from(Buffer.from(wcAddress.slice(2), "hex")),
    ]);

    const depositMessage = {
      pubkey: publicKey.toBytes(),
      withdrawalCredentials,
      amount,
    };

    const depositMessageRoot = DepositMessage.hashTreeRoot(depositMessage);

    const signingRoot = await computeRoot(depositMessage, forkVersion);

    const signature = secretKey.sign(signingRoot);

    const depositData = {
      ...depositMessage,
      signature: signature.toBytes(),
    };

    const depositDataRoot = DepositData.hashTreeRoot(depositData);

    const keystore = await create(
      password,
      secretKey.toBytes(),
      publicKey.toBytes(),
      `m/12381/3600/${index}/0/0`,
      // "Validator Keystore"
    );

    results.push({
      keystore,
      depositData: {
        pubkey: Buffer.from(depositMessage.pubkey).toString("hex"),
        withdrawal_credentials: Buffer.from(
          depositMessage.withdrawalCredentials,
        ).toString("hex"),
        amount: depositMessage.amount,
        signature: Buffer.from(depositData.signature).toString("hex"),
        deposit_message_root: Buffer.from(depositMessageRoot).toString("hex"),
        deposit_data_root: Buffer.from(depositDataRoot).toString("hex"),
        fork_version: Buffer.from(forkVersion).toString("hex"),
      },
    });
  }

  return results;
}
