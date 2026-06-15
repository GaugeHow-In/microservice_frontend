# GaugeHow Frontend CI/CD

## Repository Analysis

### Detected stack

- Framework: Next.js 15 App Router
- UI runtime: React 19
- Language: TypeScript 5
- Styling: Tailwind CSS 4
- Linting: ESLint 9 with `eslint-config-next`
- Package manager: `npm` via `package-lock.json`
- Testing framework: none configured
- Formatter: none configured
- Deployment target today: Vercel
- Future deployment target: Cloudflare Pages

### Current project scripts

From `package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`

### Missing tooling analysis

- Type checking did not previously have a dedicated script. `typecheck` was added because CI needs a stable, explicit command.
- No test framework is configured. CI detects that and skips test execution gracefully instead of adding placeholder tests.
- No formatter is configured. No formatting step was added because the repository currently has no formatter dependency or config.

## Workflow Architecture

Validation and deployment are intentionally separated.

### Source of truth

GitHub Actions is the source of truth for build validation.

- `ci.yml` validates the application
- `preview-deploy.yml` handles preview deployments only after CI succeeds
- `production-deploy.yml` handles production deployments only after CI succeeds
- `security.yml` runs dependency and static security checks
- `lighthouse.yml` runs non-blocking performance/accessibility audits

This keeps deployment-provider logic isolated from validation logic.

## Branching Strategy

The expected flow is:

1. Create a branch from `main` using `feature/*`
2. Open a Pull Request
3. `ci.yml` runs lint, typecheck, build, and tests if they exist
4. `preview-deploy.yml` deploys a Vercel preview after CI succeeds
5. `lighthouse.yml` runs on the PR and uploads reports
6. Merge into `main`
7. `ci.yml` validates the merge commit on `main`
8. `production-deploy.yml` deploys to Vercel production after CI succeeds

## Workflow Files

### `.github/workflows/ci.yml`

Runs on:

- Pull requests affecting the frontend or CI files
- Pushes to `main` affecting the frontend or CI files

Checks:

- dependency installation with npm
- ESLint
- TypeScript type checking
- production build validation
- test execution when a test framework exists

Caching:

- npm cache via `actions/setup-node`
- `node_modules` via `actions/cache`
- `.next/cache` via `actions/cache`

### `.github/workflows/preview-deploy.yml`

Runs on successful completion of `ci.yml` for pull requests.

Behavior:

- checks out the exact commit validated by CI
- pulls Vercel preview configuration
- builds with `vercel build`
- deploys with `vercel deploy --prebuilt`
- writes the preview URL into the workflow summary
- updates the PR with the current preview URL

Important:

- preview deployment is skipped for forked pull requests because GitHub does not safely expose deployment secrets there

### `.github/workflows/production-deploy.yml`

Runs on successful completion of `ci.yml` for pushes to `main`.

Behavior:

- checks out the validated `main` commit
- pulls Vercel production configuration
- builds with `vercel build --prod`
- deploys with `vercel deploy --prebuilt --prod`

### `.github/workflows/security.yml`

Runs on:

- pull requests affecting frontend/security files
- pushes to `main`
- weekly schedule
- manual dispatch

Checks:

- `npm audit --audit-level=high`
- GitHub CodeQL analysis for JavaScript/TypeScript

### `.github/workflows/lighthouse.yml`

Runs on pull requests affecting frontend/devops files.

Behavior:

- builds the app
- starts the built Next.js server
- audits `/`, `/dashboard`, and `/courses`
- uploads Lighthouse artifacts
- warns on missed thresholds without blocking deployment

## Required GitHub Secrets

The deployment workflows require these repository or environment secrets:

| Secret | Purpose |
| --- | --- |
| `VERCEL_TOKEN` | Authenticates the Vercel CLI in GitHub Actions |
| `VERCEL_ORG_ID` | Identifies the Vercel team or personal account |
| `VERCEL_PROJECT_ID` | Identifies the target Vercel project |

No additional GitHub secret is required for PR comments because the built-in `GITHUB_TOKEN` is used.

## Environment Variable Audit

As of the current repository state, the frontend does not reference any runtime application environment variables.
Done

Audit result:

- no `process.env.*` usage in `src`
- no `NEXT_PUBLIC_*` usage in `src`
- no provider-specific runtime env access in application code

### Environment files

| File | Purpose | Current app variables |
| --- | --- | --- |
| `.env.local` | developer-only local overrides | none required today |
| `.env.staging` | preview/staging runtime variables | none required today |
| `.env.production` | production runtime variables | none required today |

These files are currently optional because the application uses static mock data and does not consume runtime env configuration yet.

Deployment secrets such as `VERCEL_TOKEN` are CI secrets, not frontend runtime variables.

## Local Validation Commands

Run the same validation steps locally from the repository root:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

Tests are skipped today because no test framework is configured.

For a local Lighthouse run:

```bash
npm ci
npm run build
npx @lhci/cli@0.13.x autorun --config=./.lighthouserc.json
```

## Rollback Process

### Application rollback

1. Identify the last known good commit on `main`
2. Revert the bad commit or redeploy the previous Vercel deployment
3. Push the revert to `main`
4. Let `ci.yml` validate the revert
5. Let `production-deploy.yml` redeploy production from the reverted commit

### Fast provider-side rollback

If Vercel already has a healthy prior deployment, promote or restore that deployment from Vercel while preparing the Git revert. The Git history should still be corrected so GitHub Actions remains the deployment source of truth.

## Cloudflare Pages Migration Path

The current design deliberately keeps provider logic out of `ci.yml`.

Today:

- GitHub Actions validation
- Vercel-specific preview deploy workflow
- Vercel-specific production deploy workflow

Future Cloudflare migration:

1. Keep `ci.yml` unchanged
2. Replace the Vercel commands inside:
   - `preview-deploy.yml`
   - `production-deploy.yml`
3. Switch to `wrangler pages deploy` or Cloudflare Pages GitHub deployment actions
4. Replace Vercel secrets with Cloudflare credentials

Expected future secret replacements:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`

Because validation and deployment are separate, the migration only touches provider-specific workflows and secrets.

## Assumptions

- The frontend repository root is the deployment root
- Node.js 20 is the correct CI runtime for Next.js 15 and the current dependency set
- Pull request preview deployments are only required for branches within the same repository, not from forks
- Vercel project linkage will be managed through `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`

## Recommended Future Improvements

- Add Vitest or Playwright and wire a real `test` script into CI
- Add Prettier or Biome if formatting enforcement is desired
- Add branch protection requiring `CI`, `Security`, and optionally `Lighthouse`
- Add environment-specific runtime variables once the frontend connects to a real backend
- Add deployment approvals through GitHub environments for production
- Add Sentry release tracking or similar post-deploy observability hooks
