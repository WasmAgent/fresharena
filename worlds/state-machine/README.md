# State Machine World

The State Machine World covers finite-state verification tasks with closed
semantics:

| Subtask | Priority | Verification |
|---|---|---|
| `reachability` | P0 | graph search from the initial state to a target state |
| `invariant` | P0 | graph search plus predicate checks over every reachable state |
| `trace_equivalence` | P1 | bounded labeled-trace language comparison |

The initial static set contains 54 tasks: 18 reachability, 18 invariant, and 18
trace-equivalence tasks. Each task has an explicit transition system, expected
answer, and deterministic verifier semantics in `verifier/verifier-package.json`.

## Admissibility requirements

All tasks in this world must satisfy:

- `deterministic: true` - output fully determined by the transition relation and task spec
- `reference_solvable: true` - verifier semantics produce the recorded answer
- `duplicate_distance_above_threshold: true` - task structures and labels vary across the static set
- `no_ambiguous_policy: true` - no informal or underspecified transition rules
- `cost_within_limit: true` - finite explicit graphs and bounded trace depth
- `engineering_relevance_min: true` - scenarios map to common workflow, protocol, and lifecycle state machines

## Directory layout

```
state-machine/
  tasks/       # Static task set of 50+ state-machine tasks
  verifier/    # Deterministic verifier package metadata and semantics
```
