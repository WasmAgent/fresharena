# open-agent-audit Integration

FreshArena produces FAEP evaluation records. `open-agent-audit` can serve as an enhanced layer for storing, auditing, and replaying those records.

## Division of responsibility

| Concern | Owner |
|---|---|
| Task generation | FreshArena |
| Solver execution | FreshArena |
| Adversarial testing | FreshArena |
| Deterministic verification | FreshArena |
| Evidence record schema (FAEP) | FreshArena |
| Long-term evidence storage | open-agent-audit |
| Audit report generation | open-agent-audit |
| Cross-run provenance tracking | open-agent-audit |
| Contestable result resolution | open-agent-audit |

## Integration timeline

**Phase 1 (now):** FreshArena runs standalone. Records are written as local JSONL files. No dependency on open-agent-audit.

**Phase 2 (optional):** FreshArena records can be exported to open-agent-audit after the FAEP record schema stabilizes. This adds long-term auditability and cross-project evidence linking.

**Phase 3:** If FreshArena becomes a hosted arena, open-agent-audit becomes the canonical evidence store.

## Minimal integration contract

When connecting, FreshArena emits one `faep_record` JSONL line per evaluation run. open-agent-audit ingests it via its standard evidence adapter. No structural changes to FAEP records are required — open-agent-audit wraps them, it does not replace them.

See [`docs/protocol-faep.md`](protocol-faep.md) for the full FAEP record schema.
