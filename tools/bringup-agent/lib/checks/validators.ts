// validator goal: Lido validators active_ongoing, balance not leaking. The Lido
// pubkey set comes from the KAPI key registry (KAPI URL from state.json). No
// external fallback: if KAPI is down, that is itself a finding.

import type { StateJson, ValidatorInfo, ValidatorsResult } from "../types.js";

import { VALIDATOR_BALANCE_FLOOR } from "../constants.js";
import { getJSON } from "../io.js";

export async function checkValidators(s: StateJson, kapiUrl?: string): Promise<ValidatorsResult> {
  if (!kapiUrl) return { missing: "KAPI (needed for the Lido key set)", pass: false };
  const cl = s.chain?.clPublic;

  const keys = await getJSON(`${kapiUrl}/v1/keys`);
  const data = (keys.body as { data?: { key?: string }[] } | null)?.data ?? [];
  const pubkeys = [...new Set(data.map((k) => k.key).filter(Boolean))] as string[];
  if (pubkeys.length === 0) return { count: 0, note: "no Lido keys", pass: false, source: "kapi:/v1/keys" };

  const entries = await Promise.all(
    pubkeys.map(async (pk): Promise<[string, ValidatorInfo]> => {
      const v = await getJSON(`${cl}/eth/v1/beacon/states/head/validators/${pk}`);
      const vd = (v.body as { data?: { balance?: string; status?: string } } | null)?.data;
      const status = vd?.status ?? "unknown";
      const balance = Number(vd?.balance ?? 0);
      return [pk, { active: status === "active_ongoing", balanceLeaking: balance < VALIDATOR_BALANCE_FLOOR, status }];
    }),
  );
  const validators = Object.fromEntries(entries);

  return {
    count: pubkeys.length,
    pass: Object.values(validators).every((v) => v.active && !v.balanceLeaking),
    source: "kapi:/v1/keys",
    validators,
  };
}
