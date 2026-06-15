## GaugeHow Frontend

GaugeHow is a Next.js frontend prototype for an AI-powered, goal-oriented learning platform.

## Development

```bash
npm run dev
```

## Testing

The frontend uses `Vitest` with `jsdom` and `@testing-library/react`.

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Quality Gates

Run these before merging frontend changes:

```bash
npm run lint
npm run typecheck
npm test
```

## Current Unit Test Coverage Focus

- shared utilities and reusable UI behavior
- auth card mode rendering
- navigation shell state and drawer interactions
- goals, courses, notes, and tests route composition
- dynamic goal detail resolution and missing-slug handling
