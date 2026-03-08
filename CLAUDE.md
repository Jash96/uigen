# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components via chat, Claude generates them using tool calls, and a live preview renders in a sandboxed iframe. Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma + SQLite, and the Vercel AI SDK with Anthropic Claude.

## Commands

```bash
# Setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development (Windows requires cross-env; NODE_OPTIONS syntax in package.json is Unix-only)
npx cross-env NODE_OPTIONS='--require ./node-compat.cjs' next dev --turbopack

# Build & start
npm run build
npm run start

# Lint
npm run lint

# Run all tests
npm run test          # or: npx vitest

# Run a single test file
npx vitest src/lib/__tests__/file-system.test.ts

# Database
npx prisma generate          # regenerate client after schema changes
npx prisma migrate dev       # apply migrations
npm run db:reset              # reset database (destructive)
```

## Architecture

### Data Flow

```
User Chat Input → ChatProvider (useChat) → POST /api/chat → Claude AI (with tools)
  → str_replace_editor / file_manager tool calls → VirtualFileSystem (in-memory)
  → FileSystemProvider (React state) → JSX Transformer (Babel) → iframe Preview
```

### Key Architectural Concepts

- **Virtual File System** (`src/lib/file-system.ts`): In-memory Map-based file store — no disk I/O. Supports create, update, delete, rename, serialize/deserialize. AI interacts with it via tool calls.
- **AI Tool System** (`src/lib/tools/`): Two tools exposed to Claude — `str_replace_editor` (create/view/str_replace/insert files) and `file_manager` (rename/delete). Tool calls are processed by FileSystemProvider to update state.
- **Mock Provider** (`src/lib/provider.ts`): When `ANTHROPIC_API_KEY` is not set, a mock provider generates static code instead of calling Claude. Model used: Claude Haiku 4.5.
- **Live Preview** (`src/components/preview/PreviewFrame.tsx`): Client-side Babel transpilation of JSX, import map pointing to esm.sh CDN, rendered in a sandboxed iframe.
- **Project Persistence**: Messages and VirtualFS data serialized as JSON strings in the `Project` model. Saved on chat completion via the `onFinish` callback in `/api/chat`.

### Route Structure

- `/` — Homepage (auth forms or redirect)
- `/[projectId]` — Main editor page (protected)
- `/api/chat` — Streaming chat endpoint (POST, max 120s duration)

### State Management

Two React context providers drive the app:
- **ChatProvider** (`src/lib/contexts/chat-context.tsx`): Wraps `useChat` from `@ai-sdk/react`, manages messages and chat status.
- **FileSystemProvider** (`src/lib/contexts/file-system-context.tsx`): Manages VirtualFileSystem instance, selected file, and processes AI tool calls.

### Authentication

JWT-based (jose library) with HTTP-only cookies, 7-day expiry. Server actions in `src/actions/` handle signUp/signIn/signOut. Middleware (`src/middleware.ts`) protects API routes. Anonymous users can work without auth; their work is tracked in sessionStorage and migrated on sign-in via `src/lib/anon-work-tracker.ts`.

### Database Schema (Prisma + SQLite)

The database schema is defined in `prisma/schema.prisma`. Always reference it to understand the structure of data stored in the database.

- **User**: id, email, password (bcrypt), projects relation
- **Project**: id, name, userId (optional), messages (JSON string), data (serialized VirtualFS JSON string)

## Testing

Uses Vitest with jsdom environment and @testing-library/react. Tests live in `__tests__/` directories adjacent to their source files. Key test suites cover VirtualFileSystem, context providers, JSX transformer, and chat/editor components.

### Development Best Practices

- Use comments sparingly. Only comment complex code.

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).
