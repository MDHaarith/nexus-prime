# Responsive Design

## Goals
- Preserve task flow across mobile, tablet, desktop, and constrained contexts.

## Guidelines
- Start from the smallest meaningful layout and expand.
- Reprioritize content instead of shrinking everything.
- Use container-aware composition where components need local adaptability.
- Test text overflow, variable data, and dense states at narrow widths.

## Avoid
- Desktop navigation patterns forced onto touch screens.
- Hover-only affordances for critical flows.
- Breakpoint logic that assumes one device size per category.
