import { AskUserPayload, UserAnswer, PromptHandler } from '../types/index.js';

export class InteractivityGate {
  private isPaused: boolean = false;
  private promptHandler?: PromptHandler;

  constructor(handler?: PromptHandler) {
    this.promptHandler = handler;
  }

  /**
   * Sets the handler that interfaces with the Ink UI to prompt the user.
   */
  public setPromptHandler(handler: PromptHandler): void {
    this.promptHandler = handler;
  }

  /**
   * Requests user input based on the subagent's `ask_user` tool call.
   * Pauses the execution flow until the user responds via the UI.
   */
  public async requestUserInput(payload: AskUserPayload): Promise<UserAnswer[]> {
    if (this.isPaused) {
      throw new Error("InteractivityGate is already waiting for user input. Concurrent prompts are not allowed.");
    }
    
    if (!this.promptHandler) {
      throw new Error("No UI prompt handler registered in InteractivityGate.");
    }

    this.isPaused = true;
    try {
      // Pause execution and wait for the registered Ink UI handler to resolve the prompt
      const answers = await this.promptHandler(payload);
      return answers;
    } finally {
      this.isPaused = false;
    }
  }

  /**
   * Exposes the current status of the gate (whether it's actively blocking for input).
   */
  public get isAwaitingInput(): boolean {
    return this.isPaused;
  }
}
