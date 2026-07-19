import { expect, test } from 'bun:test';
import { graphQuery, treeDelete, treeInsert, treeQuery, verify } from './index.js';

test('BST insert and delete return normalized in-order unique values', () => {
  expect(
    treeInsert({ values: [5, 2, 8, 2, 7] }, { structure: 'bst', action: 'insert', key: 6 }),
  ).toEqual({ values: [2, 5, 6, 7, 8] });
  expect(
    treeDelete({ values: [5, 2, 8, 2, 7] }, { structure: 'bst', action: 'delete', key: 2 }),
  ).toEqual({ values: [5, 7, 8] });
});

test('BST query supports contains, inorder, and insertion-order height', () => {
  const input = { values: [5, 2, 8, 1, 3, 7, 9] };
  expect(treeQuery(input, { structure: 'bst', action: 'contains', key: 7 })).toEqual({
    result: true,
  });
  expect(treeQuery(input, { structure: 'bst', action: 'inorder' })).toEqual({
    result: [1, 2, 3, 5, 7, 8, 9],
  });
  expect(treeQuery({ values: [1, 2, 3, 4] }, { structure: 'bst', action: 'height' })).toEqual({
    result: 4,
  });
});

test('graph query supports reachability, shortest path length, and weak component count', () => {
  const input = {
    nodes: ['a', 'b', 'c', 'd'],
    edges: [
      ['a', 'b'],
      ['b', 'c'],
    ] as [string, string][],
  };
  expect(
    graphQuery(input, {
      representation: 'edge_list',
      query: 'reachable',
      directed: true,
      source: 'a',
      target: 'c',
    }),
  ).toEqual({ result: true });
  expect(
    graphQuery(input, {
      representation: 'edge_list',
      query: 'shortest_path_length',
      directed: false,
      source: 'c',
      target: 'a',
    }),
  ).toEqual({ result: 2 });
  expect(
    graphQuery(input, {
      representation: 'edge_list',
      query: 'component_count',
      directed: true,
    }),
  ).toEqual({ result: 2 });
});

test('verify dispatches Data Structure World operations by explicit operation type', () => {
  const result = verify({
    taskId: 'data_structure.bst_query.v0|sample',
    input: { values: [4, 1, 6] },
    output: { result: true },
    constraints: { structure: 'bst', action: 'contains', key: 6 },
    operationType: 'tree_query',
  });
  expect(result.passed).toBe(true);
});
