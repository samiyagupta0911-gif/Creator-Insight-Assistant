# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## CreatorIQ

CreatorIQ is a full-stack AI analytics translator for Instagram creators.

- **Frontend artifact**: `artifacts/creatoriq`, served at `/`
- **Backend artifact**: `artifacts/api-server`, served at `/api`
- **Database tables**: `creator_profiles`, `creator_analyses`, `creator_suggestions`, plus AI conversation tables from the Anthropic integration template
- **Auth**: Clerk-based sign-in/sign-up with branded pages and user-scoped data, with a demo fallback for unsigned API calls
- **AI**: Anthropic integration used for screenshot metric extraction and confirmed analytics translation
- **Analytics pipeline**: strict forward-only flow: Input → optional screenshot extraction → Metric Review → confirmed data → AI Insight → Action Plan → saved memory
- **Metric review gate**: frontend requires users to confirm or edit metrics before AI analysis, and the backend rejects unconfirmed analysis requests with `metric_review_required`
- **Clarification gate**: screenshot extraction returns targeted missing-metric questions instead of inferred defaults; incomplete metrics do not run AI analysis
- **Action plan format**: completed analyses end with exactly three action items, each represented as WHAT (`title`), WHY (`rationale`), HOW (`action`), and WHEN (`actionWhen`)
- **Duplicate prevention**: identical confirmed metric submissions return the cached existing analysis instead of re-running AI
- **Memory persistence**: confirmed metrics, insights, action plans, and accepted/rejected feedback are persisted and used as context for later analysis
- **Core flows**: public landing page, onboarding personality builder, dashboard, manual metric review, screenshot metric extraction/review, terminal analysis detail, creator matching, and accept/reject feedback loop

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
