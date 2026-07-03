// KAPI goal: /v1/status -> 200, and modules are present.

import type { KapiResult, StateJson } from "../types.js";

import { getJSON } from "../io.js";

export async function checkKapi(s: StateJson): Promise<KapiResult> {
  const url = s.kapiK8s?.running?.publicUrl;
  if (!url) return { missing: "kapiK8s.running.publicUrl (KAPI not up?)", pass: false };

  const [status, modules] = await Promise.all([getJSON(`${url}/v1/status`), getJSON(`${url}/v1/modules`)]);
  const mods = (modules.body as { data?: unknown[] } | null)?.data ?? [];

  return { modulesNonEmpty: mods.length > 0, pass: status.ok, status200: status.ok, url };
}
