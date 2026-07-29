export type {
  DiffPatchConstraints,
  MergeConstraints,
  NormalizeConstraints,
  SchemaMigrationConstraints,
} from '@fresharena/faep-schema';
export { sha256Hex, sha256OfString, shortHash, stableStringify } from './crypto.js';
export { apply, diff } from './diff_patch.js';
export { merge } from './merge.js';
export { normalize } from './normalize.js';
export { migrate } from './schema_migration.js';
export {
  expectedHashFor,
  type VerifyInput,
  type VerifyResult,
  verify,
} from './verify.js';

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
