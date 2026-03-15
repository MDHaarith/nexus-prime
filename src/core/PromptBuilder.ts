import { Task, Handoff } from '../types/index.js';

export class PromptBuilder {
  /**
   * Generates a subagent delegation query based on the task and recent handoffs.
   * Enforces the 3-handoff sliding window and the Interactivity First mandate.
   * Uses highly structured, XML-like formats optimized for Gemini Flash.
   * 
   * @param task The task to be executed.
   * @param recentHandoffs The sliding window of recent handoffs (up to 3).
   * @param memoryContext Optional smart memory context retrieved before run.
   * @returns The constructed prompt string.
   */
  public buildPrompt(task: Task, recentHandoffs: Handoff[], memoryContext?: string): string {
    // Ensure we only use the last 3 handoffs as per the requirement
    const contextWindow = recentHandoffs.slice(-3);
    
    let prompt = `<task>\n`;
    prompt += `  <agent>${task.agent}</agent>\n`;
    prompt += `  <name>${task.name}</name>\n`;
    prompt += `  <description>${task.description}</description>\n`;

    if (task.input && Object.keys(task.input).length > 0) {
      prompt += `  <input_parameters>\n${JSON.stringify(task.input, null, 2)}\n  </input_parameters>\n`;
    }
    prompt += `</task>\n\n`;

    if (memoryContext) {
      prompt += `<smart_memory>\n${memoryContext}\n</smart_memory>\n\n`;
    }

    prompt += `<context>\n`;
    if (contextWindow.length > 0) {
      prompt += `  <description>The following are the ${contextWindow.length} most recent agent handoffs. Use this context to understand recent progress and integrate your work accordingly.</description>\n`;
      
      contextWindow.forEach((handoff, index) => {
        prompt += `  <handoff index="${index + 1}" task_id="${handoff.task_id}">\n`;
        prompt += `    <status>${handoff.status}</status>\n`;
        prompt += `    <report>\n${JSON.stringify(handoff.report, null, 2)}\n    </report>\n`;
        if (handoff.downstream_context) {
          prompt += `    <downstream_context>\n${JSON.stringify(handoff.downstream_context, null, 2)}\n    </downstream_context>\n`;
        }
        prompt += `  </handoff>\n`;
      });
    } else {
      prompt += `  <description>No previous handoffs in the current window.</description>\n`;
    }
    prompt += `</context>\n\n`;

    prompt += `<constraints>\n`;
    prompt += `  <interactivity_first_mandate>\n`;
    prompt += `    CRITICAL: You MUST use the \`ask_user\` tool whenever requirements are ambiguous, user preferences are needed, or you reach a critical decision point. Do not guess—ask!\n`;
    prompt += `  </interactivity_first_mandate>\n`;
    prompt += `</constraints>\n\n`;

    prompt += `<handoff_protocol>\n`;
    prompt += `  <instruction>\n`;
    prompt += `    You MUST end your response with the required JSON block wrapped in \`\`\`json fences, detailing status, objective_achieved, files modified, key decisions, and downstream_context.\n`;
    prompt += `  </instruction>\n`;
    prompt += `</handoff_protocol>\n`;

    return prompt;
  }
}
