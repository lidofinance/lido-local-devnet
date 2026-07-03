# Knowledge base

Two tiers feed `diagnosis`, plus the operational checklist for `maker`.

- **Curated tier** — `saga-eval.jsonl` below: labeled, cross-devnet, small.
- **Raw tier** — `artifacts/<net>/` (per-run numbered logs via `dlog.sh` +
  `agent-trace.jsonl` decision trace + `FINDING-*.md` notes): larger, unlabeled,
  optional (absent on a fresh devnet). `maker` writes
  it every run; `diagnosis` greps it for a matching signal and reuses the
  resolution that worked. After a run, distill notable incidents from the raw
  tier into `saga-eval.jsonl` — that is how the labeled set grows each devnet.

## Operational checklist

The front-loaded bring-up checklist (phase order + fixes to apply before the
first run) is the `maker`'s playbook. It is maintained outside this repo as a
living operating doc; mirror or link the current version here at bring-up time.
Do not duplicate a stale copy — point to the canonical one.

## saga-eval.jsonl — labeled incident corpus

One JSON object per line. Each entry is a real bring-up incident with its known
root cause and correct handling — the eval set that calibrates `diagnosis`
before it is trusted. Measure the classifier's accuracy against these labels.

Schema per line:

```
{
  "id":        "short-slug",
  "component": "chain | core | csm | cmv2 | kapi | oracles | vc | dsm",
  "signal":    "the raw failure text / symptom the maker would surface",
  "class":     "infra-retryable | image-tag-drift | wrong-branch | upstream-code-bug | governance-gate | config-front-loadable | converging-wait",
  "root_cause":"one-line root cause",
  "remediation":"what actually fixed it (or 'human' + who owns it)",
  "expected_time_to_green": "approx wall-clock, when it is a wait",
  "trap":      "the wrong move that wastes time (optional)"
}
```

Keep entries generic: symptom patterns and labels, no contract addresses, keys,
private hostnames, or internal doc/name references. The classifier needs the
signal shape and the label, not the specifics.
