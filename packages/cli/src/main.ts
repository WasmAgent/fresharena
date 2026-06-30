#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('fresharena')
  .description('FreshArena — dynamic, verifiable, adversarial evaluation for coding agents')
  .version('0.1.0');

program
  .command('run')
  .description('Run an evaluation against a task world')
  .option('--track <track>', 'Evaluation track (non-llm | model-fixed | model-open | budget-normalized)', 'non-llm')
  .option('--world <path>', 'Path to task world directory', 'worlds/json-transform')
  .option('--solver <path>', 'Path to solver directory')
  .option('--output <path>', 'Output path for FAEP record (JSONL)')
  .option('--adversarial', 'Enable submit-then-test adversarial tester', false)
  .option('--immunity-pool <path>', 'Path to Public Immunity Pool')
  .action(async (_opts) => {
    // TODO Phase 0: implement run command
    console.log('fresharena run: not yet implemented');
    process.exit(1);
  });

program
  .command('replay')
  .description('Replay a recorded FAEP evaluation and verify reproducibility')
  .argument('<record>', 'Path to FAEP JSONL record')
  .option('--strict', 'Fail on any score divergence', false)
  .action(async (_record, _opts) => {
    // TODO Phase 0: implement replay command
    console.log('fresharena replay: not yet implemented');
    process.exit(1);
  });

program
  .command('verify')
  .description('Verify the integrity of a task world (generator + verifier + testers)')
  .argument('<world>', 'Path to task world directory')
  .action(async (_world) => {
    // TODO Phase 0: implement verify command
    console.log('fresharena verify: not yet implemented');
    process.exit(1);
  });

program
  .command('report')
  .description('Generate an HTML report from one or more FAEP records')
  .argument('<records...>', 'Paths to FAEP JSONL records')
  .option('--output <dir>', 'Output directory for HTML report', 'reports/static')
  .action(async (_records, _opts) => {
    // TODO Phase 0: implement report command
    console.log('fresharena report: not yet implemented');
    process.exit(1);
  });

program.parse();
