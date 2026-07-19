#!/usr/bin/env node
/**
 * Verifies that FAEP schema JSON files are present and structurally valid.
 */

import { readFileSync, existsSync } from 'fs';

const REQUIRED_SCHEMAS = [
  'worlds/json-transform/world.json',
  'worlds/json-transform/verifier/verifier-package.json',
  'worlds/json-transform/generator/generators.json',
  'worlds/json-transform/testers/testers.json',
  'worlds/json-transform/immunity-pool/pool.json',
  'worlds/state-machine/world.json',
  'worlds/state-machine/verifier/verifier-package.json',
  'worlds/state-machine/tasks/static-tasks.json',
  'records/samples/.gitkeep',
];

const root = new URL('..', import.meta.url).pathname;
let failures = 0;

function fail(message) {
  console.error(message);
  failures++;
}

for (const rel of REQUIRED_SCHEMAS) {
  const full = `${root}/${rel}`;
  if (!existsSync(full)) {
    fail(`MISSING: ${rel}`);
    continue;
  }
  if (rel.endsWith('.json')) {
    try {
      JSON.parse(readFileSync(full, 'utf8'));
    } catch (e) {
      fail(`INVALID JSON: ${rel} — ${e.message}`);
    }
  }
}

function reachableStates(machine) {
  const seen = new Set([machine.initial_state]);
  const queue = [machine.initial_state];

  for (let i = 0; i < queue.length; i++) {
    const state = queue[i];
    for (const transition of machine.transitions ?? []) {
      if (transition.from === state && !seen.has(transition.to)) {
        seen.add(transition.to);
        queue.push(transition.to);
      }
    }
  }

  return seen;
}

function invariantHolds(state, invariant) {
  if ('forbidden_states' in invariant) return !invariant.forbidden_states.includes(state);
  if ('allowed_states' in invariant) return invariant.allowed_states.includes(state);
  if ('required_prefix' in invariant) {
    return invariant.state_labels[state]?.includes(invariant.required_prefix) ?? false;
  }
  return (invariant.state_ranks[state] ?? Number.POSITIVE_INFINITY) <= invariant.max_rank;
}

function traces(machine, maxDepth) {
  const out = new Set(['']);
  let frontier = [{ state: machine.initial_state, trace: '' }];

  for (let depth = 0; depth < maxDepth; depth++) {
    const next = [];
    for (const item of frontier) {
      for (const transition of machine.transitions ?? []) {
        if (transition.from !== item.state) continue;
        const trace = item.trace === '' ? transition.action : `${item.trace} ${transition.action}`;
        out.add(trace);
        next.push({ state: transition.to, trace });
      }
    }
    frontier = next;
  }

  return out;
}

function evaluateStateMachineTask(task) {
  if (task.family === 'state_machine.reachability.v0') {
    return reachableStates(task.spec).has(task.spec.target_state);
  }

  if (task.family === 'state_machine.invariant.v0') {
    for (const state of reachableStates(task.spec)) {
      if (!invariantHolds(state, task.spec.invariant)) return false;
    }
    return true;
  }

  if (task.family === 'state_machine.trace_equivalence.v0') {
    const left = traces(task.spec.left, task.spec.max_depth);
    const right = traces(task.spec.right, task.spec.max_depth);
    if (left.size !== right.size) return false;
    for (const trace of left) {
      if (!right.has(trace)) return false;
    }
    return true;
  }

  throw new Error(`Unsupported state-machine family: ${task.family}`);
}

function verifyStateMachineWorld() {
  const world = JSON.parse(readFileSync(`${root}/worlds/state-machine/world.json`, 'utf8'));
  const tasks = JSON.parse(readFileSync(`${root}/worlds/state-machine/tasks/static-tasks.json`, 'utf8'));
  const verifier = JSON.parse(readFileSync(`${root}/worlds/state-machine/verifier/verifier-package.json`, 'utf8'));

  if (world.world_id !== 'state-machine') fail('INVALID STATE MACHINE WORLD: world_id must be state-machine');
  if (verifier.verifier_package?.id !== 'state_machine_verifier') {
    fail('INVALID STATE MACHINE VERIFIER: verifier_package.id must be state_machine_verifier');
  }
  if (tasks.world_id !== world.world_id) fail('INVALID STATE MACHINE TASKS: world_id must match world.json');
  if (tasks.task_count !== tasks.tasks.length) {
    fail(`INVALID STATE MACHINE TASKS: task_count ${tasks.task_count} does not match ${tasks.tasks.length}`);
  }
  if (tasks.tasks.length < 50) {
    fail(`INVALID STATE MACHINE TASKS: expected at least 50 tasks, found ${tasks.tasks.length}`);
  }

  const registeredFamilies = new Set(world.families.map((family) => family.id));
  const familyCounts = new Map();
  for (const task of tasks.tasks) {
    if (!registeredFamilies.has(task.family)) {
      fail(`INVALID STATE MACHINE TASK: ${task.id} uses unregistered family ${task.family}`);
    }
    familyCounts.set(task.family, (familyCounts.get(task.family) ?? 0) + 1);

    try {
      const actual = evaluateStateMachineTask(task);
      if (actual !== task.answer) {
        fail(`INVALID STATE MACHINE TASK: ${task.id} expected ${task.answer}, evaluated ${actual}`);
      }
    } catch (e) {
      fail(`INVALID STATE MACHINE TASK: ${task.id} could not be evaluated: ${e.message}`);
    }
  }

  for (const family of registeredFamilies) {
    if ((familyCounts.get(family) ?? 0) === 0) {
      fail(`INVALID STATE MACHINE TASKS: registered family ${family} has no static tasks`);
    }
  }
}

verifyStateMachineWorld();

if (failures > 0) {
  console.error(`\n${failures} schema check(s) failed.`);
  process.exit(1);
} else {
  console.log('OK: all schemas present and valid.');
}
