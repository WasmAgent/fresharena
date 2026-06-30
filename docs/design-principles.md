# Design Principles

## 2.1 Prove first, build ecosystem later

FreshArena Phase 1 is a **research MVP**, not a platform. The sole goal is to prove or disprove one falsifiable claim:

> Dynamic task generation and submit-then-test adversarial testing reveal solver capability differences that fixed benchmarks cannot.

If this claim cannot be demonstrated, everything else — leaderboards, plugin markets, distributed nodes, governance — has no foundation.

**Explicitly out of scope for Phase 1:**

- Global public leaderboard
- Prize competitions
- Open plugin market
- Large-scale distributed evaluation nodes
- Multiple task worlds
- Full governance committee
- Complex standard proposal system

## 2.2 Task scope narrow, Verifier stable first

The Verifier is FreshArena's most critical and fragile component. A Verifier that can be wrong or gamed invalidates every result.

Phase 1 must only admit tasks with **closed semantics**: tasks where correctness is fully determined by a formal spec, a reference implementation, and deterministic test oracles — with no room for interpretation.

**Chosen first world:** JSON Transform (normalize, diff/patch, merge, schema migration)

**Rationale:** explicit input/output structure, large generatable instance space, reference implementation exists, metamorphic properties are easy to express, relates to real engineering work (config patching, API payload migration, data sync), no LLM judge required.

**Explicitly deferred:**

- Real GitHub issue repair
- Natural language requirement repair
- Large codebase bug fixing
- Security vulnerability judgment
- Tasks requiring LLM semantic arbitration

## 2.3 LLM cannot be the final arbiter

LLMs may assist with generating candidate tasks, explaining failures, summarizing counterexamples, rewriting prompts, and generating candidate tests.

LLMs must **never** serve as:

- Final correctness judges
- Dynamic interpreters for Verifier semantics
- Ranking arbiters
- Temporary arbiters for ambiguous requirements

Final judgment must always come from: reference implementations, deterministic test runners, property-based testing, metamorphic testing, differential testing, or replayable sandboxes.

This is a hard constraint, not a preference. Any result dependent on LLM judgment cannot be cited as a main paper conclusion.

## 2.4 Separate model capability from strategy capability

Different LLMs produce different results. FreshArena does not force a single LLM, but it also cannot let LLM choice contaminate strategy comparison.

The solution is **separate evaluation tracks**:

| Track | Purpose | LLM | Suitable for |
|---|---|---|---|
| **Model-Fixed** | Compare agent workflow / prompt / tool strategies | Fixed model, fixed temperature, fixed budget | Research experiments, main paper conclusions |
| **Model-Open** | Compare full product capability | Any | Product teams, real-world users |
| **Non-LLM Baseline** | Reproducible lower bound, zero API cost | None | Local dev, CI regression |
| **Budget-Normalized** | Compare cost efficiency | Any, fixed budget | Open source community, CI |

**Core rule: main paper conclusions must come from the Model-Fixed track. Model-Open results may appear in appendices but must not be mixed into the primary ranking.**
