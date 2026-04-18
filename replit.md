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
- **AI**: Anthropic integration used for insight translation and screenshot metric extraction, with deterministic fallback recommendations if AI calls fail
- **Core flows**: public landing page, onboarding personality builder, dashboard, manual analytics analysis, screenshot upload analysis, creator matching, and accept/reject feedback loop

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
