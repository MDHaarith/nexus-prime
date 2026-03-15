import { Task, RegistrySnapshot } from '../types/index.js';
import { Logger } from './Logger.js';
import { execSync } from 'child_process';

export enum ModelTier {
  LITE = 'gemini-3.1-flash-lite',
  FLASH = 'gemini-3.1-flash',
  PRO = 'gemini-3.1-pro-preview'
}

export interface RoutingDecision {
  tier: ModelTier;
  agentId: string;
  reason: string;
  isSpecialized: boolean;
}

export class SmartRouter {
  private static readonly CRITICAL_KEYWORDS = [
    'security', 'auth', 'encryption', 'architecture', 'scalability', 'privacy', 'production', 'deploy', 'database', 'schema'
  ];
  
  private static readonly LITE_KEYWORDS = [
    'typo', 'rename', 'format', 'lint', 'comment', 'readme', 'metadata', 'summarize'
  ];

  private logger = Logger.getInstance();
  private decisionCache: Map<string, RoutingDecision> = new Map();
  private readonly enableGeminiClassifier: boolean;

  constructor(
    private readonly registry: RegistrySnapshot,
    enableGeminiClassifier: boolean = process.env.NEXUS_ENABLE_GEMINI_CLASSIFIER === '1'
  ) {
    this.enableGeminiClassifier = enableGeminiClassifier;
  }

  /**
   * Performs an autonomous routing decision, potentially refining the agent and selecting the optimal model tier.
   */
  public route(task: Task): RoutingDecision {
    const startTime = Date.now();
    const cacheKey = `${task.agent}:${task.name}:${task.description}`;

    if (this.decisionCache.has(cacheKey)) {
      return this.decisionCache.get(cacheKey)!;
    }

    // 1. Specialist Refinement (Semantic Match)
    const refinedAgentId = this.refineAgent(task);
    const isSpecialized = refinedAgentId !== task.agent;

    // 2. Tier Selection (FinOps & Quality Aware)
    const tier = this.selectTier(task, refinedAgentId, isSpecialized);

    const decision: RoutingDecision = {
      tier,
      agentId: refinedAgentId,
      reason: isSpecialized 
        ? `Upgraded to specialist ${refinedAgentId} for improved output quality.`
        : `Routed to core agent ${refinedAgentId} with ${tier} tier.`,
      isSpecialized
    };

    this.decisionCache.set(cacheKey, decision);
    this.logger.metric('routing_latency', Date.now() - startTime, { taskId: task.id, tier: decision.tier });
    
    return decision;
  }

  /**
   * Refines the agent selection by searching the native specialist roster.
   */
  private refineAgent(task: Task): string {
    const textToMatch = `${task.name} ${task.description}`.toLowerCase();
    
    // Search for highly specific specialists first
    const candidates = this.registry.agents
      .filter(a => a.source === 'nexus-specialist')
      .map(a => ({
        id: a.id,
        score: this.calculateMatchScore(textToMatch, a.id, a.description, a.capabilities)
      }))
      .filter(c => c.score > 0.7) // Increased threshold for higher precision
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      // If we have multiple candidates with the same score, pick the one that matches more ID tokens
      this.logger.info(`Specialist Match: ${candidates[0].id} (Score: ${candidates[0].score.toFixed(2)})`, { taskId: task.id });
      return candidates[0].id;
    }

    return task.agent;
  }

  private calculateMatchScore(taskText: string, agentId: string, description: string, capabilities: string[]): number {
    const idParts = agentId.replace(/nexus-/, '').split('-');
    const descText = description.toLowerCase();
    
    let score = 0;
    
    // ID Matches (High Weight)
    for (const part of idParts) {
      if (part.length > 3 && taskText.includes(part)) {
        score += 3;
      }
    }
    
    // Capability Matches (Medium Weight)
    for (const cap of capabilities) {
      if (taskText.includes(cap.toLowerCase())) {
        score += 2;
      }
    }
    
    // Description Matches (Low Weight)
    const descTokens = descText.split(/\s+/);
    for (const token of descTokens) {
      if (token.length > 4 && taskText.includes(token)) {
        score += 0.5;
      }
    }

    return score / 5; // Normalized
  }

  /**
   * Selects the optimal model tier based on task criticality and agent specialization.
   */
  private selectTier(task: Task, agentId: string, isSpecialized: boolean): ModelTier {
    const text = `${task.name} ${task.description}`.toLowerCase();

    // PRO Tier: Critical infrastructure, complex architecture, or security
    if (SmartRouter.CRITICAL_KEYWORDS.some(k => text.includes(k)) || task.input?.requiresPro) {
      return ModelTier.PRO;
    }

    // LITE Tier: Trivial maintenance or metadata tasks (only if not specialized to a high-value agent)
    const isTrivial = SmartRouter.LITE_KEYWORDS.some(k => text.includes(k));
    if (isTrivial && !isSpecialized) {
      return ModelTier.LITE;
    }

    // Default to FLASH for standard work
    return ModelTier.FLASH;
  }

  /**
   * Legacy shim for compatibility with older components
   */
  public routeTask(task: Task): ModelTier {
    return this.route(task).tier;
  }
}
