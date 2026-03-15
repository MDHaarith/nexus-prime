import { ValidationMetrics, TaskReport, ComparativeMetrics, Task } from '../types/index.js';
import { BaselineMatcher } from './BaselineMatcher.js';
import { CostCalculator } from './CostCalculator.js';
import { QualityScorer } from './QualityScorer.js';

export class ValidationEngine {
  private static instance: ValidationEngine;
  private baselineMatcher: BaselineMatcher;
  private costCalculator: CostCalculator;
  private qualityScorer: QualityScorer;
  
  private aggregateMetrics: ValidationMetrics = {
    cost: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_tokens: 0,
    quality_score: 0,
    latency_ms: 0
  };
  
  private baselineMetrics: ValidationMetrics | null = null;
  private taskCount: number = 0;

  private constructor() {
    this.baselineMatcher = new BaselineMatcher();
    this.costCalculator = new CostCalculator();
    this.qualityScorer = new QualityScorer();
  }

  public static getInstance(): ValidationEngine {
    if (!ValidationEngine.instance) {
      ValidationEngine.instance = new ValidationEngine();
    }
    return ValidationEngine.instance;
  }

  public async initialize(sessionDescription: string): Promise<void> {
    this.baselineMetrics = await this.baselineMatcher.findBaseline(sessionDescription);
  }

  public validateTask(task: Task, report: TaskReport, durationMs: number): { taskMetrics: ValidationMetrics, comparison: ComparativeMetrics } {
    let cost = 0;
    let input_tokens = 0;
    let output_tokens = 0;
    let cache_tokens = 0;

    if (report.token_usage) {
      // Defaulting to gemini-3.1-flash as model is not explicitly provided in Task or TaskReport
      cost = this.costCalculator.calculate(report.token_usage, 'gemini-3.1-flash');
      input_tokens = report.token_usage.input || 0;
      output_tokens = report.token_usage.output || 0;
      cache_tokens = report.token_usage.cached || 0;
    }

    const quality_score = this.qualityScorer.score(report);

    const taskMetrics: ValidationMetrics = {
      cost,
      input_tokens,
      output_tokens,
      cache_tokens,
      quality_score,
      latency_ms: durationMs
    };

    // Update aggregates
    this.aggregateMetrics.cost += cost;
    this.aggregateMetrics.input_tokens += input_tokens;
    this.aggregateMetrics.output_tokens += output_tokens;
    this.aggregateMetrics.cache_tokens += cache_tokens;
    this.aggregateMetrics.latency_ms += durationMs;
    
    this.taskCount++;
    // Running average for quality score
    this.aggregateMetrics.quality_score = 
      ((this.aggregateMetrics.quality_score * (this.taskCount - 1)) + quality_score) / this.taskCount;

    return {
      taskMetrics,
      comparison: this.getComparison()
    };
  }

  public getComparison(): ComparativeMetrics {
    const deltas = {
      cost: 0,
      usage: 0,
      quality: 0
    };

    if (this.baselineMetrics) {
      deltas.cost = this.calculateDelta(this.aggregateMetrics.cost, this.baselineMetrics.cost);
      
      const currentUsage = this.aggregateMetrics.input_tokens + this.aggregateMetrics.output_tokens;
      const baselineUsage = this.baselineMetrics.input_tokens + this.baselineMetrics.output_tokens;
      deltas.usage = this.calculateDelta(currentUsage, baselineUsage);
      
      deltas.quality = this.calculateDelta(this.aggregateMetrics.quality_score, this.baselineMetrics.quality_score);
    }

    return {
      current: { ...this.aggregateMetrics },
      baseline: this.baselineMetrics ? { ...this.baselineMetrics } : undefined,
      deltas
    };
  }

  private calculateDelta(current: number, baseline: number): number {
    if (baseline === 0) return 0;
    return ((current - baseline) / baseline) * 100;
  }
}
