/* eslint-disable unicorn/filename-case */
import assert from "node:assert/strict";
import test from "node:test";

import { DepositDataResult, generateDepositData } from "../src/index.js";
import { devnetFixture } from "./fixtures/fixture.js";
import { compareKeystore } from "./utils.js";

test("should generate deposit data for a single validator", async () => {
  const keyOptions = {
    mnemonic: "test test test test test test test test test test test junk",
    password: "testpassword",
  };

  const validatorOptions = {
    numValidators: 1,
    amount: 32_000_000_000, // 32 ETH in Gwei
    forkVersionString: "0x00000001",
    wcAddress: "0x000000000000000000000000000000000000dead",
    generateFrom: 0,
  };

  const result = await generateDepositData(keyOptions, validatorOptions);

  assert.strictEqual(result.length, 1, "Should generate exactly one validator");

  const { depositData, keystore } = result[0];

  assert.strictEqual(typeof depositData.pubkey, "string");
  assert.strictEqual(typeof depositData.withdrawal_credentials, "string");
  assert.strictEqual(typeof depositData.amount, "number");
  assert.strictEqual(typeof depositData.signature, "string");
  assert.strictEqual(typeof depositData.deposit_message_root, "string");
  assert.strictEqual(typeof depositData.deposit_data_root, "string");
  assert.strictEqual(typeof depositData.fork_version, "string");

  assert.strictEqual(typeof keystore, "object");
  assert.ok(keystore.crypto, "Keystore should contain a crypto object");
});

test("should generate multiple validators", async () => {
  const keyOptions = {
    mnemonic: "test test test test test test test test test test test junk",
    password: "testpassword",
  };

  const validatorOptions = {
    numValidators: 3,
    amount: 32_000_000_000,
    forkVersionString: "0x00000001",
    wcAddress: "0x000000000000000000000000000000000000dead",
    generateFrom: 0,
  };

  const result = await generateDepositData(keyOptions, validatorOptions);

  assert.strictEqual(result.length, 3, "Should generate exactly 3 validators");

  result.forEach(({ depositData }) => {
    assert.strictEqual(typeof depositData.pubkey, "string");
    assert.strictEqual(typeof depositData.withdrawal_credentials, "string");
    assert.strictEqual(depositData.amount, validatorOptions.amount);
    assert.strictEqual(typeof depositData.signature, "string");
    assert.strictEqual(typeof depositData.deposit_message_root, "string");
    assert.strictEqual(typeof depositData.deposit_data_root, "string");
    assert.strictEqual(typeof depositData.fork_version, "string");
  });
});

test("should respect generateFrom and produce unique keys", async () => {
  const keyOptions = {
    mnemonic: "test test test test test test test test test test test junk",
    password: "testpassword",
  };

  const validatorOptions = {
    numValidators: 2,
    amount: 32_000_000_000,
    forkVersionString: "0x00000001",
    wcAddress: "0x000000000000000000000000000000000000dead",
    generateFrom: 5, // Start from validator index 5
  };

  const result = await generateDepositData(keyOptions, validatorOptions);

  assert.strictEqual(result.length, 2, "Should generate exactly 2 validators");

  assert.notStrictEqual(
    result[0].depositData.pubkey,
    result[1].depositData.pubkey,
    "Generated validators should have different public keys",
  );
});

test("should throw an error for invalid numValidators", async () => {
  const keyOptions = {
    mnemonic: "test test test test test test test test test test test junk",
    password: "testpassword",
  };

  const validatorOptions = {
    numValidators: -1,
    amount: 32_000_000_000,
    forkVersionString: "0x00000001",
    wcAddress: "0x000000000000000000000000000000000000dead",
    generateFrom: 0,
  };

  await assert.rejects(
    async () => await generateDepositData(keyOptions, validatorOptions),
    /numValidators must be a positive number/,
    "Should throw an error for negative numValidators",
  );
});

test("should throw an error for invalid mnemonic", async () => {
  const keyOptions = {
    mnemonic: "invalid mnemonic string",
    password: "testpassword",
  };

  const validatorOptions = {
    numValidators: 1,
    amount: 32_000_000_000,
    forkVersionString: "0x00000001",
    wcAddress: "0x000000000000000000000000000000000000dead",
    generateFrom: 0,
  };

  await assert.rejects(
    async () => await generateDepositData(keyOptions, validatorOptions),
    /invalid mnemonic/,
    "Should throw an error for an invalid mnemonic",
  );
});

test("comparison with fixtures from deposit-cli", async () => {
  const wc = "0x48b90e15bd620e44266ccbba434c3f454a12b361";
  const keyOptions = {
    mnemonic:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    password: "12345678",
  };

  const validatorOptions = {
    numValidators: 60,
    amount: 32 * 10 ** 9,
    forkVersionString: "0x10000038",
    wcAddress: wc,
    generateFrom: 0,
  };

  const results = await generateDepositData(keyOptions, validatorOptions);

  results.forEach(({ depositData, keystore }, index) => {
    assert.deepStrictEqual(devnetFixture.depositData[index], depositData);

    const fixtureKeystores = Object.values(devnetFixture.keystores);
    const keystoreTarget = fixtureKeystores.find(
      (k) => k.pubkey === depositData.pubkey,
    );
    assert.strictEqual(
      typeof keystoreTarget,
      "object",
      `keystoreTarget not found for ${depositData.pubkey}`,
    );
    compareKeystore(keystoreTarget, keystore);
  });
});


test("comparison with fixtures from deposit-cli and check i+1 problem", async () => {
  const wc = "0x48b90e15bd620e44266ccbba434c3f454a12b361";

  const keyOptions = {
    mnemonic:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    password: "12345678",
  };

  const validatorOptions = {
    numValidators: 60,
    amount: 32 * 10 ** 9,
    forkVersionString: "0x10000038",
    wcAddress: wc,
    generateFrom: 0,
  };

  const results: DepositDataResult = [];

  for (let i = 0; i < 10; i++) {
    results.push(
      ...(await generateDepositData(keyOptions, {
        ...validatorOptions,
        generateFrom: i,
        numValidators: 1,
      })),
    );
  }

  results.forEach(({ depositData, keystore }, index) => {
    assert.deepStrictEqual(devnetFixture.depositData[index], depositData);

    const fixtureKeystores = Object.values(devnetFixture.keystores);
    const keystoreTarget = fixtureKeystores.find(
      (k) => k.pubkey === depositData.pubkey,
    );
    assert.strictEqual(
      typeof keystoreTarget,
      "object",
      `keystoreTarget not found for ${depositData.pubkey}`,
    );
    compareKeystore(keystoreTarget, keystore);
  });
});
