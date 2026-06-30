export interface VerifierPackage {
  id: string;
  version: string;
  referenceImplHash: string;
  propertyTestsHash: string;
  metamorphicTestsHash: string;
  knownGoodHash: string;
  knownBadHash: string;
  environmentHash: string;
}

export interface VerifyInput {
  taskId: string;
  input: unknown;
  output: unknown;
  verifierPackage: VerifierPackage;
}

export interface VerifyResult {
  passed: boolean;
  resultHash: string;
  failureReason?: string;
  testPhase?: 'canonical' | 'hidden' | 'adversarial' | 'immunity';
}

export interface VerifierRuntime {
  verify(input: VerifyInput): Promise<VerifyResult>;
  runPropertyTests(taskId: string, solveFn: (input: unknown) => Promise<unknown>): Promise<VerifyResult[]>;
  runDifferentialTests(
    taskId: string,
    solveFn: (input: unknown) => Promise<unknown>,
    referenceFn: (input: unknown) => Promise<unknown>,
  ): Promise<VerifyResult[]>;
}

export function createVerifierRuntime(_worldDir: string): VerifierRuntime {
  throw new Error('createVerifierRuntime: not yet implemented');
}
