# Service Integration Prompt (lido-local-devnet)

Use this prompt when integrating a new service into `lido-local-devnet` with full Docker build/push and Kubernetes deployment flow (like `evm`, `onchain-mon`, `oracles-k8s`).

```text
Integrate a new service `{SERVICE_NAME}` into `{LIDO_LOCAL_DEVNET_PATH}` using the same patterns as `evm`, `onchain-mon`, and `oracles-k8s`.

Context:
- Service repo: `{SERVICE_REPO_PATH}`
- Devnet repo: `{LIDO_LOCAL_DEVNET_PATH}`
- Target network/stand: `{NETWORK_NAME}`
- Docker registry: `{DOCKER_REGISTRY}`
- Docker image: `{IMAGE_REPO}:{IMAGE_TAG}`
- K8s namespace/release naming pattern: `{K8S_NAMESPACE_PATTERN}`

Requirements:
1. Start with a short implementation plan (what will be changed and where), then implement immediately.
2. Before implementation, explicitly ask the user:
   - whether this service has Grafana dashboards,
   - whether dashboards should be deployed in this environment,
   - whether deployment must follow the same pattern as `evm` dashboards.
   Do not assume dashboard deployment by default if user did not confirm.
3. The service must:
   - build locally in Docker,
   - push to the configured registry,
   - deploy to Kubernetes via Helm,
   - support idempotent `up` and clean `down`.
4. Implement full lifecycle commands similar to existing services:
   - `build`, `up`, `down`, and `status/logs` if needed.
5. Follow existing `lido-local-devnet` architecture and patterns:
   - commands in `src/commands/*`,
   - embedded service wiring in `packages/services/src/embedded/*`,
   - state/config integration,
   - stand integration in `src/commands/stands/*`.
6. Source preparation and repository sync must be implemented in a unified way:
   - do not duplicate custom clone/fetch/checkout/copy logic in each service command,
   - use shared helpers from `src/commands/shared/prepare-source.helpers.ts`,
   - for standard repository-backed services, call shared `prepareRepositoryBackedServiceSource(...)` directly from `build`,
   - add service-specific `prepare-source.helpers.ts` only when extra source post-processing is required (for example generated config/json),
   - for clean redeploy, ensure source repo can be auto-cloned and synced to configured `repository.branch`,
   - always sync source from `repository` during `build/up`,
   - keep managed source checkout inside service artifacts (for example, `artifacts/<network>/<service>/repository-source`).
7. Pass runtime config via env/values (no hardcoded secrets).
8. If dependencies are needed (NATS, ClickHouse, etc.), deploy them as separate releases/resources similarly to existing integrations.
9. If dashboards are enabled by user, integrate dashboard provisioning/deployment flow similarly to `evm` (including lifecycle behavior and environment wiring).
10. If changes are required in external/original service repos:
   - patch original repos (avoid local overrides when possible),
   - use/create branch `{FEATURE_BRANCH}`,
   - set that branch as default source branch in `lido-local-devnet` for this service.
11. Keep compatibility with mainnet/hoodi:
   - devnet-specific logic must be explicit and isolated by chain/network conditions.
12. Final output must include:
   - changed files list,
   - exact validation commands,
   - what was verified (build/push/deploy/logs/health),
   - and, if applicable, dashboard deployment verification.

Acceptance criteria:
- `./bin/run.js {SERVICE_COMMAND} up --network {NETWORK_NAME}` deploys successfully.
- Kubernetes pod(s) are Ready.
- Service logs have no fatal startup/runtime errors.
- Re-running `up` does not break the environment.
- `down` removes releases/resources cleanly.
- Type checks/lint pass where applicable (e.g. `yarn tsc --noEmit`).
- Source preparation logic reuses shared helpers (no duplicated per-service git-sync implementations), with direct shared call in `build` unless service-specific post-processing is needed.
- If dashboards were requested, they are deployed and visible in Grafana; if not requested, dashboard resources are not deployed.

Work directly in files and run commands; do not stop at a proposal-only response.
```
