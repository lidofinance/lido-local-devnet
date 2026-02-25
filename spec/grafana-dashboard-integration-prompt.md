# Grafana Dashboard Integration Prompt

Use this companion prompt when integrating or reviewing Grafana dashboards for a new service in `lido-local-devnet`.

```text
For service `{SERVICE_NAME}` in `{LIDO_LOCAL_DEVNET_PATH}`, handle Grafana dashboard integration explicitly.

Mandatory discovery questions to ask the user first:
1. Does this service have Grafana dashboards?
2. Do you want these dashboards deployed in this environment?
3. Should deployment follow the same pattern as `evm` dashboards?

Rules:
- Do not enable dashboard deployment by default without user confirmation.
- If dashboards are required:
  - integrate dashboard lifecycle into service flow (`up`/`down`) consistently with existing patterns,
  - wire required env/config values through standard config surfaces,
  - keep deployment idempotent and compatible with existing Grafana setup.
- If dashboards are not required:
  - keep dashboard resources disabled/not deployed,
  - do not add hidden defaults that auto-enable them later.

Validation:
- Confirm dashboard resources are created only when requested.
- Confirm dashboards are visible in Grafana after deployment.
- Confirm re-running `up` does not duplicate or break dashboard provisioning.
- Confirm `down` cleans related dashboard resources if they are service-scoped.

Final output:
- discovery answers received,
- changed files,
- exact verification commands,
- deployment result for dashboards (enabled/disabled and why).
```
