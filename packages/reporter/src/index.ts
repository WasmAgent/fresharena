import { mkdir } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScorerResult } from '@fresharena/core/scorer';
import type { FaepRecord } from '@fresharena/faep-schema';

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

function generateHTMLReport(opts: ReportOptions): string {
  const { scores, title = 'FreshArena Evaluation Report' } = opts;

  // Sort solvers by fixed pass rate descending
  const sortedGaps = [...scores.freshGeneralizationGaps].sort(
    (a, b) => b.fixedPassRate - a.fixedPassRate,
  );

  const bars = sortedGaps
    .map((gap, index) => {
      const maxRate = 1.0; // 100%
      const fixedWidth = (gap.fixedPassRate / maxRate) * 100;
      const freshWidth = (gap.freshPassRate / maxRate) * 100;
      const gapWidth = (Math.abs(gap.gap) / maxRate) * 100;

      return `
      <div class="solver-row" style="top: ${index * 60 + 80}px">
        <div class="solver-label" title="${gap.solverId}">${truncateId(gap.solverId)}</div>

        <div class="bar-container">
          <div class="bar-wrapper">
            <div class="bar fixed" style="width: ${fixedWidth}%"
                 title="Fixed Pass Rate: ${(gap.fixedPassRate * 100).toFixed(1)}%">
              <span class="bar-label">${(gap.fixedPassRate * 100).toFixed(1)}%</span>
            </div>
            <div class="bar fresh" style="width: ${freshWidth}%"
                 title="Fresh Pass Rate: ${(gap.freshPassRate * 100).toFixed(1)}%">
              <span class="bar-label">${(gap.freshPassRate * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div class="gap-indicator" style="width: ${gapWidth}%; left: ${Math.min(fixedWidth, freshWidth)}%">
            <span class="gap-label">${gap.gap >= 0 ? '+' : ''}${(gap.gap * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.5;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 30px;
    }

    h1 {
      font-size: 28px;
      color: #333;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e5e5;
    }

    .metric-card {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #4CAF50;
    }

    .metric-card h3 {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .metric-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }

    .chart-container {
      position: relative;
      height: ${sortedGaps.length * 60 + 120}px;
      margin-top: 20px;
    }

    .chart-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
    }

    .legend {
      display: flex;
      gap: 30px;
      margin-bottom: 20px;
      font-size: 13px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }

    .legend-color.fixed {
      background: #4CAF50;
    }

    .legend-color.fresh {
      background: #2196F3;
    }

    .solver-row {
      position: absolute;
      left: 0;
      right: 0;
      height: 50px;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .solver-label {
      width: 150px;
      font-size: 13px;
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .bar-container {
      flex: 1;
      position: relative;
      height: 100%;
    }

    .bar-wrapper {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bar {
      height: 20px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      transition: width 0.3s ease;
      position: relative;
    }

    .bar.fixed {
      background: #4CAF50;
    }

    .bar.fresh {
      background: #2196F3;
    }

    .bar-label {
      position: absolute;
      right: 8px;
      font-size: 11px;
      font-weight: 600;
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      white-space: nowrap;
    }

    .gap-indicator {
      position: absolute;
      top: 0;
      bottom: 0;
      background: rgba(255, 152, 0, 0.15);
      border: 1px dashed #FF9800;
      pointer-events: none;
    }

    .gap-label {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 11px;
      font-weight: 600;
      color: #FF9800;
      background: white;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .tooltip {
      font-size: 12px;
    }

    @media (max-width: 768px) {
      .solver-label {
        width: 100px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="subtitle">Rank Comparison Report: Fixed vs Fresh Tasks</div>

    <div class="summary">
      <div class="metric-card">
        <h3>Rank Instability</h3>
        <div class="value">${(scores.rankInstability * 100).toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <h3>Adversarial Fragility</h3>
        <div class="value">${(scores.adversarialFragility * 100).toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <h3>Generative Power</h3>
        <div class="value">${scores.generatorDiscriminativePower.toFixed(2)}</div>
      </div>
      <div class="metric-card">
        <h3>Replay Reliability</h3>
        <div class="value">${(scores.replayReliability * 100).toFixed(1)}%</div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-title">Pass Rate Comparison by Solver</div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color fixed"></div>
          <span>Fixed Tasks (Public Benchmark)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color fresh"></div>
          <span>Fresh Tasks (Generated)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: rgba(255, 152, 0, 0.15); border: 1px dashed #FF9800;"></div>
          <span>Generalization Gap</span>
        </div>
      </div>
      ${bars}
    </div>
  </div>
</body>
</html>`;
}

function truncateId(id: string): string {
  if (id.length <= 20) return id;
  return `${id.substring(0, 17)}...`;
}

export async function generateReport(opts: ReportOptions): Promise<ReportResult> {
  // Ensure output directory exists
  await mkdir(opts.outputDir, { recursive: true });

  const htmlContent = generateHTMLReport(opts);
  const jsonContent = JSON.stringify(opts.scores, null, 2);

  const htmlPath = join(opts.outputDir, 'report.html');
  const jsonPath = join(opts.outputDir, 'scores.json');

  await writeFile(htmlPath, htmlContent, 'utf-8');
  await writeFile(jsonPath, jsonContent, 'utf-8');

  return { htmlPath, jsonPath };
}
