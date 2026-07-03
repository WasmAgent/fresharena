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

---

## Agent Trust Infrastructure Integration

FreshArena evaluation records are designed to align with the **Agent Trust Infrastructure**'s Trust Passport and AgentBOM specifications defined in the sibling `agent-trust-infra` repository.

### Mapping FAEP Records to Trust Passport

FreshArena's `FaepRecord` serves as evidence artifacts that can be embedded within a Trust Passport:

| FAEP Field | Trust Passport Concept | Purpose |
|---|---|---|
| `run_id` | `evaluation_run_id` | Links evaluation to a specific test execution |
| `task.id` + `task.seed_hash` | `test_case_id` | Uniquely identifies the evaluated task instance |
| `solver.id` + `solver.track` | `agent_identifier` | Identifies which agent was evaluated |
| `solver.model_metadata_hash` | `agent.config_hash` | Links to AgentBOM component configuration |
| `solver.workflow_hash` | `agent.workflow_hash` | Attests to the agent's workflow/prompt configuration |
| `solver.artifact_hash` | `agent.binary_hash` | Links to the executable artifact |
| `score.canonical_pass` | `evaluation_result.pass` | Primary correctness verdict |
| `score.adversarial_pass` | `evaluation_result.adversarial_check` | Post-commit robustness evidence |
| `verifier.package` + `verifier.version` | `verifier_reference` | Links to deterministic verification standard |
| `verifier.result_hash` | `evidence_fingerprint` | Cryptographic fingerprint of the verification result |
| `replay.command` + `replay.log_hash` | `reproducibility_artifact` | Enables third-party verification |

### FAEP as AgentBOM Evidence Source

FreshArena records provide evidence that can be referenced in an AgentBOM:

1. **Component Verification**: The `solver.model_metadata_hash` and `solver.workflow_hash` provide provenance for the agent's configuration at test time.

2. **Version Evidence**: The `generator.version`, `tester.version`, and `verifier.version` fields document the full evaluation stack.

3. **Deterministic Verification**: The `verifier.result_hash` combined with `task.seed_hash` creates a reproducible fingerprint that can be independently verified.

### Consumption Pattern

To integrate FreshArena results with a Trust Passport:

```json
{
  "trust_passport": {
    "agent_id": "solver:my-agent-v1",
    "evaluations": [
      {
        "source": "FreshArena",
        "faep_record_ref": "faep:run_abc123_task_xyz789",
        "task_family": "json_transform.normalize.v0",
        "evidence_type": "deterministic_verification",
        "timestamp": "2025-01-15T10:30:00Z",
        "result": {
          "canonical_pass": true,
          "adversarial_pass": false,
          "fresh_fixed_gap": 0.15
        }
      }
    ]
  }
}
```

### Key Differences in Focus

| Aspect | FreshArena (FAEP) | Agent Trust Infrastructure |
|---|---|---|
| Primary Goal | Detect overfitting via fresh task generation | Aggregate and verify agent claims across projects |
| Evidence Type | Per-task evaluation records with adversarial checks | Cross-domain attestation and provenance |
| Replayability | Full deterministic replay via seed + verifier package | Claim verification via linked evidence artifacts |
| Freshness Check | Core: compares fresh vs fixed task performance | Optional: one of many evidence sources |

### References

- **Agent Trust Infrastructure**: https://github.com/WasmAgent/agent-trust-infra
- **Trust Passport Spec**: Trust Passport defines the standard schema for agent evaluation evidence
- **AgentBOM Spec**: AgentBOM defines the standard schema for agent component documentation
