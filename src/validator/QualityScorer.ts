import { TaskReport } from '../types/index.js';

export class QualityScorer {
  /**
   * Computes a 1-10 quality index based on heuristic scoring:
   * - Build Success (up to 4pts)
   * - Test Pass Rate (up to 4pts)
   * - Semantic review mock (up to 2pts)
   * 
   * @param report The task report to evaluate.
   * @returns A quality score between 1 and 10.
   */
  public score(report: TaskReport): number {
    let totalScore = 0;

    // 1. Build Success (up to 4pts)
    if (report.status === 'success') {
      totalScore += 4;
    } else if (report.status === 'partial') {
      totalScore += 2;
    } else if (report.status === 'failure') {
      totalScore += 0;
    }

    // 2. Test Pass Rate (up to 4pts)
    // Since we don't have detailed test pass rates, we use validation status and errors as heuristics.
    if (report.validation === 'pass') {
      totalScore += 4;
    } else if (report.validation === 'skipped') {
      totalScore += 2;
    } else if (typeof report.validation === 'object' && report.validation !== null) {
      // If validation is an object (ValidationMetrics), assume it passed some tests
      totalScore += 4;
    } else if (report.validation === 'fail') {
      totalScore += 0;
    } else {
      // If no explicit validation status, infer from errors
      if (report.errors && report.errors.length === 0) {
        totalScore += 3; // Good, but not explicitly validated
      } else if (report.errors && report.errors.length > 0) {
        // Deduct points for errors, minimum 0
        totalScore += Math.max(0, 3 - report.errors.length);
      }
    }

    // 3. Semantic review mock (up to 2pts)
    // Heuristic: Check if objective was achieved and documented
    if (report.objective_achieved && report.objective_achieved.length > 20) {
      totalScore += 2;
    } else if (report.objective_achieved && report.objective_achieved.length > 0) {
      totalScore += 1;
    }

    // Ensure score is strictly between 1 and 10
    return Math.max(1, Math.min(10, totalScore));
  }
}
