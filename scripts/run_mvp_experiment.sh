#!/usr/bin/env bash
# Phase 0 MVP experiment runner — non-LLM baseline only, no API key required.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "=== FreshArena MVP Experiment (Non-LLM Baseline) ==="
echo ""

# 1. Build all packages
echo "[1/5] Building packages..."
bun run build

# 2. Verify the JSON transform world
echo "[2/5] Verifying json-transform world..."
bun run fresharena verify worlds/json-transform

# 3. Run non-LLM baseline evaluation
echo "[3/5] Running Non-LLM Baseline track..."
bun run fresharena run \
  --track non-llm \
  --world worlds/json-transform \
  --output "records/mvp-run-$(date +%Y%m%d-%H%M%S).jsonl" \
  --adversarial \
  --immunity-pool worlds/json-transform/immunity-pool/pool.json

# 4. Replay the most recent record to verify reproducibility
LATEST=$(ls -t records/mvp-run-*.jsonl 2>/dev/null | head -1 || true)
if [ -n "$LATEST" ]; then
  echo "[4/5] Replaying $LATEST ..."
  bun run fresharena replay "$LATEST" --strict
else
  echo "[4/5] No record found, skipping replay."
fi

# 5. Generate HTML report
echo "[5/5] Generating report..."
bun run fresharena report records/mvp-run-*.jsonl --output reports/static

echo ""
echo "=== Done. See reports/static/index.html ==="
