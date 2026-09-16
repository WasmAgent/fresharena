#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';

const program = new Command();

program
  .name('fresharena')
  .description('FreshArena — dynamic, verifiable, adversarial evaluation for coding agents')
  .version('0.1.0');

program
  .command('run')
  .description('Run a non-LLM evaluation against a task world and emit a FAEP record')
  .option('--world <path>', 'Path to task world directory', 'worlds/json-transform')
  .option('--solver <id>', 'Solver id (reference | weak | buggy-A | buggy-B | buggy-C)', 'reference')
  .option('--output <path>', 'Output path for FAEP record (JSONL)', 'records/samples/sample-run.jsonl')
  .option('--adversarial', 'Enable the property-differential adversarial tester', false)
  .action(async (opts: { world: string; solver: string; output: string; adversarial: boolean }) => {
    const { runEval } = await import('@fresharena/core');
    const { generateTaskAt } = await import('@fresharena/core');
    const { solverMetadata } = await import('@fresharena/core');

    const worldJson = join(opts.world, 'world.json');
    if (!existsSync(worldJson)) {
      console.error(`fresharena run: world manifest not found at ${worldJson}`);
      process.exit(1);
    }
    const world = JSON.parse(readFileSync(worldJson, 'utf-8')) as {
      world_id: string;
      families: Array<{ id: string }>;
    };
    const familyId = world.families.at(0)?.id;
    if (familyId === undefined) {
      console.error(`fresharena run: world ${world.world_id} declares no task families`);
      process.exit(1);
    }

    // Deterministic root seed for the slice: the first family id. The same
    // world always produces the same task stream.
    const { task } = generateTaskAt(familyId, 0);
    const result = await runEval({
      taskSpec: task,
      solver: solverMetadata(opts.solver),
      track: 'non_llm',
      worldDir: opts.world,
      outputPath: opts.output,
      runAdversarialTester: opts.adversarial,
    });

    const s = result.record.score;
    console.log(`fresharena run: ${result.passed ? 'PASS' : 'FAIL'} (${result.durationMs} ms)`);
    console.log(`  solver:   ${opts.solver}`);
    console.log(`  task:     ${result.record.task.id}`);
    console.log(`  canonical_pass=${s.canonical_pass} hidden_pass=${s.hidden_pass} adversarial_pass=${s.adversarial_pass}`);
    console.log(`  record:   ${opts.output}`);
    console.log(`  replay:   ${result.record.replay.command}`);
    if (!result.passed) process.exit(1);
  });

program
  .command('replay')
  .description('Replay a recorded FAEP evaluation and verify score reproducibility')
  .argument('<record>', 'Path to FAEP JSONL record')
  .option('--root-seed <seed>', 'Root seed (defaults to the seed recorded in the record)')
  .option('--strict', 'Fail on any score divergence', false)
  .action(async (record: string, opts: { rootSeed?: string; strict: boolean }) => {
    const { replay } = await import('@fresharena/core');

    const result = await replay({
      recordPath: record,
      ...(opts.rootSeed !== undefined ? { rootSeed: opts.rootSeed } : {}),
      strict: opts.strict,
    });
    console.log(`fresharena replay: ${result.matches ? 'REPRODUCIBLE' : 'DIVERGED'}`);
    if (result.matches) {
      console.log(`  score: canonical_pass=${result.replayedScore.canonical_pass} hidden_pass=${result.replayedScore.hidden_pass}`);
    } else {
      for (const d of result.divergences) console.log(`  divergence: ${d}`);
    }
    if (!result.matches) process.exit(1);
  });

program
  .command('verify')
  .description('Verify the integrity of a task world (manifest + families + admissible generation)')
  .argument('<world>', 'Path to task world directory')
  .action(async (world: string) => {
    const { generateTasks } = await import('@fresharena/core');

    const worldJson = join(world, 'world.json');
    if (!existsSync(worldJson)) {
      console.error(`fresharena verify: world manifest not found at ${worldJson}`);
      process.exit(1);
    }
    const parsed = JSON.parse(readFileSync(worldJson, 'utf-8')) as {
      world_id: string;
      version: string;
      families: Array<{ id: string; priority?: string; verifier?: string }>;
    };
    if (parsed.families.length === 0) {
      console.error('fresharena verify: world declares no task families');
      process.exit(1);
    }

    // Admissibility: generate a small deterministic batch from the first
    // family and confirm every candidate passes the admissibility gate.
    const familyId = parsed.families.at(0)!.id!;
    const report = generateTasks({ family: familyId as never, count: 5, rootSeed: familyId }).report;

    const verifierDir = join(world, 'verifier');
    const hasVerifier = existsSync(verifierDir);
    const ok = report.passed === report.total && hasVerifier;

    console.log(`fresharena verify: ${ok ? 'OK' : 'FAILED'} (${world})`);
    console.log(`  families: ${parsed.families.map((f) => f.id).join(', ')}`);
    console.log(`  admissibility: ${report.passed}/${report.total} passed`);
    console.log(`  verifier package: ${hasVerifier ? 'present' : 'MISSING'}`);
    if (!ok) process.exit(1);
  });

program
  .command('report')
  .description('Generate an HTML report from one or more FAEP records (planned — not yet implemented)')
  .action(async () => {
    console.error('fresharena report: planned — see packages/reporter (Phase 0 follow-up, issue #133 documents the slice boundary)');
    process.exit(1);
  });

program.parse();
