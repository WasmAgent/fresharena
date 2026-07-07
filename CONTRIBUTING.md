# Contributing to FreshArena

Thank you for your interest in contributing to FreshArena! This document provides guidelines and instructions for contributing to the project.

## Project Overview

FreshArena is a **research MVP** for dynamic, verifiable, and adversarial evaluation of coding agents. Our primary research question is:

> Do the same solvers rank significantly differently on fixed public tasks vs. fresh generated tasks?

This is a Phase 1 research project focused on proving or disproving this falsifiable claim through empirical validation on JSON transformation tasks.

## Types of Contributions

We welcome several types of contributions:

### Bug Reports and Issues
- Bug reports for verifier runtime, CLI tools, or evaluation pipeline
- Documentation fixes and improvements
- Performance optimizations
- Additional test cases

### Feature Proposals
Due to our research-focused scope, **feature requests are evaluated against our design principles**:

1. **Prove first, build ecosystem later** - Features that help validate our core research question are prioritized
2. **Task scope narrow, Verifier stable first** - Only tasks with closed semantics and deterministic verification
3. **LLM cannot be the final arbiter** - All correctness judgments must come from deterministic tests
4. **Separate model capability from strategy capability** - Features must support our evaluation tracks

Features that align with these principles are welcome. Features that expand scope beyond the research MVP (global leaderboards, prize competitions, complex governance systems) are explicitly out of scope for Phase 1.

### Research Contributions
- Additional baseline solvers for comparison
- New task families within JSON transform domain
- Analysis and insights from evaluation results
- Reproducibility packages and documentation

## Development Setup

### Prerequisites
- Node.js >= 20.0.0
- Bun >= 1.1.0
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/WasmAgent/fresharena.git
cd fresharena

# Install dependencies
bun install --frozen-lockfile

# Run tests
bun run test

# Run typecheck
bun run typecheck

# Run linter
bun run lint
```

### Running FreshArena

```bash
# Run with non-LLM baseline
fresharena run examples/non-llm-baseline

# Replay a recorded evaluation
fresharena replay records/samples/sample-run.jsonl

# Verify a world
fresharena verify worlds/json-transform
```

## Making Changes

### Branch Strategy
- `main` - stable release branch
- `dev` - development branch
- Feature branches - `feature/your-feature-name`

### Commit Messages
Use clear, descriptive commit messages:
```
feat: add new baseline solver for JSON diff tasks
fix: correct verifier timeout handling in edge cases
docs: update protocol specification with new fields
test: add property-based tests for task generator
```

### Code Quality Standards

All contributions must pass:
- **Typecheck**: `bun run typecheck` - No TypeScript errors
- **Lint**: `bun run lint` - Biome formatting and linting
- **Test**: `bun run test` - All tests passing
- **Schema verification**: `node scripts/verify-schemas.mjs` - FAEP schema validation
- **Security check**: `node scripts/check-no-sensitive-info.mjs` - No secrets or tokens

### Testing Requirements

- **Unit tests**: For new functions and utilities
- **Property-based tests**: For task generators and verifiers
- **Integration tests**: For end-to-end evaluation flows
- **Reproducibility tests**: All evaluation records must be replayable

## Adding New Task Families

FreshArena is designed to support multiple task families, but Phase 1 focuses on JSON transformation. If proposing a new task family:

1. **Must have closed semantics** - correctness determined by formal spec and deterministic tests
2. **Reference implementation** - a trusted implementation for differential testing
3. **Property-based tests** - metamorphic properties for validation
4. **No LLM judges** - final correctness cannot depend on LLM arbitration

**Examples of good candidates:**
- Data format validation/conversion
- Schema migration and transformation
- Deterministic text processing
- Algorithmic problem-solving with clear correctness criteria

**Examples of poor candidates for Phase 1:**
- Natural language requirement interpretation
- Real GitHub issue repair (ambiguous requirements)
- Security vulnerability judgment (requires semantic analysis)
- Code review quality assessment (subjective)

## LLM Usage Guidelines

FreshArena uses LLMs in specific roles where they are appropriate:

**✅ LLMs may assist with:**
- Generating candidate tasks for human review
- Explaining failures and suggesting fixes
- Summarizing counterexamples and patterns
- Rewriting prompts for experimentation
- Generating candidate tests (must be validated by deterministic tests)

**❌ LLMs must NEVER serve as:**
- Final correctness judges
- Dynamic interpreters for verifier semantics
- Ranking arbiters for comparisons
- Temporary arbiters for ambiguous requirements

This is a hard constraint. Research paper conclusions cannot depend on LLM judgment.

## Issue Templates

When filing issues, please use the appropriate template:

- **Bug Report**: For bugs and unexpected behavior
- **Feature Proposal**: For new features and enhancements
- **Research Question**: For questions about methodology and results
- **Documentation**: For docs and website improvements

## Code Review Process

1. Ensure all CI checks pass
2. Update documentation if applicable
3. Add tests for new functionality
4. Submit PR with clear description of changes
5. Address review feedback
6. Maintain discussion transparency for research decisions

## Research Reproducibility

For contributions that affect evaluation results:
- Provide FAEP records for all evaluation runs
- Include environment specifications (dependencies, versions)
- Document random seeds and parameter settings
- Enable one-command reproduction where possible
- Consider publishing baseline comparisons

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.

## Questions?

- Check [docs/](docs/) for technical documentation
- Review existing issues and discussions
- Start a discussion for questions that don't fit in issues

## Related Projects

FreshArena is part of the WasmAgent research ecosystem:
- `wasmagent-js` - Sandbox/runtime reference (optional for MVP)
- `open-agent-audit` - Evidence record enhancement (optional)
- `trace-pipeline` - Training data export (Phase 2)
- `bscode` - Additional task source (Phase 2)

See [README.md](README.md) for relationship details.

---

Thank you for contributing to FreshArena! Every contribution helps us build better evaluation protocols for AI agents.
