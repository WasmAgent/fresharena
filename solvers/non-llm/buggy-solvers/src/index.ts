// Buggy solver A: drops nested keys beyond depth 1
export async function solveA(input: unknown): Promise<unknown> {
  if (typeof input !== 'object' || input === null) return input;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === 'object' ? {} : v,
    ]),
  );
}

// Buggy solver B: sorts all array values lexicographically (wrong for non-string arrays)
export async function solveB(input: unknown): Promise<unknown> {
  if (Array.isArray(input)) return [...input].sort();
  return input;
}

// Buggy solver C: strips null values (violates round-trip for null-preserving tasks)
export async function solveC(input: unknown): Promise<unknown> {
  if (typeof input !== 'object' || input === null) return input;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(([, v]) => v !== null),
  );
}
