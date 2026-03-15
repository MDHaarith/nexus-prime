import * as fs from 'fs/promises';
import * as path from 'path';
import { ValidationMetrics } from '../types/index.js';

export class BaselineMatcher {
  private archiveDir: string;

  constructor(archiveDir: string = path.join(process.cwd(), '.nexus', 'state', 'archive')) {
    this.archiveDir = archiveDir;
  }

  public async findBaseline(taskDescription: string): Promise<ValidationMetrics | null> {
    try {
      // Check if directory exists
      try {
        await fs.access(this.archiveDir);
      } catch {
        return null; // Directory doesn't exist, no baseline
      }

      const files = await fs.readdir(this.archiveDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(this.archiveDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) continue;

        const frontmatter = frontmatterMatch[1];
        
        // Extract task description
        const taskMatch = frontmatter.match(/^task:\s*(?:"([^"]+)"|'([^']+)'|(.*))$/m);
        if (!taskMatch) continue;
        
        const archivedTask = (taskMatch[1] || taskMatch[2] || taskMatch[3]).trim();

        // Simple similarity or exact match
        if (this.isMatch(taskDescription, archivedTask)) {
          // Extract validation metrics
          const metrics = this.parseValidationMetrics(frontmatter);
          if (metrics) {
            return metrics;
          }
        }
      }
    } catch (error) {
      console.warn(`Error reading archive directory: ${error}`);
    }

    return null;
  }

  private isMatch(currentTask: string, archivedTask: string): boolean {
    const current = currentTask.toLowerCase().trim();
    const archived = archivedTask.toLowerCase().trim();
    
    return current === archived || 
           current.includes(archived) ||
           archived.includes(current);
  }

  private parseValidationMetrics(frontmatter: string): ValidationMetrics | null {
    const lines = frontmatter.split('\n');
    let inValidation = false;
    const metrics: Partial<ValidationMetrics> = {};
    let hasMetrics = false;

    for (const line of lines) {
      if (line.startsWith('validation:')) {
        inValidation = true;
        continue;
      }

      if (inValidation) {
        // If we hit a new top-level key, stop
        if (line.match(/^[a-zA-Z0-9_-]+:/)) {
          break;
        }

        const match = line.match(/^\s+([a-zA-Z0-9_-]+):\s*([\d.]+)/);
        if (match) {
          const key = match[1] as keyof ValidationMetrics;
          const value = parseFloat(match[2]);
          metrics[key] = value;
          hasMetrics = true;
        }
      }
    }

    if (hasMetrics) {
      return {
        cost: metrics.cost || 0,
        input_tokens: metrics.input_tokens || 0,
        output_tokens: metrics.output_tokens || 0,
        cache_tokens: metrics.cache_tokens || 0,
        quality_score: metrics.quality_score || 0,
        latency_ms: metrics.latency_ms || 0
      };
    }

    return null;
  }
}
