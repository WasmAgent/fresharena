# Contributing to FreshArena

Thank you for your interest in contributing to FreshArena! This document explains how to participate in the project, whether you're running baseline evaluations, submitting solver implementations, or confirming reproduction results.

---

## Quick Start for Contributors

```bash
# Clone the repository
git clone https://github.com/WasmAgent/fresharena.git
cd fresharena

# Install dependencies
bun install

# Run the non-LLM baseline (no API key required)
bun run fresharena run examples/non-llm-baseline

# Verify your installation
bun run fresharena verify worlds/json-transform
```

---

## For External Agent Projects: Confirming Baseline Reproduction

We invite external agent projects to confirm their ability to reproduce FreshArena baseline results. This process helps establish FreshArena as a credible, reproducible evaluation standard.

### Step 1: Set Up the Environment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/WasmAgent/fresharena.git
   cd fresharena
   ```

2. **Install dependencies:**
   ```bash
   bun install --frozen-lockfile
   ```

3. **Verify the installation:**
   ```bash
   bun run fresharena verify worlds/json-transform
   ```

### Step 2: Reproduce Published Baseline Results

The published baseline results are documented in [`docs/baseline-results.md`](docs/baseline-results.md). To reproduce them:

```bash
# Replay the recorded baseline evaluation
bun run fresharena replay records/samples/sample-run.jsonl
```

This command should produce identical scores to those published in the baseline results document. The replay is deterministic — given the same FAEP record, it produces identical output.

### Step 3: Run Your Own Evaluation

To evaluate your agent on FreshArena tasks:

1. **Implement a FreshArena-compatible solver** — See the solver interface documentation in [`docs/component-specifications.md`](docs/component-specifications.md).

2. **Run evaluation on the non-LLM baseline track** (zero API cost):
   ```bash
   bun run fresharena run examples/non-llm-baseline --solver your-solver-id
   ```

3. **Run evaluation on the LLM track** (requires API keys):
   ```bash
   bun run fresharena run examples/llm-baseline --solver your-solver-id
   ```

### Step 4: Confirm Your Results

To submit your reproduction confirmation:

1. **Generate a FAEP record** of your evaluation run.
2. **Verify replay consistency:**
   ```bash
   bun run fresharena replay your-record.jsonl --strict
   ```
3. **Open a GitHub issue** with the title format: `[Reproduction Confirmation] <Your Agent Project Name>` and include:
   - Your agent project name and repository URL
   - The FAEP record hash
   - Comparison of your results to the published baseline
   - Any observations or notes about the reproduction process

Your confirmation will be reviewed and added to the list of external projects that have successfully reproduced FreshArena baseline results.

---

## Development Workflow

### Running Tests

```bash
# Run all tests
bun test

# Run tests for a specific package
bun test --filter @fresharena/core

# Run tests with coverage
bun test --coverage
```

### Type Checking and Linting

```bash
# Typecheck all packages
bun run typecheck

# Lint code with Biome
bun run lint

# Auto-fix lint issues
bun run lint:fix
```

### Building

```bash
# Build all packages
bun run build

# Build a specific package
bun run build --filter @fresharena/cli
```

---

## Project Structure

```
fresharena/
  packages/
    faep-schema/        # FAEP v0.1 record schema + Zod types
    core/               # Shared evaluation engine
    cli/                # fresharena CLI
    verifier-runtime/   # Deterministic verifier sandbox
    reporter/           # HTML / JSONL report generation
  worlds/
    json-transform/     # First task world: JSON normalize, diff, patch, merge
  solvers/
    non-llm/            # Reference, weak, and buggy baseline solvers
    llm/                # LLM solver adapters (OpenAI-compatible, Anthropic, local)
  docs/                 # Protocol spec, scoring, experiment design
```

---

## Submitting Changes

We follow a standard GitHub flow:

1. **Fork the repository** and create a branch from `main`.
2. **Make your changes** with clear commit messages.
3. **Run tests and linting** to ensure quality:
   ```bash
   bun run lint
   bun run typecheck
   bun run test
   ```
4. **Submit a pull request** with a description of your changes.
5. **Address review feedback** and wait for CI to pass.

### Commit Message Convention

We use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `chore:` Build/tooling changes

---

## Adding New Task Families

To add a new task family to FreshArena:

1. **Create a new world directory** under `worlds/<task-family>/`
2. **Implement the required components:**
   - `generator/` — Task generator with seed-based RNG
   - `testers/` — Property-based tester
   - `verifier/` — Deterministic verifier package
3. **Add world configuration** to `worlds/<task-family>/world.json`
4. **Document the task family** in `docs/task-family-<name>.md`
5. **Submit a pull request** for review.

---

## License

By contributing to FreshArena, you agree that your contributions will be licensed under the [Apache-2.0 License](LICENSE).

---

## Questions?

- Open a GitHub issue for bugs or feature requests.
- Join discussions in GitHub Discussions.
- Check the [Documentation](docs/) for more details.

Thank you for contributing to FreshArena!
