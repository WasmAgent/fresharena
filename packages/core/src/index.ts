export type { EvalRunOptions, EvalRunResult } from './runner/index.js';
export type { ScorerResult, FreshGeneralizationGap } from './scorer/index.js';
export type { GeneratorPlugin, GeneratorOutput } from './generator/index.js';
export type { TesterPlugin, TesterOutput } from './tester/index.js';
export type { ReplayOptions, ReplayResult } from './replay/index.js';

// Re-export trust infrastructure integration types from @fresharena/faep-schema
export type {
  AgentBOM,
  AgentBOMComponent,
  TrustAttestation,
  TrustPassport,
  MCPPosture,
  MCPPostureCapability,
  TrustIntegrationExport,
  AgentTrustInfraSDK,
} from '@fresharena/faep-schema';
export {
  faepRecordToAgentBOM,
  createTrustPassportForRecord,
  createMCPPostureForSolver,
} from '@fresharena/faep-schema';
