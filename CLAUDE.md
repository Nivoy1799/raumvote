# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js)
npm run build        # Generate Prisma client + build Next.js
npm run lint         # ESLint
npx prisma migrate dev --name <name>   # Create + apply migration
npx prisma generate  # Regenerate Prisma client after schema changes
```

No test framework is configured.

## Architecture

**RaumVote** is a mobile-first voting app where users swipe through binary-choice decision trees. Built with Next.js 16 App Router, React 19, Prisma 7 (PostgreSQL on Neon), and FontAwesome icons.

### Core concept: Sessions & Decision trees

Each **VotingSession** owns a complete decision tree. One session = one tree. Sessions have statuses: `draft` → `active` → `archived`. Only one draft or active session at a time. Archived sessions are read-only (no voting, discovery, or image generation).

Tree nodes are AI-generated binary choices. Users navigate by picking left/right, eventually reaching a leaf option they can vote for. All data (nodes, votes, likes, comments, image tasks) is linked to a session via `sessionId` FK with cascade deletes.

- `lib/tree.types.ts` — `TreeNodeData`, `ActiveTreeMeta` types
- `lib/tree.client.ts` — Client-side tree fetcher (caches in memory)
- `lib/useSession.ts` — `SessionInfo` hook for active session state

### Voter identity (privacy-first)

Access is controlled via pre-created tokens (UUIDs) stored in the `AccessToken` table. An admin creates tokens at `/admin`, which are distributed as QR codes encoding `/login/{token}`. When scanned, the token is saved to `localStorage` as `voterId`. All API routes validate the token via `lib/validateToken.ts`. The `useAuth()` hook (`lib/useAuth.ts`) replaces manual voterId handling on all pages — it checks localStorage and validates against the server, redirecting to `/denied` if invalid. The server never stores raw tokens in vote/like/comment records — all DB records use `voterHash` (SHA-256 of `VOTER_PEPPER:voterId` via `lib/voterHash.ts`).

### Page routes

| Route | Purpose |
|---|---|
| `/login/[token]` | QR code landing — validates token, saves to localStorage, redirects to /start |
| `/denied` | Access denied page — shown when no valid token |
| `/admin` | Token management (password-gated via ADMIN_SECRET) |
| `/start` | Redirects to first tree node |
| `/n/[nodeId]` | Split-screen binary choice (main voting UI) |
| `/o/[optionId]` | Single option detail view |
| `/dream` | Shows user's current voted option |
| `/results` | Leaderboard of vote counts |
| `/me` | Profile: username, avatar |

### API routes (`app/api/`)

All API routes follow the same pattern: validate params → hash voterId → Prisma query → JSON response. Toggle endpoints (like, vote, comment-like) check for existing record and delete/create accordingly.

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/vote` | POST | Upsert vote; re-voting same option unvotes. Params: `{sessionId, optionId, voterId}` |
| `/api/vote/status` | GET | Check user's current vote. Params: `?sessionId=&voterId=` |
| `/api/like` | POST | Toggle like on option. Params: `{sessionId, optionId, voterId}` |
| `/api/like/status` | GET | Check if user liked option. Params: `?sessionId=&optionId=&voterId=` |
| `/api/like/count` | GET | Like count for option. Params: `?sessionId=&optionId=` |
| `/api/comment` | GET, POST | List/create comments. Params: `sessionId, optionId, voterId` |
| `/api/comment/count` | GET | Comment count for option. Params: `?sessionId=&optionId=` |
| `/api/comment/like` | POST | Toggle like on comment |
| `/api/me` | GET, POST | User profile (username, avatarUrl) |
| `/api/results` | GET | Aggregated vote counts. Params: `?sessionId=` |
| `/api/session` | GET | Active session info (rootNodeId, placeholderUrl, discoveryEnabled) |
| `/api/auth/validate` | GET | Check if a token is valid and active |
| `/api/admin/session` | GET, POST, PATCH, DELETE | Session CRUD + tree config (protected by ADMIN_SECRET) |
| `/api/admin/session/media` | POST, DELETE | Reference media upload/remove for session |
| `/api/admin/tokens` | GET, POST, PATCH, DELETE | Token CRUD (protected by ADMIN_SECRET header) |
| `/api/admin/image-tasks` | GET, POST | Image generation task queue. Params: `sessionId` |
| `/api/admin/tree-reset` | POST | Reset tree for a session (delete all nodes, create new root) |

### Shared components

- `ActionRail` — Vertical TikTok-style button column (52px circles) with badge counts. Used on both node and option pages for like/vote/comment/share actions.
- `CommentBottomSheet` — Fixed bottom sheet modal (z-index 201) for viewing/posting comments with avatars and like toggles.
- `GlobalTabbar` — Fixed footer navigation (64px height, z-index 100). All page content must account for this via padding.

### Styling approach

Inline `React.CSSProperties` objects (no CSS modules/styled-components). Styles are typically defined as `const s: Record<string, React.CSSProperties>` at the bottom of each file. Tailwind is imported but rarely used directly.

## Environment variables

- `DATABASE_URL` — Neon pooled connection string
- `DIRECT_URL` — Neon direct connection (for migrations)
- `VOTER_PEPPER` — Secret pepper for voter ID hashing (required, crashes on startup if missing)
- `ADMIN_SECRET` — Secret for admin API/page access (required for /admin)

## Key conventions

- German UI text on user-facing pages (e.g., "Profil", "Speichern", "Deine lokale ID")
- All DB identity uses `voterHash`, never raw `voterId`
- Avatars stored as base64 data URLs in DB (resized to 160x160 client-side, max ~100KB)
- The tab bar is 64px tall — bottom sheets and overlays must account for this
- `e.stopPropagation()` is critical on ActionRail buttons since they're nested inside clickable parent elements
