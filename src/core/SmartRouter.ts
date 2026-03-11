import { Task } from '../types/index.js';
import { Logger } from './Logger.js';
import { execSync } from 'child_process';

export enum ModelTier {
  FLASH = 'gemini-3.1-flash',
  PRO = 'gemini-3.1-pro-preview'
}

export class SmartRouter {
  private static readonly PRO_KEYWORDS = [
    'design', 'architect', 'security', 'complex', 'refactor', 'strategy', 'evaluate'
  ];
  private logger = Logger.getInstance();
  private classificationCache: Map<string, ModelTier> = new Map();

  /**
   * Determines the appropriate model tier for a given task.
   * Routes to Pro for complex/architectural tasks, otherwise defaults to Flash.
   */
  public routeTask(task: Task): ModelTier {
    const startTime = Date.now();
    
    // Check explicit metadata if available (O(1))
    if (task.input?.requiresPro) {
      this.logger.info(`Routing task ${task.id} to Pro (explicit metadata)`, { taskId: task.id });
      return ModelTier.PRO;
    }

    // Check agent type (O(1))
    const proAgents = ['architect', 'security_auditor', 'nexus_prime'];
    if (proAgents.includes(task.agent)) {
      this.logger.info(`Routing task ${task.id} to Pro (agent: ${task.agent})`, { taskId: task.id });
      return ModelTier.PRO;
    }

    // Check cache
    const cacheKey = `${task.agent}:${task.name}:${task.description}`;
    if (this.classificationCache.has(cacheKey)) {
        return this.classificationCache.get(cacheKey)!;
    }

    // LLM-based classification (Gemini Flash)
    const tier = this.classifyWithFlash(task);
    
    this.classificationCache.set(cacheKey, tier);
    this.logger.metric('routing_latency', Date.now() - startTime, { taskId: task.id, tier });
    
    return tier;
  }

  /**
   * Uses Gemini Flash to classify the task complexity.
   */
  private classifyWithFlash(task: Task): ModelTier {
    try {
      const prompt = `Classify the following task as either 'FLASH' (standard/simple) or 'PRO' (complex/architectural/security-sensitive).
      
      Task Name: ${task.name}
      Agent: ${task.agent}
      Description: ${task.description}
      
      Response format: Just the word FLASH or PRO.`;

      // Use the gemini CLI to get a classification
      // We use a short timeout and gemini-3.1-flash for speed
      const result = execSync(`gemini --model gemini-3.1-flash -p "${prompt.replace(/"/g, '\\"')}"`, { 
        encoding: 'utf-8',
        timeout: 5000 
      }).trim().toUpperCase();

      if (result.includes('PRO')) {
        this.logger.info(`Routing task ${task.id} to Pro (Gemini Flash classification)`, { taskId: task.id });
        return ModelTier.PRO;
      }
    } catch (error) {
      this.logger.warn(`Gemini Flash classification failed for task ${task.id}. Falling back to keyword logic.`, { 
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Fallback: Keyword-based routing
    const textToAnalyze = `${task.name} ${task.description}`.toLowerCase();
    for (const keyword of SmartRouter.PRO_KEYWORDS) {
      if (textToAnalyze.includes(keyword)) {
        this.logger.info(`Routing task ${task.id} to Pro (Keyword Fallback: ${keyword})`, { taskId: task.id });
        return ModelTier.PRO;
      }
    }

    this.logger.info(`Routing task ${task.id} to Flash (default)`, { taskId: task.id });
    return ModelTier.FLASH;
  }
}
