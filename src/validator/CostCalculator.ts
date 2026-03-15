import * as fs from 'fs';
import * as path from 'path';
import { TokenUsage } from '../types/index.js';

interface Rate {
  input: number;
  output: number;
}

type RateRegistry = Record<string, Rate>;

export class CostCalculator {
  private registryPath: string;
  private rates: RateRegistry | null = null;

  constructor(registryPath: string = path.join(process.cwd(), '.nexus', 'config', 'RateRegistry.json')) {
    this.registryPath = registryPath;
  }

  private loadRates(): RateRegistry {
    if (this.rates) {
      return this.rates;
    }
    try {
      if (fs.existsSync(this.registryPath)) {
        const data = fs.readFileSync(this.registryPath, 'utf-8');
        this.rates = JSON.parse(data) as RateRegistry;
        return this.rates;
      }
    } catch (error) {
      console.warn(`Failed to load RateRegistry from ${this.registryPath}:`, error);
    }
    // Fallback rates if file not found or unparseable
    return {
      "gemini-3.1-pro-preview": { "input": 1.25, "output": 3.75 },
      "gemini-3.1-flash": { "input": 0.075, "output": 0.30 },
      "gemini-2.5-flash-lite": { "input": 0.075, "output": 0.30 }
    };
  }

  /**
   * Calculates the cost of token usage based on the model's rates.
   * Rates are assumed to be per 1,000,000 tokens.
   * 
   * @param usage The token usage object containing input and output tokens.
   * @param model The name of the model used.
   * @returns The calculated cost in dollars.
   */
  public calculate(usage: TokenUsage, model: string): number {
    const rates = this.loadRates();
    // Default to a known model if the specified model is not found in the registry
    const modelRates = rates[model] || rates['gemini-3.1-flash'];

    const inputCost = (usage.input / 1_000_000) * modelRates.input;
    const outputCost = (usage.output / 1_000_000) * modelRates.output;
    
    // Cached tokens are not explicitly priced in the registry, so we only calculate based on input and output.
    // If cached tokens need to be priced differently, the RateRegistry and this logic should be updated.

    return inputCost + outputCost;
  }
}
