import type { SchemaMigrationConstraints } from '@fresharena/faep-schema';
import { parseSchemaMigrationConstraints } from '@fresharena/faep-schema';
import { sha256Hex } from './crypto.js';

/**
 * # json_transform.schema_migration.v0 reference semantics
 *
 * This module provides the single source of truth for schema migration operations.
 * The operation has closed semantics: all transformations are explicitly declared
 * in the field_mappings object.
 *
 * ## Field mapping
 *
 * Each field in the source schema can be:
 * - Mapped to a new field name (target: "new_name")
 * - Removed (target: null)
 * - Given a default value if missing (default: value)
 * - Type-converted (type: "string" | "number" | "boolean" | "keep")
 *
 * ## Type conversions
 *
 * - **string**: Convert value to string (using String constructor)
 * - **number**: Convert value to number (using Number constructor, NaN for failure)
 * - **boolean**: Convert value to boolean (truthy/falsy semantics)
 * - **keep**: Preserve original type
 *
 * ## Core property: round-trip subset
 *
 * For migrations that are reversible (all fields mapped, no data loss),
 * applying the migration then its inverse should return the original value:
 * migrate_inverse(migrate(value)) === value
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Convert a value to the specified type.
 */
function convertType(
  value: unknown,
  targetType: 'string' | 'number' | 'boolean' | 'keep',
): unknown {
  if (targetType === 'keep') {
    return value;
  }

  if (value === null || value === undefined) {
    return value;
  }

  switch (targetType) {
    case 'string':
      return String(value);
    case 'number': {
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }
    case 'boolean':
      return Boolean(value);
    default:
      return value;
  }
}

/**
 * Apply a single field mapping to a value.
 */
function applyFieldMapping(
  value: unknown,
  mapping: {
    target: string | null;
    default?: unknown;
    type: 'string' | 'number' | 'boolean' | 'keep';
  },
): unknown {
  // Handle missing value
  let resolvedValue = value;
  if (value === null || value === undefined) {
    if ('default' in mapping) {
      resolvedValue = mapping.default;
    } else {
      return null;
    }
  }

  // Apply type conversion
  return convertType(resolvedValue, mapping.type);
}

/**
 * Migrate a JSON object from source schema to target schema.
 *
 * @param input - Source JSON object
 * @param rawConstraints - Raw constraints object with field mappings
 * @returns Migrated JSON object
 */
export function migrate(input: unknown, rawConstraints: unknown): unknown {
  const constraints = parseSchemaMigrationConstraints(rawConstraints);

  // Handle non-object inputs
  if (!isPlainObject(input)) {
    return input;
  }

  const result: Record<string, unknown> = {};

  // Process each field in the input
  for (const [sourceKey, value] of Object.entries(input)) {
    const mapping = constraints.field_mappings[sourceKey];

    if (mapping === undefined) {
      // No mapping defined
      if (!constraints.drop_unmapped) {
        result[sourceKey] = value;
      }
      // else: drop the field
    } else if (mapping.target === null) {
    } else {
      // Field should be mapped
      const mappedValue = applyFieldMapping(value, mapping);
      result[mapping.target] = mappedValue;
    }
  }

  // Process fields with default values that weren't in input
  for (const [sourceKey, mapping] of Object.entries(constraints.field_mappings)) {
    if (!(sourceKey in input) && mapping.target !== null && 'default' in mapping) {
      result[mapping.target] = mapping.default;
    }
  }

  return result;
}

/**
 * Hash function for schema migration outputs.
 */
export function hashMigration(input: unknown, constraints: unknown): string {
  const result = migrate(input, constraints);
  return sha256Hex(result);
}
