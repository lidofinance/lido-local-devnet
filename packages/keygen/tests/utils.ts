import assert from "node:assert/strict";

export function compareKeystore(keystore1: any, keystore2: any) {
  assert.strictEqual(keystore1.version, keystore2.version, "Version mismatch");
  assert.strictEqual(keystore1.path, keystore2.path, "Path mismatch");
  assert.strictEqual(keystore1.pubkey, keystore2.pubkey, "Pubkey mismatch");

  assert.strictEqual(
    keystore1.crypto.kdf.function,
    keystore2.crypto.kdf.function,
    "KDF function mismatch"
  );

  assert.strictEqual(
    keystore1.crypto.kdf.message,
    keystore2.crypto.kdf.message,
    "KDF message mismatch"
  );

  assert.strictEqual(
    keystore1.crypto.checksum.function,
    keystore2.crypto.checksum.function,
    "Checksum function mismatch"
  );
  assert.deepStrictEqual(
    keystore1.crypto.checksum.params,
    keystore2.crypto.checksum.params,
    "Checksum params mismatch"
  );

  assert.strictEqual(
    keystore1.crypto.cipher.function,
    keystore2.crypto.cipher.function,
    "Cipher function mismatch"
  );
}
