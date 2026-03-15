# Nexus-Prime 4.1.0

[![Version](https://img.shields.io/badge/version-4.1.0-blue.svg)](https://github.com/MDHaarith/nexus-prime)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Nexus-Prime 4.1.0 is a native multi-agent orchestration platform. All capabilities are deeply embedded as core features:

- `Nexus Context Engine`: Native tiered context database with recursive retrieval and session compression.
- `Nexus Design Suite`: Native UI orchestration with Bold Aesthetic and AI Slop Test protocols.
- `Nexus Specialists`: 120+ first-class specialized agents natively integrated into the core roster.

The runtime is a real 4-phase orchestration flow: `Design -> Plan -> Execute -> Complete`.

## What's New

- **Ambient Memory**: The Nexus Context Engine now performs "smart prerunning" context lookups before every task, injecting relevant history automatically.
- **Unified UI Agent**: The native `@ui_designer` now manages the full Nexus Design Suite via an interactive menu and specialized `--skill` routing.
- **Native Specialist Roster**: All specialized agents (Marketing, Spatial Computing, etc.) are now first-class citizens in the `agents/specialists/` directory.
- **Elite Architecture**: Upgraded core agents for Architecture, Data, DevOps, and Validation with premium, evidence-based protocols.

## Native Subsystems

### Nexus Memory

`Nexus Memory` is the persistence and discovery layer for the runtime. It stores session snapshots, handoff history, indexed commands, indexed skills, and assimilated specialist pack metadata under `.nexus/`.

Public command surface:

- `memory.status`
- `memory.search`
- `memory.sessions`
- `memory.resources`
- `memory.skills`

The public UX stays Nexus-branded. Vendored internals remain in-repo for attribution and deeper future bridging, but they are not exposed as product-facing names.

### Nexus Design Suite

`Nexus Design Suite` replaces the old thin UI prompt with a richer design system and steering workflow.

Included command pack:

- `design.adapt`
- `design.animate`
- `design.audit`
- `design.bolder`
- `design.clarify`
- `design.colorize`
- `design.critique`
- `design.delight`
- `design.distill`
- `design.extract`
- `design.harden`
- `design.normalize`
- `design.onboard`
- `design.optimize`
- `design.polish`
- `design.quieter`
- `design.teach`

The design skill now lives in [`skills/nexus-design-suite/SKILL.md`](skills/nexus-design-suite/SKILL.md) with Nexus-owned reference guides for typography, color, spacing, motion, interaction, responsive behavior, and UX writing.

### Nexus Specialist Packs

`Nexus Specialist Packs` assimilate the broader specialist catalog and expose it through the Nexus registry and export pipeline.

Curated core replacements now upgrade these default roles:

- `architect`
- `data_engineer`
- `database_admin`
- `devops_engineer`
- `ml_engineer`
- `technical_writer`
- `performance_engineer`
- `security_engineer`
- `validation_agent`
- `ui_designer`

The wider catalog remains available through the registry and provider exports without bloating the default scheduler surface.

## Runtime Model

The Nexus runtime now follows four public phases:

1. `Design`
2. `Plan`
3. `Execute`
4. `Complete`

Core runtime pieces:

- `src/runtime/createRuntime.ts`: bootstraps config, registry, persistence, memory, and controller
- `src/runtime/controller.ts`: executes the 4-phase run, handles retries, persists state, and records memory
- `src/runtime/registry.ts`: canonical registry for commands, agents, skills, design suite, and specialist packs
- `src/runtime/memory.ts`: built-in memory index and search
- `src/runtime/exporter.ts`: Nexus-branded provider export bundles

Execution modes:

- Default local mode is deterministic so the runtime can be tested and validated without external dependencies
- Set `NEXUS_EXECUTOR_MODE=gemini-cli` to use the Gemini CLI adapter when `gemini` is installed and on `PATH`

## Install And Run

```bash
npm install
npm run type-check
npm run test
npm run build
```

Optional utilities:

```bash
npm run memory:bootstrap
npm run export:artifacts
```

Environment variables:

- `NEXUS_STATE_DIR`: override `.nexus` storage root
- `NEXUS_EXECUTION_MODE`: `sequential` or `parallel`
- `NEXUS_EXECUTOR_MODE`: `deterministic` or `gemini-cli`
- `NEXUS_EXPORT_TARGETS`: comma-separated provider list
- `NEXUS_MEMORY_BACKEND`: backend label reported by Nexus Memory
- `NEXUS_OBJECTIVE`: runtime objective text

## Testing

Root test coverage now validates:

- runtime config parsing
- canonical registry loading
- structured handoff parsing
- Nexus Memory indexing and search
- provider export bundle generation
- end-to-end 4-phase controller execution with persistence and archiving

Run:

```bash
npm run test
```

## Attribution

Public UX, docs, commands, and config are Nexus-branded in 4.1.0.

Attribution for the assimilated vendored sources lives in [`NOTICES.md`](NOTICES.md).
