import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ScorerResult } from '@fresharena/core/scorer';
import type { FaepRecord, Verdict } from '@fresharena/faep-schema';

export interface ReportOptions {
  records: FaepRecord[];
  scores: ScorerResult;
  outputDir: string;
  title?: string;
}

export interface ReportResult {
  htmlPath: string;
  jsonPath: string;
}

interface SolverStats {
  solverId: string;
  track: string;
  fixed: { total: number; passed: number; passRate: number };
  fresh: { total: number; passed: number; passRate: number };
  freshGeneralizationGap: number;
}

interface ReportData {
  title: string;
  generatedAt: string;
  totalRecords: number;
  solvers: SolverStats[];
  scores: ScorerResult;
}

function isVerdictPass(verdict: Verdict): boolean {
  return verdict === 'pass';
}

function isFreshTask(record: FaepRecord): boolean {
  // Fresh tasks are those generated dynamically with a seed
  // Fixed tasks come from the static set (worlds/json-transform/static/)
  // We identify fresh tasks by checking if the task ID contains a seed pattern
  // or if the generator seed hash is present and non-empty
  return (
    record.generator.seed_hash.length > 0 &&
    // Fixed static tasks typically have simpler IDs without complex seed patterns
    /[a-f0-9]{8,}/i.test(record.task.seed_hash)
  );
}

function computeSolverStats(records: FaepRecord[]): Map<string, SolverStats> {
  const solverMap = new Map<string, SolverStats>();

  // Group records by solver
  const bySolver = new Map<string, FaepRecord[]>();
  for (const record of records) {
    const solverId = record.solver.id;
    const list = bySolver.get(solverId);
    if (list) {
      list.push(record);
    } else {
      bySolver.set(solverId, [record]);
    }
  }

  // Compute stats per solver
  for (const [solverId, solverRecords] of bySolver.entries()) {
    const fixedRecords = solverRecords.filter((r) => !isFreshTask(r));
    const freshRecords = solverRecords.filter((r) => isFreshTask(r));

    const fixedPassed = fixedRecords.filter((r) =>
      isVerdictPass(r.score.canonical_pass ? ('pass' as Verdict) : ('fail' as Verdict)),
    ).length;
    const freshPassed = freshRecords.filter((r) =>
      isVerdictPass(r.score.canonical_pass ? ('pass' as Verdict) : ('fail' as Verdict)),
    ).length;

    const fixedPassRate = fixedRecords.length > 0 ? fixedPassed / fixedRecords.length : 0;
    const freshPassRate = freshRecords.length > 0 ? freshPassed / freshRecords.length : 0;
    const freshGeneralizationGap = fixedPassRate - freshPassRate;

    solverMap.set(solverId, {
      solverId,
      track: solverRecords[0]?.solver.track ?? 'unknown',
      fixed: {
        total: fixedRecords.length,
        passed: fixedPassed,
        passRate: fixedPassRate,
      },
      fresh: {
        total: freshRecords.length,
        passed: freshPassed,
        passRate: freshPassRate,
      },
      freshGeneralizationGap,
    });
  }

  return solverMap;
}

function rankSolversByPassRate(solvers: SolverStats[], type: 'fixed' | 'fresh'): SolverStats[] {
  return [...solvers].sort((a, b) => {
    const aRate = type === 'fixed' ? a.fixed.passRate : a.fresh.passRate;
    const bRate = type === 'fixed' ? b.fixed.passRate : b.fresh.passRate;
    return bRate - aRate; // Descending order
  });
}

function generateHtmlReport(data: ReportData): string {
  const { title, generatedAt, totalRecords, solvers, scores } = data;

  const fixedRanking = rankSolversByPassRate(solvers, 'fixed');
  const freshRanking = rankSolversByPassRate(solvers, 'fresh');

  const maxPassRate = Math.max(
    ...solvers.map((s) => Math.max(s.fixed.passRate, s.fresh.passRate)),
    1, // Ensure at least 1 for scale
  );

  // Generate solver table rows
  const tableRows = solvers
    .map((s) => {
      const fixedRank = fixedRanking.findIndex((r) => r.solverId === s.solverId) + 1;
      const freshRank = freshRanking.findIndex((r) => r.solverId === s.solverId) + 1;
      const rankChange = fixedRank - freshRank; // Positive = improved on fresh, Negative = worsened

      const rankChangeDisplay =
        rankChange === 0
          ? '<span class="rank-same">=</span>'
          : rankChange > 0
            ? `<span class="rank-up">↑${rankChange}</span>`
            : `<span class="rank-down">↓${Math.abs(rankChange)}</span>`;

      return `
        <tr>
          <td><code>${escapeHtml(s.solverId)}</code></td>
          <td>${escapeHtml(s.track)}</td>
          <td>${s.fixed.total}</td>
          <td>${s.fixed.passed}</td>
          <td>
            <div class="bar-container">
              <div class="bar bar-fixed" style="width: ${(s.fixed.passRate / maxPassRate) * 100}%"></div>
              <span class="bar-label">${(s.fixed.passRate * 100).toFixed(1)}%</span>
            </div>
          </td>
          <td>#${fixedRank}</td>
          <td>${s.fresh.total}</td>
          <td>${s.fresh.passed}</td>
          <td>
            <div class="bar-container">
              <div class="bar bar-fresh" style="width: ${(s.fresh.passRate / maxPassRate) * 100}%"></div>
              <span class="bar-label">${(s.fresh.passRate * 100).toFixed(1)}%</span>
            </div>
          </td>
          <td>#${freshRank}</td>
          <td>${rankChangeDisplay}</td>
          <td class="gap ${
            s.freshGeneralizationGap > 0.1
              ? 'gap-high'
              : s.freshGeneralizationGap > 0.05
                ? 'gap-medium'
                : 'gap-low'
          }">
            ${(s.freshGeneralizationGap * 100).toFixed(1)}%
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 {
      font-size: 1.8rem;
      margin-bottom: 10px;
      color: #1a1a1a;
    }
    .meta {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 30px;
    }
    h2 {
      font-size: 1.3rem;
      margin: 30px 0 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e0e0e0;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #4a90d9;
    }
    .metric-label {
      font-size: 0.85rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a1a1a;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 0.9rem;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    tr:hover {
      background: #f8f9fa;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.85rem;
    }
    .bar-container {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
    }
    .bar {
      height: 20px;
      border-radius: 3px;
      min-width: 4px;
      transition: width 0.3s ease;
    }
    .bar-fixed {
      background: linear-gradient(90deg, #4a90d9, #5ba3f0);
    }
    .bar-fresh {
      background: linear-gradient(90deg, #50c878, #6ed891);
    }
    .bar-label {
      font-size: 0.8rem;
      font-weight: 500;
      min-width: 45px;
    }
    .rank-up {
      color: #50c878;
      font-weight: 600;
    }
    .rank-down {
      color: #e74c3c;
      font-weight: 600;
    }
    .rank-same {
      color: #95a5a6;
    }
    .gap {
      font-weight: 600;
    }
    .gap-low {
      color: #50c878;
    }
    .gap-medium {
      color: #f39c12;
    }
    .gap-high {
      color: #e74c3c;
    }
    .legend {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      font-size: 0.85rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }
    .legend-fixed {
      background: linear-gradient(90deg, #4a90d9, #5ba3f0);
    }
    .legend-fresh {
      background: linear-gradient(90deg, #50c878, #6ed891);
    }
    @media (max-width: 1024px) {
      .container {
        padding: 15px;
      }
      table {
        font-size: 0.8rem;
      }
      th, td {
        padding: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      Generated: ${escapeHtml(generatedAt)} | Total Records: ${totalRecords}
    </div>

    <h2>Overall Metrics</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Rank Instability</div>
        <div class="metric-value">${(scores.rankInstability * 100).toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Adversarial Fragility</div>
        <div class="metric-value">${(scores.adversarialFragility * 100).toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Generator Power</div>
        <div class="metric-value">${scores.generatorDiscriminativePower.toFixed(3)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Solvability Band</div>
        <div class="metric-value">
          ${scores.solvabilityBand.min.toFixed(0)}–${scores.solvabilityBand.max.toFixed(0)}%
        </div>
      </div>
    </div>

    <h2>Rank Comparison: Fixed vs Fresh Tasks</h2>
    <div class="legend">
      <div class="legend-item">
        <div class="legend-color legend-fixed"></div>
        <span>Fixed Tasks (Static)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color legend-fresh"></div>
        <span>Fresh Tasks (Generated)</span>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Solver ID</th>
          <th>Track</th>
          <th colspan="4">Fixed Tasks</th>
          <th colspan="4">Fresh Tasks</th>
          <th>Rank Change</th>
          <th>Fresh Gap</th>
        </tr>
        <tr>
          <th></th>
          <th></th>
          <th>Total</th>
          <th>Passed</th>
          <th>Pass Rate</th>
          <th>Rank</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Pass Rate</th>
          <th>Rank</th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <h2>Interpretation</h2>
    <ul style="line-height: 1.8; margin-left: 20px;">
      <li><strong>Fresh Generalization Gap:</strong> The drop in pass rate from fixed to fresh tasks. Higher values indicate potential overfitting or benchmark contamination.</li>
      <li><strong>Rank Change:</strong> How solver rankings shift between fixed and fresh tasks. ↑ means improved on fresh, ↓ means worsened.</li>
      <li><strong>Rank Instability:</strong> Measures how much rankings differ between fixed and fresh tasks. Values near 0 indicate stable rankings; higher values reveal information that fixed benchmarks miss.</li>
      <li><strong>Adversarial Fragility:</strong> Pass rate drop after submit-then-test adversarial testing. Significant drops validate the need for adversarial evaluation.</li>
    </ul>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export async function generateReport(opts: ReportOptions): Promise<ReportResult> {
  const { records, scores, outputDir, title = 'FreshArena Evaluation Report' } = opts;

  // Create output directory if it doesn't exist
  mkdirSync(outputDir, { recursive: true });

  const solverStats = computeSolverStats(records);
  const solvers = Array.from(solverStats.values());

  const data: ReportData = {
    title,
    generatedAt: new Date().toISOString(),
    totalRecords: records.length,
    solvers,
    scores,
  };

  // Write JSON report
  const jsonPath = join(outputDir, 'report.json');
  writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

  // Write HTML report
  const htmlPath = join(outputDir, 'index.html');
  writeFileSync(htmlPath, generateHtmlReport(data), 'utf-8');

  return { htmlPath, jsonPath };
}

export {
  computeSolverStats,
  rankSolversByPassRate,
  isFreshTask,
  type SolverStats,
  type ReportData,
};
