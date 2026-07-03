// Read-only IO helpers: HTTP GET, kubectl, address resolution, snapshot files.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { AddrNode, Fetched, KubeResult, PrevSnapshot, StateJson } from "./types.js";

export const readState = (p: string): StateJson => JSON.parse(readFileSync(p, "utf8")) as StateJson;

export async function getJSON(url?: string): Promise<Fetched> {
  if (!url) return { missing: true, ok: false, status: 0 };
  try {
    const r = await fetch(url);
    return { body: r.ok ? await r.json() : null, ok: r.ok, status: r.status };
  } catch (error) {
    return { ok: false, status: 0, unreachable: String(error) };
  }
}

// HTTP reachability without parsing the body (dashboard serves HTML; a basic-auth
// gated ingress answers 401 — both mean the service is up). reachable = any
// non-5xx HTTP response (as opposed to a connection failure).
export async function getStatus(url?: string): Promise<{ ok: boolean; reachable: boolean; status: number }> {
  if (!url) return { ok: false, reachable: false, status: 0 };
  try {
    const r = await fetch(url);
    return { ok: r.ok, reachable: r.status >= 200 && r.status < 500, status: r.status };
  } catch {
    return { ok: false, reachable: false, status: 0 };
  }
}

// Run kubectl read-only. Distinguishes "kube-API unreachable" (tunnel down / no
// access) from a successful call. Captures stderr (so it never leaks) and bounds
// the wait with --request-timeout.
export function kube(args: string[]): KubeResult {
  try {
    const stdout = execFileSync("kubectl", [...args, "--request-timeout=8s"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stdout, unreachable: false };
  } catch (error) {
    const e = error as { stderr?: Buffer; stdout?: Buffer };
    const stderr = e.stderr?.toString() ?? "";
    const unreachable = /connection.*refused|was refused|unable to connect|dial tcp|no such host|did you specify the right host/i.test(stderr);
    return { ok: false, stdout: e.stdout?.toString() ?? "", unreachable };
  }
}

// resolve "0x..", {address}, or {proxy:{address}} -> address string
export function addrOf(node: AddrNode): null | string {
  if (!node) return null;
  if (typeof node === "string") return node;
  return node.proxy?.address ?? node.address ?? null;
}

export function get(obj: unknown, keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) cur = (cur as Record<string, unknown> | undefined)?.[k];
  return cur;
}

// derive the network name from an ingress host: http://<prefix>.<net>.<...>
export function networkName(s: StateJson): null | string {
  const host = s.chain?.clPublic ?? s.nodesIngress?.cl?.[0]?.publicIngressUrl ?? "";
  const m = host.match(/^https?:\/\/[^.]+\.([^.]+)\./);
  return s.net ?? (m ? m[1] : null);
}

export const snapshotDir = (net: null | string): string => path.join("artifacts", net ?? "devnet");

export function prevSnapshot(dir: string): PrevSnapshot | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => /^verify-.*\.json$/.test(f)).sort();
  const last = files.at(-1);
  return last ? (JSON.parse(readFileSync(path.join(dir, last), "utf8")) as PrevSnapshot) : null;
}

export function writeSnapshot(dir: string, snap: { ts: string }): void {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `verify-${snap.ts.replaceAll(/[.:]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(snap, null, 2));
}
