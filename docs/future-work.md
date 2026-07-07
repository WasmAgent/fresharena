# Future Work: Additional Task Families

This document outlines potential extensions of FreshArena to additional task families beyond the initial JSON Transform world. Each proposal includes: the task family concept, current readiness status, technical challenges, and admission criteria for Phase 1+ evaluation.

## Design Principles for New Task Families

Before admitting any new task family to Phase 1 evaluation, it must satisfy all core FreshArena principles:

1. **Deterministic verification** — No LLM judgment required for correctness
2. **Fresh generation** — Large space of valid instances can be generated
3. **Reference implementation** — A correct oracle exists for all operations
4. **Property tests** — Metamorphic and invariant properties are expressible
5. **Engineering relevance** — Maps to real-world software engineering work
6. **Closed semantics** — No "best-effort" or "reasonable" interpretation needed

Task families that violate any principle may be explored in a sandbox research set but cannot enter the main evaluation track.

---

## Candidate Task Families

### 1. Data Structure World

**Concept:** Tasks involving manipulation of classic data structures (trees, graphs, heaps, tries) with explicit correctness properties.

**Example tasks:**
- Binary search tree operations (insert, delete, rebalance)
- Graph traversal and pathfinding with guaranteed optimality
- Trie prefix operations with exact match semantics
- Heap operations with explicit ordering invariants

**Current status:** ✅ Ready for Phase 1 admission

**Technical readiness:**
- ✅ Deterministic verification via property tests (BST invariants, heap order, trie correctness)
- ✅ Reference implementations exist for all classic operations
- ✅ Fresh generation via random structure generation + mutation
- ✅ Engineering relevance (indexing, caching, routing, autocomplete)
- ✅ Closed semantics (no ambiguity in correctness criteria)

**Admission criteria:**
- [ ] Design task instance schema for data structure operations
- [ ] Implement generator producing valid random structures
- [ ] Implement reference verifier with property tests
- [ ] Define 3-5 subtasks (e.g., `bst_operations.v0`, `graph_traversal.v0`)
- [ ] Create static task set (50-200 instances)

**Challenges:**
- Generator must avoid producing degenerate cases (empty trees, disconnected graphs)
- Verification requires careful property test design (e.g., heap shape vs heap order)
- Some operations have multiple valid outputs (e.g., any valid BST delete) — needs specification clarity

---

### 2. State Machine World

**Concept:** Tasks involving state machine manipulation, protocol compliance, and sequence validation with explicit transition rules.

**Example tasks:**
- HTTP request/response state machine validation
- Lock acquisition/release protocol compliance
- Transaction lifecycle management (begin, commit, rollback, recovery)
- Workflow state progression with guard conditions

**Current status:** 🟡 Partially ready — requires specification work

**Technical readiness:**
- 🟡 Deterministic verification (state transitions are fully explicit)
- 🟡 Reference implementations exist for standard protocols
- 🟡 Fresh generation via random valid sequences
- ✅ Engineering relevance (distributed systems, databases, APIs)
- ⚠️ Closed semantics depends on precise protocol specification

**Admission criteria:**
- [ ] Select 2-3 reference protocols with unambiguous specifications
- [ ] Design task schema for state machine operations
- [ ] Implement generator producing valid state sequences
- [ ] Implement verifier checking transition legality
- [ ] Define error recovery semantics (what happens on invalid transition?)

**Challenges:**
- Protocol specifications often have ambiguities or implementation-defined behavior
- Need to precisely define "error" vs "success" for every transition
- Some protocols have nondeterministic elements (timeouts, concurrent access)
- Must avoid protocols where "correctness" is debated or evolving

---

### 3. Text Processing World

**Concept:** Tasks involving structured text manipulation with explicit transformation rules and verifiable correctness.

**Example tasks:**
- Log parsing with explicit format specifications
- CSV/TSV normalization and schema migration
- Text template expansion with declared variable bindings
- Data serialization format conversion (JSON ↔ YAML ↔ XML)

**Current status:** 🟡 Partially ready — subset is viable

**Technical readiness:**
- ✅ Deterministic verification for format conversion tasks
- ✅ Reference implementations exist for standard formats
- ✅ Fresh generation via schema-driven instances
- ✅ Engineering relevance (ETL, data migration, log analysis)
- ⚠️ Natural language text is out of scope (requires LLM judgment)

**Admission criteria:**
- [ ] Restrict to structured text formats (CSV, logs, markup) — no natural language
- [ ] Design task schema for format conversion operations
- [ ] Implement generator producing valid structured text samples
- [ ] Implement verifier with schema-based validation
- [ ] Define error handling for malformed input (reject vs sanitize vs partial)

**Challenges:**
- Must avoid "fuzzy" text tasks (summarization, translation, tone adjustment)
- Format specifications often have edge cases or implementation variations
- Some formats have ambiguous standards (CSV quoting, YAML 1.2 vs 1.1)
- Error recovery behavior must be fully specified

**Not admitted:**
- ❌ Natural language processing (summarization, translation, rewriting)
- ❌ Sentiment analysis, toxicity detection, or other subjective classification
- ❌ Code style formatting (requires subjective judgment)

---

### 4. Algorithm Implementation World

**Concept:** Tasks implementing classic algorithms with input/output contracts and performance bounds.

**Example tasks:**
- Sorting with explicit stability and comparison guarantees
- Searching with exact match vs range query semantics
- String matching (Knuth-Morris-Pratt, Boyer-Moore) with position guarantees
- Numerical algorithms with precision bounds (e.g., convergence criteria)

**Current status:** 🟡 Partially ready — requires careful scoping

**Technical readiness:**
- ✅ Deterministic verification via output contracts
- ✅ Reference implementations exist for all standard algorithms
- ✅ Fresh generation via input space exploration
- 🟡 Engineering relevance (some algorithms are more relevant than others)
- ✅ Closed semantics (algorithm contracts are explicit)

**Admission criteria:**
- [ ] Select algorithms with clear correctness criteria (avoid floating-point fuzziness)
- [ ] Design task schema for algorithm problems
- [ ] Implement generator with diverse input distributions
- [ ] Implement verifier checking output correctness and performance bounds
- [ ] Define tie-breaking rules for multiple valid outputs (e.g., any valid sort order)

**Challenges:**
- Some algorithms have multiple valid implementations (e.g., any O(n log n) sort)
- Numerical algorithms require precision thresholds — what counts as "correct"?
- Must avoid overfitting to algorithm-specific trivia
- Performance bounds are environment-dependent — need to normalize

**Admitted subset:**
- ✅ Sorting and searching with explicit contracts
- ✅ String matching with position guarantees
- ✅ Graph algorithms with exact pathfinding (e.g., shortest path)

**Not admitted:**
- ❌ Floating-point algorithms without error tolerance specifications
- ❌ Approximate algorithms (probabilistic data structures, streaming algorithms)
- ❌ Algorithms where "optimality" is debated or context-dependent

---

### 5. Constraint Solving World

**Concept:** Tasks involving satisfaction of explicit constraints with validation oracles.

**Example tasks:**
- Scheduling problems with hard constraints (no overlap)
- Bin packing with explicit capacity limits
- Graph coloring with degree constraints
- SAT solving with propositional logic formulas

**Current status:** 🔴 Not ready — requires verification infrastructure

**Technical readiness:**
- ✅ Deterministic verification (constraint satisfaction is checkable)
- ✅ Reference solvers exist for many constraint problems
- ✅ Fresh generation via random constraint instances
- 🟡 Engineering relevance (varies by domain)
- ✅ Closed semantics (constraints are explicit)

**Admission criteria:**
- [ ] Select constraint domains with polynomial-time verification
- [ ] Design task schema for constraint problems
- [ ] Implement generator producing satisfiable instances
- [ ] Implement verifier checking constraint satisfaction
- [ ] Avoid NP-hard verification problems (must check solution in polynomial time)

**Challenges:**
- Some constraint problems are computationally expensive to generate
- Must ensure instances are satisfiable (or explicitly specify unsatisfiable cases)
- Optimal vs feasible solutions — need to specify acceptance criteria
- Some domains have specialized solvers that may dominate general approaches

**Admitted subset:**
- ✅ Constraint satisfaction with polynomial-time verification
- ✅ Optimization problems with explicit objective functions

**Not admitted:**
- ❌ Problems where verification is itself NP-hard
- ❌ Fuzzy constraint satisfaction (e.g., "minimize conflicts" without clear threshold)

---

### 6. Code Transformation World (Deferred)

**Concept:** Tasks involving program transformation with semantic preservation guarantees.

**Example tasks:**
- Code refactoring with behavior preservation
- API migration with explicit mapping rules
- Dead code elimination with reachability analysis
- Loop transformation with equivalence verification

**Current status:** 🔴 Deferred — requires research

**Technical readiness:**
- ⚠️ Deterministic verification requires formal semantics or differential testing
- 🟡 Reference implementations exist for some transformations
- 🟡 Fresh generation via code mutation or synthesis
- ✅ Engineering relevance (high)
- ⚠️ Closed semantics depends on precise language specification

**Admission criteria:**
- [ ] Choose a language with unambiguous semantics (avoid undefined behavior)
- [ ] Design task schema for code transformation operations
- [ ] Implement generator producing valid input programs
- [ ] Implement verifier via formal methods or extensive differential testing
- [ ] Define equivalence criteria (syntactic vs semantic vs observational)

**Challenges:**
- Most mainstream languages have undefined behavior or implementation-defined behavior
- Semantic equivalence is undecidable in general — must restrict to decidable subsets
- Requires deep program analysis infrastructure (AST, CFG, type checking)
- High risk of adversarial inputs hitting language edge cases

**Not admitted (Phase 1):**
- ❌ General-purpose code refactoring (too much semantic complexity)
- ❌ Natural language to code (requires LLM judgment)
- ❌ Code "improvement" or "optimization" (subjective)

**Potential future path:**
- 🟡 Start with highly restricted domains (e.g., JSON-to-TypeScript type generation)
- 🟡 Use DSLs with formal semantics rather than general-purpose languages
- 🟡 Focus on syntactic transformations with clear semantic preservation rules

---

## Not Admitted Task Families

The following task families are explicitly **not admitted** to Phase 1 evaluation because they violate FreshArena's core design principles:

### GitHub Issue Repair
- **Why deferred:** Boundary complexity too high for a deterministic Verifier
- **Blocker:** Real GitHub issues depend on repository context, business logic, and subjective interpretation of "fix"
- **Potential path:** Restrict to synthetic bug scenarios with explicit correctness criteria

### Natural Language Requirement Implementation
- **Why deferred:** Requires LLM judgment — violates design principle 2.3
- **Blocker:** Ambiguity in natural language specifications makes deterministic verification impossible
- **Potential path:** Use formal specification languages instead of natural language

### Large Codebase Bug Fixing
- **Why deferred:** Setup cost high; reproducibility fragile
- **Blocker:** Depends on complex repository state, build systems, and environment configuration
- **Potential path:** Use synthetic codebases with controlled dependencies

### Security Vulnerability Assessment
- **Why deferred:** False-judgment risk too high
- **Blocker:** Security assessment requires expert judgment and context-dependent analysis
- **Potential path:** Restrict to narrow, formally specified security properties (e.g., input validation rules)

### Code Quality or Elegance Judgment
- **Why deferred:** Inherently subjective
- **Blocker:** "Elegance" and "quality" cannot be verified deterministically
- **Potential path:** Use objective metrics (cyclomatic complexity, code coverage) with explicit thresholds

### UI/UX Design Tasks
- **Why deferred:** Requires human judgment and aesthetic evaluation
- **Blocker:** No deterministic oracle for "good" design
- **No clear path:** This task family likely requires a different evaluation paradigm

---

## Admission Process for New Task Families

To admit a new task family to Phase 1+ evaluation:

1. **Submit proposal** as a GitHub issue with:
   - Task family description and example tasks
   - Readiness analysis against design principles
   - Technical challenges and mitigation strategies
   - Proposed admission criteria checklist

2. **Community review** to assess:
   - Alignment with FreshArena principles
   - Engineering relevance and solver interest
   - Feasibility of generator and verifier implementation

3. **Prototype implementation** of:
   - Task instance schema
   - Generator producing 50+ valid instances
   - Reference verifier with ≥ 99% deterministic results
   - 3-5 example tasks with public test cases

4. **Pilot evaluation** with:
   - 2-3 baseline solvers (reference + weak + one LLM)
   - 100-500 generated tasks
   - Analysis of discriminative power and engineering relevance

5. **Phase 1 admission** if all criteria met:
   - Design principles satisfied
   - Pilot evaluation shows meaningful solver variance
   - Human relevance score ≥ 3/5
   - No fundamental blockers identified

---

## Priority Ranking for Next Task Families

Based on technical readiness, engineering relevance, and alignment with FreshArena principles:

1. **Data Structure World** — Highest priority
   - ✅ All design principles satisfied
   - ✅ High engineering relevance
   - ✅ Straightforward generator and verifier implementation

2. **State Machine World** — High priority
   - 🟡 Most principles satisfied (needs protocol selection work)
   - ✅ High engineering relevance
   - 🟡 Moderate implementation complexity

3. **Text Processing World** — Medium priority
   - 🟡 Subset is viable (structured formats only)
   - ✅ High engineering relevance
   - ✅ Straightforward implementation for restricted scope

4. **Algorithm Implementation World** — Medium priority
   - 🟡 Subset is viable (requires careful scoping)
   - 🟡 Medium engineering relevance
   - 🟡 Moderate implementation complexity

5. **Constraint Solving World** — Lower priority
   - ✅ Principles satisfied
   - 🟡 Medium engineering relevance
   - 🔴 Requires verification infrastructure

6. **Code Transformation World** — Research phase
   - 🔴 Deferred pending formal methods research
   - ✅ Very high engineering relevance
   - 🔴 High implementation complexity

---

## Timeline for Phase 3 Expansion

Assuming Phase 1 and Phase 2 conclusions hold (see roadmap gate condition), the proposed timeline for task family expansion is:

**Q1 (Weeks 1-4): Data Structure World**
- Design task schemas and implement generators
- Implement reference verifiers
- Create static task set (100-200 instances)
- Run pilot evaluation with baseline solvers

**Q2 (Weeks 5-8): State Machine World**
- Select reference protocols (HTTP, locking, transactions)
- Implement generators and verifiers
- Create static task set (50-100 instances)
- Run pilot evaluation

**Q3 (Weeks 9-12): Text Processing World**
- Restrict scope to structured formats (CSV, logs, markup)
- Implement generators and verifiers
- Create static task set (100-200 instances)
- Run pilot evaluation

**Q4 (Weeks 13-16): Cross-Family Evaluation**
- Run combined evaluation across all task families
- Analyze cross-family solver performance
- Update technical report with multi-family results
- Publish expanded baseline dataset

---

## References

- Design principles: [`docs/design-principles.md`](design-principles.md)
- Task family specifications: [`docs/task-family-json-transform.md`](task-family-json-transform.md)
- Component specifications: [`docs/component-specifications.md`](component-specifications.md)
- Roadmap: [`docs/roadmap.md`](roadmap.md)

---

*Last updated: 2025-07-07*
