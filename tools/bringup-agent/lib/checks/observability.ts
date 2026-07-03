// observability goal: dashboard + Grafana serving. Reachability only (HTTP
// status), NOT a JSON parse: the dashboard serves HTML and the Grafana ingress is
// basic-auth gated (401 = up). (The Slack digest is an output action the maker
// runs, not a verifiable state — not checked here.)

import type { ObservabilityResult, StateJson } from "../types.js";

import { getStatus } from "../io.js";

export async function checkObservability(s: StateJson): Promise<ObservabilityResult> {
  const dash = s.dashboard?.running?.publicUrl;
  const graf = s.grafana?.publicUrl;
  const [d, g] = await Promise.all([getStatus(dash), getStatus(graf)]);

  // Not yet wired: kube pods -n kt-<net>-logging (loki / promtail Running).
  return {
    dashboard: { missing: dash ? undefined : "dashboard.running.publicUrl", ok: dash ? d.reachable : false, status: d.status, url: dash ?? null },
    grafana: { missing: graf ? undefined : "grafana.publicUrl", ok: graf ? g.reachable : false, status: g.status, url: graf ?? null },
    pass: Boolean(dash && d.reachable && graf && g.reachable),
  };
}
