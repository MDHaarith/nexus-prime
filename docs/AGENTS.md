# Nexus-Prime: Agent Directory

Nexus-Prime v4.0 features a swarm of 28 specialized autonomous agents, each a domain expert in a specific area of the software development lifecycle. These agents are orchestrated by `nexus-prime` to complete complex, multi-phase tasks.

## The 28 Specialized Agents

| Agent | Role | Core Expertise |
|-------|------|----------------|
| **nexus-api-designer** | API Architect | OpenAPI/Swagger, REST/GraphQL design, API documentation. |
| **nexus-architect** | System Designer | High-level architecture, component diagrams, design patterns. |
| **nexus-cli-help** | CLI Specialist | Command-line interface design, help text, and usage guides. |
| **nexus-cloud-architect** | Cloud Expert | AWS/GCP/Azure infrastructure, serverless, and containerization. |
| **nexus-codebase-investigator** | Code Analyst | Deep-dive analysis of large codebases, pattern discovery. |
| **nexus-coder** | Lead Developer | Feature implementation, bug fixes, and code optimization. |
| **nexus-copywriter** | Content Creator | Technical writing, marketing copy, and brand voice. |
| **nexus-data-engineer** | Data Architect | ETL pipelines, data modeling, and big data processing. |
| **nexus-database-admin** | DB Specialist | Schema design, query optimization, and migration scripts. |
| **nexus-debugger** | Bug Hunter | Root cause analysis, stack trace debugging, and hotfixing. |
| **nexus-devops-engineer** | CI/CD Expert | GitHub Actions, Jenkins, Docker, and deployment automation. |
| **nexus-evolution-agent** | Self-Improver | System refactoring, tool updates, and autonomous upgrades. |
| **nexus-generalist** | Versatile Assistant | General-purpose tasks, research, and coordination. |
| **nexus-huggingface-skills** | AI Integrator | Hugging Face Transformers, datasets, and model deployment. |
| **nexus-ml-engineer** | ML Specialist | Model training, evaluation, and inference optimization. |
| **nexus-nexus-prime** | Lead Orchestrator | Project management, phase planning, and agent delegation. |
| **nexus-orchestrator-manager** | Logic Architect | Orchestration engine maintenance and strategy updates. |
| **nexus-performance-engineer** | Perf Specialist | Benchmarking, profiling, and latency reduction. |
| **nexus-qa-engineer** | Quality Lead | Test strategy, test case design, and bug reporting. |
| **nexus-refactor** | Debt Reducer | Code cleanup, modularization, and technical debt removal. |
| **nexus-security-auditor** | Security Reviewer | Vulnerability scanning, penetration testing, and audits. |
| **nexus-security-engineer** | Security Builder | Encryption, authentication, and secure coding practices. |
| **nexus-seo-specialist** | SEO Expert | Search engine optimization, metadata, and web performance. |
| **nexus-sre-engineer** | Reliability Lead | Monitoring, alerting, and incident response procedures. |
| **nexus-technical-writer** | Doc Specialist | READMEs, API docs, runbooks, and changelogs. |
| **nexus-tester** | Test Implementer | Unit, integration, and E2E test development (Vitest). |
| **nexus-ui-designer** | UI/UX Designer | Component design, styling, and user experience optimization. |
| **nexus-validation-agent** | Compliance Lead | Final verification, linting, and standard enforcement. |

## Agent Execution Model

Each agent operates within a standardized lifecycle:
1.  **Analyze**: Understand the delegated task and constraints.
2.  **Explore**: Investigate the codebase using specialized tools.
3.  **Plan**: Create a step-by-step execution strategy.
4.  **Execute**: Perform the work (code, docs, tests).
5.  **Validate**: Verify the results against requirements.
6.  **Report**: Provide a structured handoff for the next agent.

## Interactivity First

All agents are mandated to use the `ask_user` tool whenever they encounter ambiguity or need a critical decision. This ensures that the system remains aligned with user intent throughout the execution process.
