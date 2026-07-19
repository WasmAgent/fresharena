import type {
  GraphConstraints,
  TaskFamily,
  TaskSpec,
  TreeConstraints,
} from '../../../../packages/faep-schema/src/index.ts';
import { sha256OfString, shortHash } from '../../../../packages/verifier-runtime/src/crypto.ts';
import {
  graphQuery,
  treeDelete,
  treeInsert,
  treeQuery,
} from '../../../../packages/verifier-runtime/src/data_structure.ts';

const VERIFIER_REF = { package: 'data_structure_verifier', version: '0.1.0' };
const DEFAULT_LIMITS = { timeout_ms: 3000, memory_mb: 256, max_source_bytes: 12000 };

class Rng {
  private state: number;

  constructor(seed: string) {
    this.state = 0;
    for (let index = 0; index < seed.length; index++) {
      this.state = ((this.state << 5) - this.state + seed.charCodeAt(index)) | 0;
    }
    this.state = Math.abs(this.state) || 1;
  }

  next(): number {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  bool(): boolean {
    return this.next() < 0.5;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

const TREE_SAMPLES = [
  [5, 2, 8],
  [4, 1, 6, 3],
  [10, 5, 15, 12, 18],
  [7, 3, 9, 1, 5],
  [20, 10, 30, 25, 35],
  [6, 4, 8, 2, 5, 7, 9],
] as const;

const GRAPH_SAMPLES = [
  { nodes: ['a', 'b', 'c', 'd'], edges: [['a', 'b'], ['b', 'c']] },
  { nodes: ['n1', 'n2', 'n3', 'n4', 'n5'], edges: [['n1', 'n2'], ['n2', 'n3'], ['n4', 'n5']] },
  { nodes: ['s', 'a', 'b', 't'], edges: [['s', 'a'], ['a', 't'], ['s', 'b']] },
] as const;

export interface GenerateOptions {
  family: TaskFamily;
  count: number;
  rootSeed: string;
}

export interface GenerateOutput {
  tasks: TaskSpec[];
  seeds: string[];
}

export function generate(opts: GenerateOptions): GenerateOutput {
  const tasks: TaskSpec[] = [];
  const seeds: string[] = [];
  for (let index = 0; index < opts.count; index++) {
    const seed = `${opts.rootSeed}:${index}`;
    tasks.push(generateTask(opts.family, seed, index));
    seeds.push(seed);
  }
  return { tasks, seeds };
}

function generateTask(family: TaskFamily, seed: string, index: number): TaskSpec {
  const rng = new Rng(seed);
  const values = [...rng.pick(TREE_SAMPLES)];
  const graph = rng.pick(GRAPH_SAMPLES);
  const inputGraph = {
    nodes: [...graph.nodes],
    edges: graph.edges.map((edge) => [...edge] as [string, string]),
  };

  if (family === 'data_structure.bst_insert.v0') {
    const constraints: TreeConstraints = { structure: 'bst', action: 'insert', key: rng.int(0, 40) };
    return task(index, seed, family, 'tree_insert', constraints, { values }, treeInsert({ values }, constraints));
  }
  if (family === 'data_structure.bst_delete.v0') {
    const constraints: TreeConstraints = { structure: 'bst', action: 'delete', key: rng.pick(values) };
    return task(index, seed, family, 'tree_delete', constraints, { values }, treeDelete({ values }, constraints));
  }
  if (family === 'data_structure.bst_query.v0') {
    const action = rng.pick(['contains', 'inorder', 'height'] as const);
    const constraints: TreeConstraints =
      action === 'contains'
        ? { structure: 'bst', action, key: rng.pick(values) }
        : { structure: 'bst', action };
    return task(index, seed, family, 'tree_query', constraints, { values }, treeQuery({ values }, constraints));
  }
  if (family === 'data_structure.graph_query.v0') {
    const query = rng.pick(['reachable', 'shortest_path_length', 'component_count'] as const);
    const constraints: GraphConstraints =
      query === 'component_count'
        ? { representation: 'edge_list', query, directed: rng.bool() }
        : {
            representation: 'edge_list',
            query,
            directed: rng.bool(),
            source: inputGraph.nodes[0],
            target: inputGraph.nodes[inputGraph.nodes.length - 1],
          };
    return task(index, seed, family, 'graph_query', constraints, inputGraph, graphQuery(inputGraph, constraints));
  }
  throw new Error(`Unsupported data-structure family: ${family}`);
}

function task(
  index: number,
  seed: string,
  family: TaskFamily,
  operationType: TaskSpec['operation_spec']['type'],
  constraints: Record<string, unknown>,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
): TaskSpec {
  return {
    id: `${family.replace('data_structure.', '').replace('.v0', '')}-${index.toString().padStart(4, '0')}-${shortHash(seed, 8)}`,
    family,
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    operation_spec: { type: operationType, constraints },
    examples: [{ input, output }],
    hidden_tests: { seed_hash: sha256OfString(`${seed}:hidden`), count: 6 },
    verifier: { ...VERIFIER_REF },
    limits: { ...DEFAULT_LIMITS },
  };
}
