export type { NormalizeConstraints } from '@fresharena/faep-schema';
export type { DiffPatchConstraints } from '@fresharena/faep-schema';
export type { MergeConstraints } from '@fresharena/faep-schema';
export type { SchemaMigrationConstraints } from '@fresharena/faep-schema';
export { normalize } from './normalize.js';
export { diff, apply } from './diff_patch.js';
export { merge } from './merge.js';
export { migrate } from './schema_migration.js';
export {
  verify,
  expectedHashFor,
  type VerifyInput,
  type VerifyResult,
} from './verify.js';
export { sha256Hex, sha256OfString, shortHash, stableStringify } from './crypto.js';

export interface VerifierPackage {
  id: string;
  version: string;
  reference_impl_hash: string;
  property_tests_hash: string;
  metamorphic_tests_hash: string;
  known_good_hash: string;
  known_bad_hash: string;
  environment_hash: string;
}

export const VERIFIER_PACKAGE: Readonly<VerifierPackage> = {
  id: 'json_transform_verifier',
  version: '0.1.0',
  reference_impl_hash: 'phase0-reference',
  property_tests_hash: 'phase0-property',
  metamorphic_tests_hash: 'phase0-metamorphic',
  known_good_hash: 'phase0-known-good',
  known_bad_hash: 'phase0-known-bad',
  environment_hash: 'phase0-env',
};
