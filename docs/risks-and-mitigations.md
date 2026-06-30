# Risks and Mitigations

| # | Risk | Severity | Decision |
|---|---|---|---|
| R1 | Verifier cannot cover real engineering semantics | Critical | Only admit closed-semantics tasks in Phase 1 — see [component-specifications.md](component-specifications.md) task admission checklist |
| R2 | Generator produces meaningless puzzles | High | Engineering relevance gate + 5% human sampling — see [component-specifications.md](component-specifications.md) generator hard rules |
| R3 | Ecosystem cold start | High | No ecosystem in Phase 1 — only internal research MVP with all assets provided by the project |
| R4 | LLM differences mask component capability differences | High | Separate Model-Fixed / Model-Open tracks; main conclusions only from Model-Fixed |
| R5 | API cost blocks participation | Medium-High | Non-LLM Baseline track is fully functional with zero API cost; LLM tracks are opt-in |
| R6 | Narrow task scope limits impact | Medium | Phase 1 proves the method first; task scope expands only in Phase 3 |
| R7 | No high-profile endorsement limits adoption | Medium-High | Release technical report and reproducible experiments first; credibility before community |
| R8 | Adversarial testing cost spirals | Medium | Fixed budget per solver; marginal contribution scoring to prioritize high-value counterexamples |
| R9 | Rankings misread as single aggregate score | Medium | No single total score; always report four separate board views |

## Notes on critical risks

### R1 — Verifier correctness

This is the single largest existential risk. A Verifier that incorrectly accepts wrong answers, or inconsistently rejects correct answers, invalidates all results. The mitigation is conservative task selection — if we cannot write a deterministic oracle for it, it does not enter Phase 1. There is no fallback plan that allows LLM-judged correctness into main results.

### R3 — Cold start

FreshArena must ship its first release with a complete minimal loop built internally:

- 1 task world (JSON Transform)
- 3 generators (random, curriculum, adversarial)
- 4 testers (property-based, metamorphic, differential, boundary)
- 5–7 solvers (reference, weak, buggy × 3, LLM × 2)
- 50–200 fixed tasks
- 500–2000 fresh generated tasks
- 20+ confirmed counterexamples
- Sample evaluation records
- Static HTML report

The first users are researchers, not general developers. The goal is to be credible to that audience before opening to others.
