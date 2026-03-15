# Motion Design

## Goals
- Use motion to explain state changes, draw attention, and reduce abruptness.

## Guidelines
- Animate opacity and transform first.
- Use stagger and easing to express hierarchy, not spectacle.
- Respect `prefers-reduced-motion`.
- Match timing to interaction weight: micro interactions should resolve quickly.

## Avoid
- Bounce or elastic easing for serious product UI.
- Long motion that blocks task completion.
- Animating layout in a way that causes jank or reflow.
