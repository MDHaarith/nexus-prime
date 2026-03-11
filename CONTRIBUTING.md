# Contributing to Nexus-Enterprise

Thank you for your interest in contributing to Nexus-Enterprise! As a multi-agent system, we follow a strict, deterministic workflow to ensure high-quality, autonomous execution.

## The 12-Phase Workflow

Nexus-Enterprise operates on a deterministic 12-phase workflow, grouped into four high-level stages. Every task must progress through these phases to ensure architectural alignment and code quality.

### Stage 1: Design (The Blueprint)
1.  **Requirements Gathering**: Defining the problem scope and user intent.
2.  **Architectural Design**: Selecting patterns, components, and data flows.
3.  **Convergence**: Finalizing the design document and obtaining user approval.

### Stage 2: Plan (The Strategy)
4.  **Component Analysis**: Breaking down the design into modular components.
5.  **Agent Assignment**: Mapping specialized agents to specific tasks.
6.  **Dependency Mapping**: Defining the execution order and parallelization opportunities.

### Stage 3: Execute (The Implementation)
7.  **Feature Implementation**: Primary coding and logic development.
8.  **Unit & Integration Testing**: Validating individual components and their interactions.
9.  **Refactoring**: Optimizing code for readability, performance, and maintainability.

### Stage 4: Complete (The Quality Gate)
10. **Security Audit**: Reviewing code for vulnerabilities and compliance.
11. **Documentation**: Generating READMEs, API docs, and internal guides.
12. **Final Validation**: Verifying all deliverables against the original requirements.

## Interactivity First Mandate

All agents and contributors must adhere to the **Interactivity First** mandate. If a task is ambiguous or requires a critical decision:
- **Do NOT guess.**
- **Use the `ask_user` tool.**
- Provide clear, multiple-choice options when possible.
- Wait for user confirmation before proceeding.

## Testing Standards

We use **Vitest** for our testing suite. All new features and bug fixes must include comprehensive tests.

- **Unit Tests**: Focus on individual functions and classes in `src/core`.
- **Component Tests**: Validate Ink/React UI components in `src/components`.
- **Coverage**: We aim for 100% test coverage on all core orchestration logic.

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

## Coding Conventions

- **TypeScript**: Use strict typing. Avoid `any`.
- **Immer**: Use immutable state updates for the `TaskStore`.
- **Ink**: Follow React patterns for CLI components.
- **Documentation**: Every new agent or skill must be documented in `docs/AGENTS.md` and include a `SKILL.md`.

## Workflow for Contributors

1.  **Fork the repository** and create a new branch.
2.  **Implement your changes** following the 12-phase workflow.
3.  **Add tests** for your changes.
4.  **Run `npm run type-check`** to ensure type safety.
5.  **Submit a Pull Request** with a detailed description of your changes and the phases they cover.
