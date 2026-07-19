type Transition = {
  from: string;
  action: string;
  to: string;
};

type Machine = {
  states: string[];
  initial_state: string;
  transitions: Transition[];
};

type Invariant =
  | { forbidden_states: string[] }
  | { allowed_states: string[] }
  | { required_prefix: string; state_labels: Record<string, string[]> }
  | { max_rank: number; state_ranks: Record<string, number> };

type StateMachineTask = {
  family: string;
  answer: boolean;
  spec: Record<string, unknown>;
};

function reachableStates(machine: Machine): Set<string> {
  const seen = new Set<string>([machine.initial_state]);
  const queue = [machine.initial_state];

  for (let i = 0; i < queue.length; i++) {
    const state = queue[i];
    for (const transition of machine.transitions) {
      if (transition.from === state && !seen.has(transition.to)) {
        seen.add(transition.to);
        queue.push(transition.to);
      }
    }
  }

  return seen;
}

export function verifyReachability(spec: Machine & { target_state: string }): boolean {
  return reachableStates(spec).has(spec.target_state);
}

function invariantHolds(state: string, invariant: Invariant): boolean {
  if ('forbidden_states' in invariant) return !invariant.forbidden_states.includes(state);
  if ('allowed_states' in invariant) return invariant.allowed_states.includes(state);
  if ('required_prefix' in invariant) {
    return invariant.state_labels[state]?.includes(invariant.required_prefix) ?? false;
  }
  return (invariant.state_ranks[state] ?? Number.POSITIVE_INFINITY) <= invariant.max_rank;
}

export function verifyInvariant(spec: Machine & { invariant: Invariant }): boolean {
  for (const state of reachableStates(spec)) {
    if (!invariantHolds(state, spec.invariant)) return false;
  }
  return true;
}

function traces(machine: Machine, maxDepth: number): Set<string> {
  const out = new Set<string>(['']);
  let frontier = [{ state: machine.initial_state, trace: '' }];

  for (let depth = 0; depth < maxDepth; depth++) {
    const next: typeof frontier = [];
    for (const item of frontier) {
      for (const transition of machine.transitions) {
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

export function verifyTraceEquivalence(spec: {
  left: Machine;
  right: Machine;
  max_depth: number;
}): boolean {
  const left = traces(spec.left, spec.max_depth);
  const right = traces(spec.right, spec.max_depth);
  if (left.size !== right.size) return false;
  for (const trace of left) {
    if (!right.has(trace)) return false;
  }
  return true;
}

export function evaluateTask(task: StateMachineTask): boolean {
  if (task.family === 'state_machine.reachability.v0') {
    return verifyReachability(task.spec as Machine & { target_state: string });
  }
  if (task.family === 'state_machine.invariant.v0') {
    return verifyInvariant(task.spec as Machine & { invariant: Invariant });
  }
  if (task.family === 'state_machine.trace_equivalence.v0') {
    return verifyTraceEquivalence(task.spec as { left: Machine; right: Machine; max_depth: number });
  }
  throw new Error(`Unsupported state-machine family: ${task.family}`);
}

export function verifyTask(task: StateMachineTask): { pass: boolean; actual: boolean; expected: boolean } {
  const actual = evaluateTask(task);
  return { pass: actual === task.answer, actual, expected: task.answer };
}
