# Data Structure World

Closed-semantics task family for tree and graph operations.

| Subtask | Priority | Verification |
|---|---|---|
| `data_structure.bst_insert.v0` | P0 | reference BST insert |
| `data_structure.bst_delete.v0` | P0 | reference BST delete |
| `data_structure.bst_query.v0` | P0 | reference contains, inorder, and height queries |
| `data_structure.graph_query.v0` | P1 | reference BFS and weak component-count queries |

## Encodings

- BST inputs are `{ "values": number[] }`, interpreted as insertion order with duplicate values ignored.
- Insert/delete outputs are `{ "values": number[] }` in sorted in-order form.
- Tree query outputs are `{ "result": boolean | number | number[] }`.
- Graph inputs are `{ "nodes": string[], "edges": [[from, to], ...] }`.
- Directed graph reachability and shortest-path queries follow edge direction. Component count is weakly connected and ignores edge direction.

The public static set contains 52 fixed task specs in `static/tasks.json`.
