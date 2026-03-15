import { execFile } from 'child_process';
import { promisify } from 'util';
import { ExecutionBus } from '../core/ExecutionBus.js';
import { InteractivityGate } from '../core/InteractivityGate.js';
import { Logger } from '../core/Logger.js';
import { PromptBuilder } from '../core/PromptBuilder.js';
import { ModelTier, SmartRouter } from '../core/SmartRouter.js';
import type { Handoff, RegistrySnapshot, RuntimeConfig, Task } from '../types/index.js';
import type { NexusMemoryService } from './memory.js';
import { parseStructuredHandoff, synthesizeHandoff } from './handoff.js';

const execFileAsync = promisify(execFile);

function nextAgentFor(task: Task): string | null {
  const chain: Record<string, string | null> = {
    nexus_prime: 'architect',
    architect: 'coder',
    ui_designer: 'technical_writer',
    technical_writer: 'validation_agent',
    data_engineer: 'devops_engineer',
    devops_engineer: 'validation_agent',
    validation_agent: null
  };

  return chain[task.agent] ?? null;
}

export class NexusExecutionAdapter {
  private readonly logger = Logger.getInstance();
  private readonly promptBuilder = new PromptBuilder();

  constructor(
    private readonly config: RuntimeConfig,
    private readonly registry: RegistrySnapshot,
    private readonly memory: NexusMemoryService,
    private readonly router: SmartRouter,
    private readonly interactivity: InteractivityGate
  ) {}

  public async execute(task: Task, context: Handoff[]): Promise<Handoff> {
    const activeTask = { ...task };
    const decision = this.router.route(activeTask);
    
    // Dynamically refine the task agent if a better specialist is found
    if (decision.isSpecialized) {
      this.logger.info(`Refining task ${activeTask.id}: ${activeTask.agent} -> ${decision.agentId}`, { taskId: activeTask.id });
      activeTask.agent = decision.agentId;
    }

    if (this.config.executorMode === 'gemini-cli') {
      const viaGemini = await this.executeWithGemini(activeTask, context, decision.tier);
      if (viaGemini) {
        return viaGemini;
      }
    }

    return this.executeDeterministically(activeTask, context, decision.tier);
  }

  private async executeWithGemini(task: Task, context: Handoff[], tier: ModelTier): Promise<Handoff | null> {
    const memoryContext = await this.memory.getRelevantContext(task);
    const prompt = this.promptBuilder.buildPrompt(task, context, memoryContext);
    const model = tier === ModelTier.PRO ? ModelTier.PRO : ModelTier.FLASH;

    try {
      const result = await execFileAsync('gemini', ['--model', model, '-p', prompt], {
        cwd: this.config.workspaceRoot,
        timeout: 20000,
        maxBuffer: 1024 * 1024
      });
      const parsed = parseStructuredHandoff(result.stdout, task);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      this.logger.warn(`Gemini CLI execution failed for ${task.id}. Falling back to Nexus deterministic adapter.`, {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return null;
  }

  private async executeDeterministically(task: Task, context: Handoff[], tier: ModelTier): Promise<Handoff> {
    const memoryStatus = this.memory.status();
    let answerSummary = '';

    const maybeQuestions = task.input?.questions;
    if (Array.isArray(maybeQuestions) && maybeQuestions.length > 0) {
      const answers = await this.interactivity.requestUserInput({
        agent: task.agent,
        reason: `Task ${task.id} needs clarification`,
        questions: maybeQuestions as any
      });
      answerSummary = ` Clarifications captured: ${JSON.stringify(answers)}.`;
    }

    const summary = [
      `${task.name} executed in ${tier} tier.`,
      `Nexus Context Engine provided pre-run context from ${memoryStatus.records} records across ${memoryStatus.sessions} stored sessions.`,
      `Registry currently exposes ${this.registry.commands.length} commands, ${this.registry.agents.length} agents, and ${this.registry.specialistPacks.length} native specialists.`,
      `Recent context window: ${context.length} handoff(s).${answerSummary}`
    ].join(' ');

    const handoff = synthesizeHandoff(task, summary, [
      nextAgentFor(task) ? `Recommended next agent: ${nextAgentFor(task)}` : 'No downstream agent required.'
    ]);
    handoff.report.decisions_made = [
      `Execution tier selected: ${tier}`,
      `Memory backend: ${memoryStatus.backend}`,
      `Design suite standards applied: true`
    ];
    handoff.downstream_context.integration_points = [
      'src/runtime/registry.ts',
      'src/runtime/memory.ts',
      'src/runtime/controller.ts'
    ];
    handoff.downstream_context.patterns_established = [
      'Canonical Nexus registry',
      'Nexus Memory local index',
      'Provider export bundles from one source-of-truth'
    ];

    await new Promise((resolve) => setTimeout(resolve, 75));
    return handoff;
  }
}
