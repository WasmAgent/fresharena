import type { GraphConstraints, TreeConstraints } from '@fresharena/faep-schema';

export interface TreeInput {
  values: number[];
}

export interface GraphInput {
  nodes: string[];
  edges: [string, string][];
}

interface TreeNode {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

function asTreeInput(input: unknown): TreeInput {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Tree input must be an object with numeric values');
  }
  const values = (input as { values?: unknown }).values;
  if (!Array.isArray(values) || !values.every((value) => Number.isInteger(value))) {
    throw new Error('Tree input values must be an integer array');
  }
  return { values: values as number[] };
}

function asGraphInput(input: unknown): GraphInput {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Graph input must be an object with nodes and edges');
  }
  const { nodes, edges } = input as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(nodes) || !nodes.every((node) => typeof node === 'string')) {
    throw new Error('Graph input nodes must be a string array');
  }
  if (
    !Array.isArray(edges) ||
    !edges.every(
      (edge) =>
        Array.isArray(edge) &&
        edge.length === 2 &&
        typeof edge[0] === 'string' &&
        typeof edge[1] === 'string',
    )
  ) {
    throw new Error('Graph input edges must be [string, string] tuples');
  }
  return { nodes: nodes as string[], edges: edges as [string, string][] };
}

function insertNode(root: TreeNode | null, value: number): TreeNode {
  if (root === null) return { value, left: null, right: null };
  if (value < root.value) root.left = insertNode(root.left, value);
  if (value > root.value) root.right = insertNode(root.right, value);
  return root;
}

function buildTree(values: number[]): TreeNode | null {
  let root: TreeNode | null = null;
  for (const value of values) {
    root = insertNode(root, value);
  }
  return root;
}

function inorder(root: TreeNode | null, out: number[] = []): number[] {
  if (root === null) return out;
  inorder(root.left, out);
  out.push(root.value);
  inorder(root.right, out);
  return out;
}

function height(root: TreeNode | null): number {
  if (root === null) return 0;
  return 1 + Math.max(height(root.left), height(root.right));
}

function contains(root: TreeNode | null, key: number): boolean {
  let cursor = root;
  while (cursor !== null) {
    if (key === cursor.value) return true;
    cursor = key < cursor.value ? cursor.left : cursor.right;
  }
  return false;
}

function normalizedValues(values: number[]): number[] {
  return inorder(buildTree(values));
}

export function treeInsert(input: unknown, constraints: TreeConstraints): { values: number[] } {
  const key = requiredKey(constraints);
  return { values: normalizedValues([...asTreeInput(input).values, key]) };
}

export function treeDelete(input: unknown, constraints: TreeConstraints): { values: number[] } {
  const key = requiredKey(constraints);
  return { values: normalizedValues(asTreeInput(input).values.filter((value) => value !== key)) };
}

export function treeQuery(
  input: unknown,
  constraints: TreeConstraints,
): { result: boolean | number | number[] } {
  const root = buildTree(asTreeInput(input).values);
  if (constraints.action === 'contains') {
    return { result: contains(root, requiredKey(constraints)) };
  }
  if (constraints.action === 'inorder') {
    return { result: inorder(root) };
  }
  if (constraints.action === 'height') {
    return { result: height(root) };
  }
  throw new Error(`Unsupported tree query action: ${constraints.action}`);
}

function requiredKey(constraints: TreeConstraints): number {
  const key = constraints.key;
  if (typeof key !== 'number' || !Number.isInteger(key)) {
    throw new Error(`${constraints.action} requires an integer key`);
  }
  return key;
}

function adjacency(input: GraphInput, directed: boolean): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const node of input.nodes) graph.set(node, []);
  for (const [from, to] of input.edges) {
    if (!graph.has(from) || !graph.has(to)) {
      throw new Error(`Graph edge references unknown node: ${from}, ${to}`);
    }
    graph.get(from)?.push(to);
    if (!directed) graph.get(to)?.push(from);
  }
  for (const neighbors of graph.values()) neighbors.sort();
  return graph;
}

function shortestPathLength(graph: Map<string, string[]>, source: string, target: string): number {
  if (!graph.has(source) || !graph.has(target)) return -1;
  const queue: Array<[string, number]> = [[source, 0]];
  const seen = new Set<string>([source]);
  for (let index = 0; index < queue.length; index++) {
    const [node, distance] = queue[index];
    if (node === target) return distance;
    for (const next of graph.get(node) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([next, distance + 1]);
      }
    }
  }
  return -1;
}

export function graphQuery(
  input: unknown,
  constraints: GraphConstraints,
): { result: boolean | number } {
  const graphInput = asGraphInput(input);
  if (constraints.query === 'component_count') {
    return { result: componentCount(graphInput) };
  }
  const source = requiredNode(constraints.source, 'source');
  const target = requiredNode(constraints.target, 'target');
  const distance = shortestPathLength(adjacency(graphInput, constraints.directed), source, target);
  if (constraints.query === 'reachable') {
    return { result: distance >= 0 };
  }
  if (constraints.query === 'shortest_path_length') {
    return { result: distance };
  }
  throw new Error(`Unsupported graph query: ${constraints.query}`);
}

function componentCount(input: GraphInput): number {
  const graph = adjacency(input, false);
  const seen = new Set<string>();
  let count = 0;
  for (const start of [...graph.keys()].sort()) {
    if (seen.has(start)) continue;
    count++;
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const node = stack.pop() as string;
      for (const next of graph.get(node) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
  }
  return count;
}

function requiredNode(value: string | undefined, field: string): string {
  if (value === undefined) throw new Error(`Graph ${field} is required for this query`);
  return value;
}
